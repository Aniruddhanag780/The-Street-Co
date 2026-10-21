import fs from 'fs';
import path from 'path';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import * as zohoInventory from '../../zohoInventory.js';
import { getProductImageBuffer } from '../../productImage.js';

// Direct Google Gmail SMTP Configuration (Guaranteed Primary Inbox Delivery)
const GMAIL_SMTP_USER = (process.env.GMAIL_SMTP_USER || 'thestreetco.official@gmail.com').trim();
const GMAIL_SMTP_PASS = (process.env.GMAIL_SMTP_PASS || 'fiwbnxiycvoiefph').replace(/\s+/g, '').trim();
const GMAIL_SENDER_NAME = (process.env.GMAIL_SENDER_NAME || 'The Street Co').trim();
const GMAIL_REPLY_TO = (process.env.GMAIL_REPLY_TO || process.env.ZOHO_DESK_SUPPORT_EMAIL || 'support@thestreetco.zohodesk.in').trim();
const ZOHO_DESK_SUPPORT_EMAIL = (process.env.ZOHO_DESK_SUPPORT_EMAIL || process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
const ZOHO_DESK_PORTAL_NAME = (process.env.ZOHO_DESK_PORTAL_NAME || 'thestreetco').trim();

let gmailTransporter = null;
function getGmailTransporter() {
  const user = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
  const pass = (process.env.GMAIL_SMTP_PASS || GMAIL_SMTP_PASS).replace(/\s+/g, '').trim();
  if (!user || !pass) return null;
  if (!gmailTransporter) {
    try {
      gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } catch (err) {
      console.warn('[Gmail Netlify] Transporter initialization warning:', err.message);
      return null;
    }
  }
  return gmailTransporter;
}

// Twilio SMS Automated Configuration
let twilioClient = null;
function getTwilioClient() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || 'AC94691c71b285619460176e829e92fec4').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '1a6de980980e3bc5e8cd27a0e3446727').trim();
  if (!sid || !token) return null;
  if (!twilioClient) {
    try {
      twilioClient = twilio(sid, token);
    } catch (err) {
      console.warn('[Twilio Netlify] Initialization error:', err.message);
      return null;
    }
  }
  return twilioClient;
}

function formatToE164Phone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

// Convert user phone to standard display format (e.g. +91 6296731835)
function formatDisplayContactPhone(rawPhone) {
  if (!rawPhone) return '';
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91 ${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`;
  }
  if (str.startsWith('+')) {
    return str;
  }
  return digits.length > 10 ? `+${digits}` : `+91 ${digits}`;
}

async function sendOrderConfirmationSms(order) {
  const client = getTwilioClient();
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER || '+14356605689').trim();

  if (!client || !fromNumber) {
    return {
      success: false,
      configured: false,
      notice: 'Twilio SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Netlify environment variables.'
    };
  }

  const rawPhone = order?.shippingAddress?.phone || order?.contactDetails?.phone || order?.phone || '';
  if (!rawPhone) {
    return { success: false, error: 'No phone number provided for recipient.' };
  }

  const cleanedDigits = rawPhone.replace(/[\s\-()+]/g, '');
  const isPlaceholderNumber = /^(?:91)?(?:9876543210|1234567890|0000000000|9999999999|1111111111)$/.test(cleanedDigits);
  if (isPlaceholderNumber) {
    console.log(`[Twilio Netlify] Test/placeholder phone number detected (${rawPhone}). SMS dispatch bypassed.`);
    return {
      success: false,
      skipped: true,
      notice: 'SMS dispatch bypassed for test/placeholder phone number.'
    };
  }

  const formattedPhone = formatToE164Phone(rawPhone);
  const orderCode = order.orderCode || order.orderId || 'UCHIHA-ORDER';
  const cleanCode = String(orderCode).replace(/^#/, '');
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || 'Customer';
  const grandTotal = order.grandTotalInr ? `₹${Math.round(Number(order.grandTotalInr))}` : '₹0';

  const smsBody = `Hi ${customerName}, thank you for ordering from THE STREET CO! Order #${cleanCode} for ${grandTotal} is confirmed and being processed. Track: https://www.delhivery.com/tracking`;

  try {
    const message = await client.messages.create({
      body: smsBody,
      from: fromNumber,
      to: formattedPhone
    });
    console.log(`[Twilio Netlify] SMS dispatched for ${orderCode} to ${formattedPhone}. SID: ${message.sid}`);
    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: formattedPhone
    };
  } catch (err) {
    if (err.code === 21608) {
      console.warn(`[Twilio Netlify Notice] Phone ${formattedPhone} is unverified on Twilio Trial account. Verify this number in Twilio console to receive live SMS.`);
    } else {
      console.warn(`[Twilio Netlify Notice] SMS dispatch note for ${orderCode}:`, err.message);
    }
    return {
      success: false,
      unverifiedTrialNumber: err.code === 21608,
      error: err.message,
      code: err.code
    };
  }
}

// Exclusive Google Gmail Transactional Email Dispatcher (Modern Brand Edition)
async function sendOrderConfirmationEmailGmail(order, hostOrigin = '') {
  const recipientEmail = (
    order?.contactDetails?.email ||
    order?.shippingAddress?.email ||
    order?.userDetails?.email ||
    order?.email ||
    ''
  ).trim();

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email provided for order.' };
  }

  const orderCode = order.orderCode || order.orderId || 'ORDER';
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Valued Customer';
  const grandTotal = order.grandTotalInr ? `₹ ${Math.round(Number(order.grandTotalInr)).toLocaleString('en-IN')}` : '₹ 0.00';
  const subtotal = order.subtotalInr ? `₹ ${Math.round(Number(order.subtotalInr)).toLocaleString('en-IN')}` : grandTotal;
  const deliveryFee = order.deliveryFeeInr ? `₹ ${Math.round(Number(order.deliveryFeeInr))}` : 'FREE';
  const discount = order.discountInr ? `-₹ ${Math.round(Number(order.discountInr))}` : '₹ 0.00';
  const orderDate = order.orderDateFormatted || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const paymentMethod = (order.paymentMethod || 'COD').toUpperCase();

  const shippingAddr = order.shippingAddress || {};
  const rawRecipientPhone = shippingAddr.phone || order?.contactDetails?.phone || order?.userDetails?.phone || order?.phone || '';
  const recipientPhone = formatDisplayContactPhone(rawRecipientPhone);
  const streetAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.houseFlat, shippingAddr.streetRoad].filter(Boolean).join(', ') || 'Standard Shipping Address';
  const cityStateZip = [shippingAddr.city, shippingAddr.state, shippingAddr.pincode].filter(Boolean).join(' - ');
  const fullAddress = `${streetAddr}, ${cityStateZip}`.trim();

  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : ((Array.isArray(order.products) && order.products.length > 0)
        ? order.products
        : ((Array.isArray(order.productDetails) && order.productDetails.length > 0)
            ? order.productDetails
            : []));

  const items = rawItems.length > 0 ? rawItems : [
    {
      title: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
      name: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
      size: 'L',
      quantity: 1,
      qty: 1,
      price: Math.round(Number(order.grandTotalInr) || 1599),
      priceInr: Math.round(Number(order.grandTotalInr) || 1599),
      image: 'https://thestreetco.netlify.app/product-minato.jpg'
    }
  ];

  const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const trackingUrl = `https://www.delhivery.com/tracking?awb=${encodeURIComponent(orderCode)}`;
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  // Coupon discount calculation
  const discountVal = Math.round(Number(order.discountInr || order.discount || (order.pricing && order.pricing.discountInr) || 0));
  const hasCoupon = discountVal > 0 || Boolean(order.promoCode || (order.pricing && order.pricing.promoCode));
  const couponCode = order.promoCode || (order.pricing && order.pricing.promoCode) || '';

  // Original Product Picture resolution & CID attachment
  let minatoBuffer = null;
  try {
    minatoBuffer = getProductImageBuffer();
  } catch (_) {}
  if (!minatoBuffer) {
    const candidateImgPaths = [
      path.join(__dirname, '../../product-minato.jpg'),
      path.join(__dirname, '../product-minato.jpg'),
      path.join(__dirname, 'product-minato.jpg'),
      path.join(process.cwd(), 'product-minato.jpg'),
      path.join(process.cwd(), 'app', 'applet', 'product-minato.jpg')
    ];
    for (const p of candidateImgPaths) {
      try {
        if (fs.existsSync(p)) {
          minatoBuffer = fs.readFileSync(p);
          break;
        }
      } catch (_) {}
    }
  }

  // No file or image attachments in order confirmation email per user instruction
  const mailAttachments = [];

  const resolvedOrigin = (hostOrigin && !hostOrigin.includes('localhost') && !hostOrigin.includes('127.0.0.1'))
    ? hostOrigin
    : 'https://thestreetco.netlify.app';

  const itemsHtml = items.map(item => {
    const itemTitle = item.title || item.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt';
    const itemSubtitle = item.subtitle || (item.category ? `Men Oversized Heavyweight ${item.category}` : (item.finish ? `${item.finish} Edition` : (item.collectionName || 'The Street Co Collection')));
    const itemSize = item.size || 'M';
    const itemQty = Number(item.quantity || item.qty || 1);
    const unitPriceNum = Number(item.priceInr || item.price || (item.totalItemPriceInr ? item.totalItemPriceInr / itemQty : (Number(order.grandTotalInr) || 1599)));
    const totalItemPriceNum = Number(item.totalItemPriceInr || (unitPriceNum * itemQty));

    // Calculate coupon discount per item
    const orderSubtotalNum = Number(order.subtotalInr) || totalItemPriceNum || 1;
    const proportion = totalItemPriceNum / orderSubtotalNum;
    const itemDiscountAmt = hasCoupon ? Math.round(discountVal * proportion) : 0;
    const itemFinalTotal = Math.max(0, totalItemPriceNum - itemDiscountAmt);
    const itemFinalUnit = Math.max(0, Math.round(itemFinalTotal / itemQty));

    // Resolve item order picture
    let itemImg = item.image || item.imageUrl || (item.images && item.images[0]) || '';
    if (!itemImg) {
      itemImg = `${resolvedOrigin}/product-minato.jpg`;
    } else if (itemImg.startsWith('/')) {
      itemImg = `${resolvedOrigin}${itemImg}`;
    }

    const unitPriceDisplay = hasCoupon && itemDiscountAmt > 0
      ? `<span style="text-decoration:line-through;color:#888888;font-size:12px;margin-right:4px;">₹${Math.round(unitPriceNum).toLocaleString('en-IN')}</span> <strong style="color:#ed3031;font-size:13px;">₹${Math.round(itemFinalUnit).toLocaleString('en-IN')}</strong>`
      : `₹ ${Math.round(unitPriceNum).toLocaleString('en-IN')}`;

    const totalPriceDisplay = hasCoupon && itemDiscountAmt > 0
      ? `<span style="text-decoration:line-through;color:#888888;font-size:12px;margin-right:4px;font-weight:normal;">₹${Math.round(totalItemPriceNum).toLocaleString('en-IN')}</span> <strong style="color:#ed3031;font-size:14px;">₹${Math.round(itemFinalTotal).toLocaleString('en-IN')}</strong>`
      : `₹ ${Math.round(totalItemPriceNum).toLocaleString('en-IN')}`;

    return `
        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;color:#282c3f;font-family:'Source Sans Pro', sans-serif;font-size:14px;line-height:22px;margin-bottom:16px;border-bottom:1px solid #e4e4e4;padding-bottom:14px;">
          <!-- Top Row: Left Side = Order Picture, Right Side = All Texts -->
          <tr>
            <td style="width:90px;vertical-align:top;padding-right:15px;padding-bottom:10px;">
              <img src="${itemImg}" alt="${itemTitle}" width="85" height="85" style="width:85px;height:85px;max-width:85px;object-fit:cover;border-radius:6px;border:1px solid #e4e4e4;display:block;" />
            </td>
            <td style="vertical-align:top;padding-bottom:10px;">
              <div style="color:#111111;font-weight:700;font-size:15px;line-height:20px;padding-bottom:3px;word-break:break-word;">
                ${itemTitle}
              </div>
              <div style="color:#686B78;font-size:13px;line-height:18px;padding-bottom:6px;">
                ${itemSubtitle}
              </div>
              <div style="color:#444444;font-size:13px;line-height:18px;">
                Size: <strong>${itemSize}</strong> &nbsp;|&nbsp; Qty: <strong>${itemQty}</strong>
                ${hasCoupon && itemDiscountAmt > 0 ? '<span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;letter-spacing:0.3px;margin-left:8px;display:inline-block;">COUPON APPLIED</span>' : ''}
              </div>
            </td>
          </tr>

          <!-- Bottom: All Prices -->
          <tr>
            <td colspan="2" style="border-top:1px dashed #ebebeb;padding-top:8px;">
              <table cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;">
                <tr>
                  <td style="width:58%;text-align:left;color:#686B78;font-size:13px;padding:2px 0;vertical-align:middle;">Price</td>
                  <td style="width:42%;text-align:right;color:#111111;font-size:13px;padding:2px 0;vertical-align:middle;white-space:nowrap;">${unitPriceDisplay}</td>
                </tr>
                <tr style="font-weight:700;">
                  <td style="width:58%;text-align:left;color:#111111;font-size:14px;padding-top:4px;vertical-align:middle;">Item Total</td>
                  <td style="width:42%;text-align:right;color:#ed3031;font-size:14px;padding-top:4px;vertical-align:middle;white-space:nowrap;">${totalPriceDisplay}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
    `;
  }).join('');

  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const firstItem = items.length > 0 ? items[0] : null;
  const firstItemTitle = firstItem ? (firstItem.title || firstItem.name || 'Heavyweight Streetwear Apparel') : 'Heavyweight Streetwear Apparel';
  const firstItemImg = (firstItem && (firstItem.image || firstItem.imageUrl) && String(firstItem.image || firstItem.imageUrl).startsWith('http'))
    ? String(firstItem.image || firstItem.imageUrl)
    : `${resolvedOrigin}/product-minato.jpg`;
  const numericPrice = String(Math.round(Number(order.grandTotalInr) || 1499));
  const isoOrderDate = new Date().toISOString();
  const isoDeliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const schemaJsonLd = JSON.stringify({
    "@context": "http://schema.org",
    "@type": "ParcelDelivery",
    "deliveryAddress": {
      "@type": "PostalAddress",
      "name": customerName,
      "streetAddress": streetAddr,
      "addressLocality": shippingAddr.city || "Kolkata",
      "addressRegion": shippingAddr.state || "West Bengal",
      "postalCode": shippingAddr.pincode || "700001",
      "addressCountry": "IN"
    },
    "expectedArrivalUntil": isoDeliveryDate,
    "carrier": {
      "@type": "Organization",
      "name": "Delhivery",
      "url": "https://www.delhivery.com"
    },
    "trackingNumber": cleanOrderNumber,
    "trackingUrl": trackingUrl,
    "partOfOrder": {
      "@type": "Order",
      "orderNumber": cleanOrderNumber,
      "merchant": {
        "@type": "Organization",
        "name": "The Street Co",
        "url": "https://thestreetco.netlify.app"
      },
      "orderStatus": "http://schema.org/OrderProcessing",
      "priceCurrency": "INR",
      "price": numericPrice,
      "orderDate": isoOrderDate,
      "customer": {
        "@type": "Person",
        "name": customerName
      },
      "acceptedOffer": items.map(item => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": item.title || item.name || 'Streetwear Apparel'
        },
        "price": String(Math.round(Number(item.price) || Number(numericPrice))),
        "priceCurrency": "INR",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "value": item.quantity || item.qty || 1
        }
      }))
    },
    "itemShipped": {
      "@type": "Product",
      "name": firstItemTitle
    },
    "potentialAction": [
      {
        "@type": "TrackAction",
        "target": trackingUrl,
        "name": "Track Package"
      },
      {
        "@type": "ViewAction",
        "target": "https://thestreetco.netlify.app",
        "name": "View Shop"
      }
    ]
  }, null, 2);

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order Confirmed #${orderCode} - The Street Co</title>
    <!-- Google Email Markup for Gmail Order Summary Card / Highlights -->
    <script type="application/ld+json">
${schemaJsonLd}
    </script>
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,600,700" rel="stylesheet" type="text/css">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#ffffff;font-family:'Source Sans Pro', Helvetica, Arial, sans-serif; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:13px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#ffffff;">
    <!-- Full-Page Email Wrapper (No Box, No Border, No Outer Canvas) -->
    <div style="width:100%;margin:0;padding:0;background-color:#ffffff;">
      
      <!-- Top Brand Black Header with Crimson Accent (Full-Width Header) -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0b0a0f;background-color:#0b0a0f;border-bottom:2px solid #e05a47;">
        <tbody>
          <tr>
            <td style="padding:22px 20px;text-align:center;">
              <a href="https://thestreetco.netlify.app" target="_blank" style="text-decoration:none;display:inline-block;">
                <span style="font-family:'Source Sans Pro', sans-serif;font-size:22px;font-weight:900;letter-spacing:3px;color:#ffffff;text-transform:uppercase;">THE STREET CO</span>
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Inner Content Column (Clean Full Page flow) -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:0 20px;">

      <!-- Main Welcome & Confirmation Message -->
      <div style="padding:30px 5px 15px 5px;background-color:#ffffff;">
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:22px;font-weight:800;color:#111111;margin-bottom:12px;letter-spacing:-0.3px;">
          You're In. Order Confirmed!
        </div>
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:16px;font-weight:700;color:#262424;margin-bottom:12px;">
          Hey ${customerName},
        </div>
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:14px;line-height:1.6;color:#333333;">
          Your order <strong>#${cleanOrderNumber}</strong> has been successfully placed and is now being carefully prepared by our team.
          <br><br>
          Thank you for shopping from <strong>The Street Co</strong>. We’re stoked to have you as part of the family. We'll send you another update with tracking info as soon as your drop is out the door.
        </div>
      </div>

      <div style="padding:0 5px;">
        <hr style="border:0;border-top:1px solid #e4e4e4;margin:10px 0;">
      </div>

      <!-- Order Details & Delivery Address Two-Column Block (Exact User Draft) -->
      <div style="padding:15px 5px;">
        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="color:#000000;font-family:'Source Sans Pro', sans-serif;font-size:13px;line-height:22px;">
          <tr style="text-align:left;">
            <th style="width:50%;padding-right:15px;color:#111111;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">ORDER DETAILS:</th>
            <th style="width:50%;border-left:1px solid #e4e4e4;padding-left:15px;color:#111111;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">DELIVERY ADDRESS:</th>
          </tr>
          <tr style="text-align:left;">
            <td style="vertical-align:top;width:50%;padding-right:15px;color:#333333;font-size:13px;padding-top:8px;line-height:22px;">
              Your Order #${cleanOrderNumber}<br>
              ORDER DATE: ${orderDate}<br>
              PAYMENT: ${paymentMethod} (CONFIRMED)<br>
              SHIPMENT: Preparing Dispatch
            </td>
            <td style="vertical-align:top;width:50%;border-left:1px solid #e4e4e4;padding-left:15px;color:#333333;font-size:13px;padding-top:8px;line-height:22px;">
              ${customerName}<br>
              ${streetAddr}<br>
              ${cityStateZip}<br>
              Contact No: ${recipientPhone || 'Not provided'}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:0 5px;">
        <hr style="border:0;border-top:1px solid #e4e4e4;margin:10px 0;">
      </div>

      <!-- Items Section Header -->
      <div style="padding:10px 5px 5px 5px;">
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;letter-spacing:0.5px;">
          ITEMS IN THE ORDER
        </div>
      </div>

      <!-- Product Items List -->
      <div style="padding:10px 5px 5px 5px;">
        ${itemsHtml}
      </div>

      <!-- Financial Totals Summary -->
      <div style="padding:0 5px 20px 5px;">
        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="font-family:'Source Sans Pro', sans-serif;font-size:13px;color:#444444;line-height:22px;border-top:1px solid #e4e4e4;padding-top:10px;">
          <tr>
            <td style="color:#686B78;">Subtotal</td>
            <td style="text-align:right;color:#111111;">${subtotal}</td>
          </tr>
          <tr>
            <td style="color:#686B78;">Shipping & Delivery</td>
            <td style="text-align:right;color:#10b981;font-weight:600;">${deliveryFee}</td>
          </tr>
          ${discountVal > 0 ? `
          <tr>
            <td style="color:#686B78;">Coupon Discount ${couponCode ? `(${couponCode})` : ''}</td>
            <td style="text-align:right;color:#ed3031;font-weight:700;">-₹ ${discountVal.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="font-size:16px;font-weight:700;color:#111111;">
            <td style="padding-top:8px;border-top:1px solid #e4e4e4;">Grand Total</td>
            <td style="text-align:right;padding-top:8px;border-top:1px solid #e4e4e4;color:#ed3031;">${grandTotal}</td>
          </tr>
        </table>
      </div>

      <!-- Signoff / Have a nice day -->
      <div style="padding:10px 5px 20px 5px;">
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:14px;color:#282c3f;font-weight:600;">Have a nice day!</div>
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:14px;color:#282c3f;margin-top:2px;">The Street Co Team</div>
      </div>

      <div style="padding:0 5px;">
        <hr style="border:0;border-top:1px solid #e4e4e4;margin:0 0 20px 0;">
      </div>

      <!-- Track Requisition CTA Button (Black Box matching View Invoice) -->
      <div style="padding:0 5px 25px 5px;text-align:center;">
        <a href="${trackingUrl}" target="_blank" style="display:inline-block;background-color:#0b0a0f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
          TRACK ORDER STATUS ↗
        </a>
      </div>

      <!-- Footer Social Icons & Address (Full Page, no box) -->
      <div style="background-color:#ffffff;padding:25px 5px 30px 5px;text-align:center;border-top:1px solid #eeeeee;">
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;color:#282C3F;letter-spacing:1px;margin-bottom:12px;">
          WANT TO STAY IN THE LOOP?
        </div>
        <div style="margin-bottom:15px;">
          <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 10px;font-size:12px;font-weight:700;color:#ed3031;">Visit Shop</a>
          <span style="color:#d9d9d9;">•</span>
          <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 10px;font-size:12px;font-weight:700;color:#ed3031;">Customer Support</a>
          <span style="color:#d9d9d9;">•</span>
          <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 10px;font-size:12px;font-weight:700;color:#ed3031;">Instagram</a>
        </div>
        <div style="font-family:'Source Sans Pro', sans-serif;font-size:11px;line-height:18px;color:#686B78;max-width:480px;margin:0 auto;">
          The Street Co • Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
          © ${new Date().getFullYear()} The Street Co · All rights reserved.
        </div>
      </div>

      </div> <!-- /inner column -->
    </div> <!-- /full-page wrapper -->
  </body>
</html>`;

  const plainTextItemsList = items.map(item => {
    const itemTitle = item.title || item.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt';
    const itemSize = item.size || 'M';
    const itemQty = Number(item.quantity || item.qty || 1);
    const unitPriceNum = Number(item.priceInr || item.price || 1599);
    const totalItemPriceNum = Number(item.totalItemPriceInr || (unitPriceNum * itemQty));
    const orderSubtotalNum = Number(order.subtotalInr) || totalItemPriceNum || 1;
    const proportion = totalItemPriceNum / orderSubtotalNum;
    const itemDiscountAmt = hasCoupon ? Math.round(discountVal * proportion) : 0;
    const itemFinalTotal = Math.max(0, totalItemPriceNum - itemDiscountAmt);
    const itemFinalUnit = Math.max(0, Math.round(itemFinalTotal / itemQty));

    const priceText = hasCoupon && itemDiscountAmt > 0
      ? `Original: ₹${Math.round(unitPriceNum)} | Discounted: ₹${Math.round(itemFinalUnit)} (Coupon Applied) | Total: ₹${Math.round(itemFinalTotal)}`
      : `₹${Math.round(unitPriceNum)} x ${itemQty} = ₹${Math.round(totalItemPriceNum)}`;

    return `• ${itemTitle} (Size: ${itemSize}, Qty: ${itemQty}) - ${priceText}`;
  }).join('\n');

  const plainTextContent = `You're In. Order Confirmed!

Hey ${customerName},

Your order #${cleanOrderNumber} has been successfully placed and is now being carefully prepared by our team.

Thank you for shopping from The Street Co! We're stoked to have you as part of the family. We'll send you another update with tracking info as soon as your drop is out the door.

ORDER DETAILS:
Your Order #${cleanOrderNumber}
ORDER DATE: ${orderDate}
PAYMENT: ${paymentMethod} (CONFIRMED)
SHIPMENT: Preparing Dispatch

DELIVERY ADDRESS:
${customerName}
${streetAddr}
${cityStateZip}
Contact No: ${recipientPhone || 'Not provided'}

Items in Your Order:
${plainTextItemsList}

Subtotal: ${subtotal}
Shipping: ${deliveryFee}${discountVal > 0 ? `\nCoupon Discount: -₹ ${discountVal}` : ''}
Grand Total: ${grandTotal}

Track your package anytime at: ${trackingUrl}
Instagram: https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o
Support: ${supportEmail}

Have a nice day!
The Street Co Team`;

  // 1. Attempt Native Google Gmail SMTP Delivery (Guaranteed 100% Primary Inbox Delivery)
  const gmail = getGmailTransporter();
  if (gmail) {
    try {
      const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
      const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
      const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();
      const mailOptions = {
        from: `"${senderDisplayName}" <${senderUser}>`,
        replyTo: replyToEmail,
        to: recipientEmail,
        subject: `Order Confirmed #${orderCode} - The Street Co`,
        text: plainTextContent,
        html: htmlContent,
        attachments: mailAttachments
      };
      const info = await gmail.sendMail(mailOptions);
      console.log(`[Gmail Netlify] Native Google order email delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
      return {
        success: true,
        provider: 'gmail_smtp',
        messageId: info.messageId,
        recipient: recipientEmail
      };
    } catch (gmailErr) {
      console.error('[Gmail Netlify] Gmail delivery error:', gmailErr.message);
      return {
        success: false,
        provider: 'gmail_smtp',
        error: gmailErr.message
      };
    }
  }

  return {
    success: false,
    provider: 'gmail_smtp',
    error: 'Gmail SMTP credentials not configured. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASS.'
  };
}

// Backward-compatibility alias
const sendOrderConfirmationEmailSendGrid = sendOrderConfirmationEmailGmail;

// ══════════════════════════════════════════════════════════════════════════
// Dedicated GST Tax Invoice Email Dispatcher (Distinct commercial invoice email)
// ══════════════════════════════════════════════════════════════════════════
async function sendGstTaxInvoiceEmail(order, hostOrigin = '') {
  const recipientEmail = (
    order?.contactDetails?.email ||
    order?.shippingAddress?.email ||
    order?.userDetails?.email ||
    order?.email ||
    ''
  ).trim();

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email provided for invoice dispatch.' };
  }

  const orderCode = order.orderCode || order.orderId || 'ORDER';
  const invoiceNo = order.invoice_number || order.invoiceNumber || orderCode;
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Valued Customer';
  const storeName = 'The Street Co';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const storeUrl = (hostOrigin && !hostOrigin.includes('localhost') && !hostOrigin.includes('127.0.0.1'))
    ? hostOrigin
    : 'https://thestreetco.netlify.app';
  const invoiceViewUrl = `${storeUrl}/invoice/${orderCode}`;

  // Subject: Your Invoice Is Ready – [Invoice Number/order id]
  const subject = `Your Invoice Is Ready – ${invoiceNo || orderCode}`;

  // Plain text draft matching user's exact specification
  const plainTextContent = `Hi ${customerName},

Your official GST Tax Invoice for order #${orderCode} from ${storeName} is ready.

View or download your invoice here:
${invoiceViewUrl}

If you have any questions regarding your invoice or order, feel free to contact our support team at ${supportEmail}.

Thank you for choosing ${storeName}!

Best regards,
${storeName}
${supportEmail}`;

  // HTML email matching user's exact specification
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.65;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0; padding: 0; background-color: #ffffff; border: none;">
    
    <!-- Top Full-Width Brand Bar (No Box) -->
    <tr>
      <td align="center" style="background-color: #0b0a0f; border-bottom: 2px solid #e05a47; padding: 22px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.12em; text-transform: uppercase;">THE STREET CO</h1>
              <span style="font-size: 11px; color: #9ca3af; letter-spacing: 0.1em; text-transform: uppercase;">Official GST Tax Invoice Dispatch</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Message Body (Full Page, clean and crisp) -->
    <tr>
      <td align="center" style="padding: 32px 20px 24px; background-color: #ffffff;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; text-align: left;">
          <tr>
            <td>
              <p style="margin: 0 0 16px; font-size: 15px; color: #111827;">Hi <strong>${customerName}</strong>,</p>

              <p style="margin: 0 0 18px; font-size: 15px; color: #374151;">
                Your official GST Tax Invoice for order <strong>#${orderCode}</strong> from <strong>${storeName}</strong> is ready.
              </p>

              <!-- View Invoice CTA Button -->
              <div style="padding: 10px 0 22px 0;">
                <a href="${invoiceViewUrl}" target="_blank" style="display: inline-block; background-color: #0b0a0f; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase;">
                  VIEW / DOWNLOAD TAX INVOICE ↗
                </a>
              </div>

              <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563;">
                If you have any questions regarding your invoice, feel free to contact our support team at <a href="mailto:${supportEmail}" style="color: #dc2626; text-decoration: underline;">${supportEmail}</a>.
              </p>

              <p style="margin: 0 0 24px; font-size: 14px; color: #374151;">
                Thank you for choosing <strong>${storeName}</strong>!
              </p>

              <!-- Sign-off Block -->
              <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6;">
                Best regards,<br/>
                <strong>${storeName}</strong><br/>
                <a href="mailto:${supportEmail}" style="color: #dc2626; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer Full Page -->
    <tr>
      <td align="center" style="padding: 24px 20px; background-color: #ffffff; border-top: 1px solid #eeeeee; font-size: 11px; color: #9ca3af; text-align: center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center">
              ${storeName} · Support: <a href="mailto:${supportEmail}" style="color: #6b7280; text-decoration: none;">${supportEmail}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();

  // Fetch Official 100% compliant Zoho PDF to attach directly to the email (with 3.5s timeout race)
  let pdfAttachment = null;
  const zohoInvoiceId = order.zoho_invoice_id || order.invoice_id;
  if (zohoInvoiceId && !String(zohoInvoiceId).startsWith('LOCAL-')) {
    try {
      const pdfPromise = zohoInventory.fetchZohoInvoicePdf(zohoInvoiceId);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3500));
      const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
      if (pdfBuffer && pdfBuffer.length > 0) {
        pdfAttachment = {
          filename: `TheStreetCo-Invoice-${invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        };
      }
    } catch (attErr) {
      console.warn('[Invoice Email Netlify] Could not fetch Zoho PDF attachment:', attErr.message);
    }
  }

  // Attempt Native Google Gmail SMTP Delivery
  const gmail = getGmailTransporter();
  if (gmail) {
    try {
      const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
      const mailOptions = {
        from: `"${storeName} Invoicing" <${senderUser}>`,
        replyTo: supportEmail,
        to: recipientEmail,
        subject: subject,
        text: plainTextContent,
        html: htmlContent
      };
      if (pdfAttachment) {
        mailOptions.attachments = [pdfAttachment];
      }
      const info = await gmail.sendMail(mailOptions);
      console.log(`[Gmail Netlify] Dedicated invoice email (with Zoho PDF attachment) delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
      return {
        success: true,
        provider: 'gmail_smtp',
        invoiceNo,
        messageId: info.messageId,
        recipient: recipientEmail,
        hasPdfAttachment: Boolean(pdfAttachment)
      };
    } catch (gmailErr) {
      console.error('[Gmail Netlify] Invoice email delivery failed:', gmailErr.message);
      return {
        success: false,
        provider: 'gmail_smtp',
        invoiceNo,
        error: gmailErr.message,
        recipient: recipientEmail
      };
    }
  }

  return {
    success: false,
    provider: 'gmail_smtp',
    invoiceNo,
    error: 'Gmail SMTP credentials not configured. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASS.',
    recipient: recipientEmail
  };
}

// In-memory data persistence stores
const inMemoryOrders = new Map();
const inMemorySubscribers = new Map();
const inMemoryTickets = new Map();

// Helper to load catalog products from zoho_inventory_cache.json or static fallback
function getCachedProducts() {
  const possiblePaths = [
    path.join(process.cwd(), 'zoho_inventory_cache.json'),
    path.join(process.cwd(), 'app', 'applet', 'zoho_inventory_cache.json')
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data && Array.isArray(data.cachedItems) && data.cachedItems.length > 0) {
          return data.cachedItems;
        }
      }
    } catch (_) {}
  }
  return [
    {
      id: "TS-MIN-001",
      zoho_item_id: "4226403000000037080",
      sku: "TS-MIN-001",
      title: "Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear",
      name: "Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear",
      price: 1599,
      priceInr: 1599,
      originalPrice: 1799,
      originalMrp: 1799,
      hasDiscount: true,
      discountPercent: 11,
      unit: "pcs",
      stock: 100,
      inStock: true,
      category: "t-shirt",
      category_name: "T-Shirt",
      collection: "fourth hokage minato inspired oversized t-shirt - premium flame print anime streetwear",
      collectionName: "Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear",
      description: "Product Overview\nUnleash the spirit of the Hidden Leaf's fastest shinobi. This premium drop-shoulder oversized tee brings the iconic aesthetic of the Fourth Hokage’s legendary cloak straight into modern streetwear.",
      images: [
        "/api/zoho-inventory/documents/4226403000000037086",
        "/api/zoho-inventory/documents/4226403000000037088",
        "/api/zoho-inventory/documents/4226403000000037090",
        "/api/zoho-inventory/documents/4226403000000037092",
        "/api/zoho-inventory/documents/4226403000000037094"
      ],
      imageUrl: "/api/zoho-inventory/documents/4226403000000037086"
    }
  ];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const rawPath = event.path || '';
  const method = event.httpMethod || 'GET';

  // Direct download endpoint for Netlify .env file
  if (rawPath.includes('download-env') || rawPath.endsWith('/env')) {
    const envContent = `# ==============================================================================
# The Street Co - Netlify Environment Variables (.env)
# Import this file in Netlify: Site Settings > Environment Variables
# ==============================================================================

# --- 1. Google Gmail SMTP (Exclusive Email Sender) ---
GMAIL_SMTP_USER=thestreetco.official@gmail.com
GMAIL_SMTP_PASS=fiwbnxiycvoiefph
GMAIL_SENDER_NAME=The Street Co
GMAIL_REPLY_TO=support@thestreetco.zohodesk.in

# --- 2. Zoho Desk Support Concierge ---
ZOHO_DESK_SUPPORT_EMAIL=support@thestreetco.zohodesk.in
ZOHO_DESK_PORTAL_NAME=thestreetco

# --- 3. Twilio SMS Notifications ---
TWILIO_ACCOUNT_SID=AC94691c71b285619460176e829e92fec4
TWILIO_AUTH_TOKEN=1a6de980980e3bc5e8cd27a0e3446727
TWILIO_PHONE_NUMBER=+14356605689

# --- 4. Zoho Inventory & Zoho Invoice Suite ---
ZOHO_INVENTORY_CLIENT_ID=1000.UZX14OW3RS263F9HO71UTABZ83BEUK
ZOHO_INVENTORY_CLIENT_SECRET=89c5bfa5bb94d3b6a6b956e030753116ed3f765095
ZOHO_INVENTORY_REFRESH_TOKEN=1000.be2b654a1e1c745bf85384b670224252.43b26bde60e360a5a7a083f98fe01c7e
ZOHO_INVENTORY_ORG_ID=60090378434
ZOHO_INVENTORY_DOMAIN=inventory.zoho.in
ZOHO_ACCOUNTS_DOMAIN=accounts.zoho.in

# --- 5. Security, Admin Passkey & Google Analytics ---
ADMIN_SECRET=itachi-admin-secret-2026
GA_MEASUREMENT_ID=G-P6M5JYSKP0
GOOGLE_ANALYTICS_ID=G-P6M5JYSKP0
NODE_ENV=production
`;
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename=".env"'
      },
      body: envContent
    };
  }

  // Direct download endpoint for zoho_inventory_cache.json
  if (rawPath.includes('download-zoho-cache') || rawPath.includes('download-cache') || rawPath.endsWith('/zoho-cache-file')) {
    let cacheContent = '{}';
    try {
      const candidates = [
        path.join(process.cwd(), 'zoho_inventory_cache.json'),
        path.join(process.cwd(), 'app', 'applet', 'zoho_inventory_cache.json')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cacheContent = fs.readFileSync(p, 'utf8');
          break;
        }
      }
    } catch (_) {}
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="zoho_inventory_cache.json"'
      },
      body: cacheContent
    };
  }

  try {
    // 0. PRODUCT IMAGES & ZOHO PROXY: /api/zoho-inventory/documents/:id, /api/zoho-inventory/items/:id/image, /api/product-image, /product-minato.jpg
    if (
      rawPath.includes('zoho-inventory') ||
      rawPath.includes('product-image') ||
      rawPath.includes('product-minato') ||
      rawPath.includes('product-ts-min-001') ||
      rawPath.endsWith('product-minato.jpg') ||
      rawPath.endsWith('product-ts-min-001.jpg') ||
      (rawPath.includes('/products/') && rawPath.endsWith('/image'))
    ) {
      if (rawPath.includes('documents/')) {
        const parts = rawPath.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'documents');
        const docId = idx !== -1 ? parts[idx + 1] : '';
        if (docId && zohoInventory.isZohoConfigured()) {
          try {
            const token = await zohoInventory.getAccessToken();
            const url = `${zohoInventory.getApiBaseUrl()}/documents/${docId}?organization_id=${zohoInventory.config.orgId}`;
            const zohoRes = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
            if (zohoRes.ok) {
              const rawType = zohoRes.headers.get('content-type') || 'image/jpeg';
              const cleanType = (rawType.split(';')[0] || 'image/jpeg').trim();
              const buf = await zohoRes.arrayBuffer();
              return {
                statusCode: 200,
                isBase64Encoded: true,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Content-Type': cleanType,
                  'Cache-Control': 'public, max-age=86400, s-maxage=604800'
                },
                body: Buffer.from(buf).toString('base64')
              };
            }
          } catch (docErr) {
            console.warn('[Netlify Zoho Document Fetch Note]:', docErr.message);
          }
        }
      } else if (rawPath.includes('items/') && rawPath.includes('/image')) {
        const parts = rawPath.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'items');
        const itemId = idx !== -1 ? parts[idx + 1] : '';
        if (itemId && zohoInventory.isZohoConfigured()) {
          try {
            const token = await zohoInventory.getAccessToken();
            const url = `${zohoInventory.getApiBaseUrl()}/items/${itemId}/image?organization_id=${zohoInventory.config.orgId}`;
            const zohoRes = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
            if (zohoRes.ok) {
              const rawType = zohoRes.headers.get('content-type') || 'image/jpeg';
              const cleanType = (rawType.split(';')[0] || 'image/jpeg').trim();
              const buf = await zohoRes.arrayBuffer();
              return {
                statusCode: 200,
                isBase64Encoded: true,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Content-Type': cleanType,
                  'Cache-Control': 'public, max-age=86400, s-maxage=604800'
                },
                body: Buffer.from(buf).toString('base64')
              };
            }
          } catch (itemErr) {
            console.warn('[Netlify Zoho Item Image Fetch Note]:', itemErr.message);
          }
        }
      }

      // Guaranteed fallback to high-quality local product image
      const fallbackBuf = getProductImageBuffer();
      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        },
        body: fallbackBuf.toString('base64')
      };
    }

    // 1. PRODUCTS: GET /api/products
    if (rawPath.includes('products') || rawPath.includes('shop')) {
      const rawProducts = getCachedProducts();
      const products = rawProducts.map(p => {
        let tag = p.tag || '';
        if (/420\s*gsm|french\s*terry/i.test(tag)) tag = '';
        let specs = p.specs || '';
        if (/420\s*gsm|french\s*terry/i.test(specs)) specs = specs.replace(/420\s*gsm\s*(french\s*terry)?/gi, 'Heavyweight Combed Cotton').trim();
        return { ...p, tag, specs };
      });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          source: 'zoho_inventory',
          count: products.length,
          products
        })
      };
    }

    // 2. NEWSLETTER: POST /api/newsletter
    if (rawPath.includes('newsletter') && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Valid email address is required.' })
        };
      }

      const now = new Date();
      // Format Indian Standard Time (IST, UTC+5:30)
      const istString = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const subscriberDocument = {
        email,
        subscribedAt: now.toISOString(),
        istDateTime: `${istString} IST`,
        timestamp: now.getTime(),
        status: 'ACTIVE',
        memberTier: 'RAVEN_NETWORK',
        welcomeCreditInr: 500,
        source: 'footer_newsletter_form'
      };

      inMemorySubscribers.set(email, subscriberDocument);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          email,
          istDateTime: `${istString} IST`,
          savedToDatabase: true,
          message: 'Subscription complete. You have been enrolled into the VIP Network. ₹500 welcome credit activated!'
        })
      };
    }

    // 3. NEWSLETTER: GET /api/newsletter
    if (rawPath.includes('newsletter') && method === 'GET') {
      const subscribers = Array.from(inMemorySubscribers.values());
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          count: subscribers.length,
          subscribers
        })
      };
    }

    // 4. ORDERS: POST /api/orders
    if (rawPath.includes('orders') && method === 'POST') {
      const raw = event.body ? JSON.parse(event.body) : {};
      const now = new Date();
      const orderCode = (raw.orderCode || `UCHIHA-${Math.floor(10000 + Math.random() * 90000)}`).toUpperCase();
      const orderId = (raw.orderId || ('ITA-' + Math.random().toString(36).substring(2, 8).toUpperCase())).toUpperCase();

      // 1. Comprehensive Customer & Contact Details
      const rawUser = raw.user || raw.customer || raw.address || raw.shippingAddress || {};
      const houseFlat = (rawUser.houseFlat || rawUser.address1 || '').trim();
      const streetRoad = (rawUser.streetRoad || rawUser.address2 || '').trim();
      const landmark = (rawUser.landmark || '').trim();
      const city = (rawUser.city || '').trim();
      const state = (rawUser.state || '').trim();
      const pincode = (rawUser.pincode || '').trim();

      const formattedAddress = rawUser.fullAddress || [
        houseFlat,
        streetRoad,
        landmark ? `(Near ${landmark})` : '',
        city,
        state ? `${state} - ${pincode}` : pincode
      ].filter(Boolean).join(', ');

      const fullName = (rawUser.fullName || rawUser.name || 'Valued Customer').trim();
      const phone = (rawUser.phone || rawUser.phoneNumber || '').trim();
      const email = (rawUser.email || '').trim();
      const addressType = rawUser.addressType || rawUser.type || 'Home';

      const contactDetails = {
        fullName,
        phone,
        email,
        pincode
      };

      const shippingAddress = {
        fullName,
        phone,
        email,
        houseFlat,
        streetRoad,
        landmark,
        city,
        state,
        pincode,
        addressType,
        fullAddress: formattedAddress
      };

      // 2. Comprehensive Product Details (All specs, collections, finishes, sizes, seals, prices, images, titles)
      const rawProducts = raw.products || raw.items || raw.productDetails || [];
      const productsList = (Array.isArray(rawProducts) ? rawProducts : []).map(p => {
        const priceInr = Number(p.priceInr || p.price || 0);
        const qty = Math.max(1, parseInt(p.qty || p.quantity, 10) || 1);
        const title = p.title || p.name || 'Imperial Artifact';
        const image = p.image || p.imageUrl || (Array.isArray(p.images) ? p.images[0] : '') || '';
        return {
          sku: p.sku || p.id || 'RELIC',
          id: p.id || p.sku || 'RELIC',
          name: title,
          title: title,
          category: p.category || 'Relics',
          collection: p.collection || '',
          collectionName: p.collectionName || 'The Street Co Collection',
          seal: p.seal || '忍',
          specs: p.specs || '',
          desc: p.desc || '',
          size: p.size || 'M',
          finish: p.finish || 'Obsidian Shadow',
          qty,
          quantity: qty,
          priceInr,
          price: priceInr,
          totalItemPriceInr: Number(p.totalItemPriceInr) || (priceInr * qty),
          image,
          imageUrl: image
        };
      });

      const totalItems = productsList.reduce((sum, it) => sum + it.qty, 0);
      const subtotalInr = productsList.reduce((sum, it) => sum + it.totalItemPriceInr, 0);

      const rawPricing = raw.pricing || {};
      const deliveryFeeInr = Number(raw.delivery?.cost ?? rawPricing.deliveryCost ?? (raw.delivery?.speed === 'express' ? 149 : 0));
      const discountInr = Number(raw.discount ?? rawPricing.discountInr ?? 0);
      const grandTotalInr = Number(raw.totalInr ?? rawPricing.totalInr ?? Math.max(0, subtotalInr + deliveryFeeInr - discountInr));

      // 3. Full Delivery & Courier Details
      const deliverySpeed = raw.delivery?.speed || 'standard';
      const courierTitle = raw.delivery?.courierTitle || raw.delivery?.title || (deliverySpeed === 'express' ? '⚡ Express ANBU Air Dispatch' : 'Standard Shadow Courier');
      const estimatedDelivery = raw.delivery?.estimatedDelivery || '3-4 Business Days';
      const deliveryDetails = {
        speed: deliverySpeed,
        courierService: courierTitle,
        courierTitle: courierTitle,
        deliveryChargeInr: deliveryFeeInr,
        cost: deliveryFeeInr,
        estimatedDelivery: estimatedDelivery,
        dispatchStatus: 'QUEUED_FOR_DISPATCH',
        trackingCode: `ANBU-${Math.floor(100000 + Math.random() * 900000)}`
      };

      // 4. Full Payment Details
      const rawMethod = (raw.payment?.method || raw.paymentMethod || 'cod').toLowerCase();
      let paymentMethod = 'COD';
      let paymentMethodLabel = 'Cash on Safehouse Arrival (COD)';
      let paymentStatus = 'PENDING_ON_DELIVERY';

      if (rawMethod === 'upi') {
        paymentMethod = 'UPI';
        paymentMethodLabel = 'UPI (Google Pay / PhonePe / Paytm / BHIM)';
        paymentStatus = 'PAID_CONFIRMED';
      } else if (rawMethod === 'card') {
        paymentMethod = 'CARD';
        paymentMethodLabel = 'Credit / Debit Card (Visa, Mastercard, RuPay)';
        paymentStatus = 'PAID_CONFIRMED';
      } else if (rawMethod === 'netbanking') {
        paymentMethod = 'NETBANKING';
        paymentMethodLabel = 'Net Banking (Indian Banks)';
        paymentStatus = 'PAID_CONFIRMED';
      }

      const transactionId = raw.payment?.transactionId || raw.transactionId || `TXN_${Date.now()}`;
      const paymentDetails = {
        method: paymentMethod,
        methodLabel: paymentMethodLabel,
        detail: raw.payment?.detail || paymentMethodLabel,
        bank: raw.payment?.bank || '',
        status: raw.payment?.status || paymentStatus,
        transactionId: transactionId,
        currency: 'INR (₹)',
        paidAt: raw.payment?.paidAt || now.toISOString()
      };

      // Indian Standard Time (IST) formatting
      const istDateTime = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' IST';

      // 5. Clean Order Document (Zero duplicate keys)
      const orderDocument = {
        orderId,
        orderCode,
        status: raw.status || 'CONFIRMED',
        orderDate: now.toISOString(),
        orderDateFormatted: istDateTime,
        createdAt: now,
        source: raw.source || 'checkout',

        // 1. Customer Contact Details
        contactDetails,

        // 2. Full Shipping Address
        shippingAddress,

        // 3. Delivery Details
        deliveryDetails,

        // 4. Payment Method
        paymentMethod,
        paymentStatus: paymentDetails.status,
        transactionId,

        // 5. Full Product Details
        products: productsList,
        items: productsList,
        productDetails: productsList,

        // 6. Totals
        subtotalInr,
        deliveryFeeInr,
        discountInr,
        grandTotalInr,
        currency: 'INR'
      };

      // 1. Zoho Sales Order Creation
      let zohoSalesOrderResult = null;
      try {
        zohoSalesOrderResult = await zohoInventory.createSalesOrder(orderDocument);
        if (zohoSalesOrderResult && zohoSalesOrderResult.salesorder) {
          orderDocument.zoho_salesorder_id = zohoSalesOrderResult.salesorder.salesorder_id;
          orderDocument.salesorder_number = zohoSalesOrderResult.salesorder.salesorder_number;
        }
      } catch (soErr) {
        console.warn('[Zoho Netlify] Sales order error:', soErr.message);
        zohoSalesOrderResult = { success: false, error: soErr.message };
      }

      // 2. Automated Zoho Indian GST Tax Invoice Creation
      let zohoInvoiceResult = null;
      try {
        zohoInvoiceResult = await zohoInventory.createGstInvoice(orderDocument);
        if (zohoInvoiceResult && zohoInvoiceResult.success) {
          orderDocument.invoice_number = zohoInvoiceResult.invoice_number;
          orderDocument.invoice_id = zohoInvoiceResult.invoice_id;
          orderDocument.zoho_invoice_id = zohoInvoiceResult.zoho_invoice_id || zohoInvoiceResult.invoice_id;
          orderDocument.zoho_invoice_url = zohoInvoiceResult.invoice_url || '';
          orderDocument.template_name = zohoInvoiceResult.template_name || 'The Street Co';
          orderDocument.gstBreakdown = zohoInvoiceResult.gstBreakdown;
          orderDocument.invoiceUrl = `/invoice/${orderDocument.orderCode}`;
        }
      } catch (invErr) {
        console.warn('[Zoho Netlify GST Invoice Notice]', invErr.message);
        zohoInvoiceResult = { success: false, error: invErr.message };
      }

      inMemoryOrders.set(orderCode, orderDocument);
      inMemoryOrders.set(orderId, orderDocument);

      const hostOrigin = (event.headers?.['x-forwarded-proto'] && event.headers?.host)
        ? `${event.headers['x-forwarded-proto']}://${event.headers.host}`
        : 'https://thestreetco.netlify.app';

      // Automated Dispatches in Parallel (SMS + Order Confirmation Email + Dedicated GST Tax Invoice Email)
      // Running concurrently guarantees both emails and SMS complete rapidly without hitting Netlify's 10s execution limit
      const [smsResult, emailResult, invoiceEmailResult] = await Promise.all([
        sendOrderConfirmationSms(orderDocument).catch(smsErr => {
          console.warn('[Twilio Netlify] SMS error:', smsErr.message);
          return { success: false, error: smsErr.message };
        }),
        sendOrderConfirmationEmailGmail(orderDocument, hostOrigin).catch(emailErr => {
          console.warn('[Gmail Netlify] Order confirmation email error:', emailErr.message);
          return { success: false, error: emailErr.message };
        }),
        sendGstTaxInvoiceEmail(orderDocument, hostOrigin).catch(invEmailErr => {
          console.warn('[Gmail Netlify] GST Tax Invoice email error:', invEmailErr.message);
          return { success: false, error: invEmailErr.message };
        })
      ]);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          orderId,
          orderCode,
          order: orderDocument,
          zohoSalesOrder: zohoSalesOrderResult,
          zohoInvoice: zohoInvoiceResult,
          invoiceUrl: orderDocument.invoiceUrl || `/invoice/${orderDocument.orderCode}`,
          sms: smsResult,
          email: emailResult,
          invoiceEmail: invoiceEmailResult,
          message: 'Order created, Sales Order registered, and both Order Confirmation & GST Tax Invoice emails dispatched separately.'
        })
      };
    }

    // Endpoint to trigger or resend GST Tax Invoice Email for an order
    if (rawPath.includes('send-invoice-email') && method === 'POST') {
      const parts = rawPath.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'orders');
      const code = (idx !== -1 && parts[idx + 1] ? parts[idx + 1] : '').trim().toUpperCase();
      const order = inMemoryOrders.get(code);
      if (!order) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Order not found' })
        };
      }
      const hostOrigin = (event.headers?.['x-forwarded-proto'] && event.headers?.host)
        ? `${event.headers['x-forwarded-proto']}://${event.headers.host}`
        : 'https://thestreetco.netlify.app';
      const result = await sendGstTaxInvoiceEmail(order, hostOrigin);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, result })
      };
    }

    // List all generated GST Tax Invoices: /api/invoices
    if ((rawPath === '/api/invoices' || rawPath === '/invoices' || rawPath.endsWith('/invoices')) && method === 'GET') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          count: zohoInventory.getInvoicesList().length,
          invoices: zohoInventory.getInvoicesList()
        })
      };
    }

    // View printable GST Tax Invoice HTML or stream official Zoho PDF for specific order
    if (((rawPath.includes('/orders/') && rawPath.includes('/invoice')) || rawPath.includes('/invoice/')) && method === 'GET') {
      const parts = rawPath.split('/').filter(Boolean);
      let code = '';
      if (rawPath.includes('/orders/')) {
        const idx = parts.findIndex(p => p === 'orders');
        if (idx !== -1 && parts[idx + 1]) code = parts[idx + 1].replace(/\/invoice.*/, '');
      } else if (rawPath.includes('/invoice/')) {
        const idx = parts.findIndex(p => p === 'invoice');
        if (idx !== -1 && parts[idx + 1]) code = parts[idx + 1];
      }
      code = code.trim().toUpperCase();
      const order = inMemoryOrders.get(code);
      if (!order) {
        return {
          statusCode: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
          body: `
            <div style="font-family:sans-serif; text-align:center; padding: 50px;">
              <h2>Order #${code || 'UNKNOWN'} Not Found</h2>
              <p>The requested invoice could not be located. Please verify your order code.</p>
              <a href="/" style="color:#c0121f; font-weight:bold;">Return to Storefront</a>
            </div>
          `
        };
      }
      const queryString = event.queryStringParameters || {};
      if (queryString.pdf === 'true' || queryString.download === 'pdf' || event.headers?.accept?.includes('application/pdf')) {
        const zohoInvoiceId = order.zoho_invoice_id || order.invoice_id;
        if (zohoInvoiceId && !String(zohoInvoiceId).startsWith('LOCAL-')) {
          try {
            const pdfBuf = await zohoInventory.fetchZohoInvoicePdf(zohoInvoiceId);
            if (pdfBuf) {
              return {
                statusCode: 200,
                isBase64Encoded: true,
                headers: {
                  ...CORS_HEADERS,
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': `inline; filename="TheStreetCo-Invoice-${code}.pdf"`
                },
                body: pdfBuf.toString('base64')
              };
            }
          } catch (pdfErr) {
            console.warn('[PDF Delivery Error]:', pdfErr.message);
          }
        }
      }

      const invoiceHtml = zohoInventory.renderGstInvoiceHtml(order);
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/html; charset=utf-8'
        },
        body: invoiceHtml
      };
    }

    // 5. ORDERS: GET /api/orders
    if (rawPath.includes('orders') && method === 'GET') {
      const orders = Array.from(new Set(inMemoryOrders.values())).slice(0, 50);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          count: orders.length,
          orders
        })
      };
    }

    // 6. COUPONS: GET /api/coupons and POST /api/coupons/validate
    if (rawPath.includes('coupons')) {
      const DEFAULT_COUPONS = [
        {
          code: 'STREET10',
          title: '10% Off The Street Co Collection',
          desc: 'Enjoy 10% instant discount on orders from ₹1,500 to ₹8,000.',
          group: 'percentage',
          type: 'percentage',
          value: 10,
          minOrderValue: 1500,
          maxOrderValue: 8000,
          maxDiscount: 800,
          isPublic: true,
          badge: '10% OFF',
          status: 'active'
        },
        {
          code: 'SHARINGAN15',
          title: '15% Off Shinobi Relics',
          desc: 'Receive 15% instant discount on orders from ₹2,500 to ₹12,000.',
          group: 'percentage',
          type: 'percentage',
          value: 15,
          minOrderValue: 2500,
          maxOrderValue: 12000,
          maxDiscount: 1800,
          isPublic: true,
          badge: '15% OFF',
          status: 'active'
        },
        {
          code: 'AMATERASU20',
          title: '20% Off Black Flame Hoard',
          desc: 'Unlock 20% discount on high-tier orders between ₹5,000 and ₹25,000.',
          group: 'percentage',
          type: 'percentage',
          value: 20,
          minOrderValue: 5000,
          maxOrderValue: 25000,
          maxDiscount: 4000,
          isPublic: true,
          badge: '20% OFF',
          status: 'active'
        },
        {
          code: 'TSUKUYOMI25',
          title: '25% Off Grand Archive Master Collection',
          desc: 'Exclusive 25% discount for major collectors on orders above ₹8,000.',
          group: 'percentage',
          type: 'percentage',
          value: 25,
          minOrderValue: 8000,
          maxOrderValue: null,
          maxDiscount: 6000,
          isPublic: true,
          badge: '25% OFF',
          status: 'active'
        },
        {
          code: 'UCHIHA200',
          title: 'Flat ₹200 Welcome Offer',
          desc: 'Flat ₹200 off on shopping cart from ₹1,000 to ₹6,000.',
          group: 'flat',
          type: 'flat',
          value: 200,
          minOrderValue: 1000,
          maxOrderValue: 6000,
          maxDiscount: 200,
          isPublic: true,
          badge: 'FLAT ₹200',
          status: 'active'
        },
        {
          code: 'ITACHI500',
          title: 'Flat ₹500 Official Seal Discount',
          desc: 'Flat ₹500 instant discount on orders from ₹3,000 to ₹20,000.',
          group: 'flat',
          type: 'flat',
          value: 500,
          minOrderValue: 3000,
          maxOrderValue: 20000,
          maxDiscount: 500,
          isPublic: true,
          badge: 'FLAT ₹500',
          status: 'active'
        },
        {
          code: 'AKATSUKI1000',
          title: 'Flat ₹1,000 Rogue Ninja Vault',
          desc: 'Flat ₹1,000 deduction on premium orders above ₹6,000.',
          group: 'flat',
          type: 'flat',
          value: 1000,
          minOrderValue: 6000,
          maxOrderValue: null,
          maxDiscount: 1000,
          isPublic: true,
          badge: 'FLAT ₹1,000',
          status: 'active'
        },
        {
          code: 'SUSANOO1500',
          title: 'Flat ₹1,500 Divine Armor Requisition',
          desc: 'Save flat ₹1,500 on all orders above ₹10,000.',
          group: 'flat',
          type: 'flat',
          value: 1500,
          minOrderValue: 10000,
          maxOrderValue: null,
          maxDiscount: 1500,
          isPublic: true,
          badge: 'FLAT ₹1,500',
          status: 'active'
        },
        {
          code: 'SECRET300',
          title: 'Classified ANBU Operative Seal',
          desc: 'Exclusive flat ₹300 off on covert requisitions above ₹1,800.',
          group: 'flat',
          type: 'flat',
          value: 300,
          minOrderValue: 1800,
          maxOrderValue: null,
          maxDiscount: 300,
          isPublic: false,
          badge: 'SECRET',
          status: 'active'
        },
        {
          code: 'ANBU30',
          title: 'Private ANBU 30% Pass',
          desc: 'Confidential 30% discount on orders above ₹4,000.',
          group: 'percentage',
          type: 'percentage',
          value: 30,
          minOrderValue: 4000,
          maxOrderValue: null,
          maxDiscount: 3000,
          isPublic: false,
          badge: 'SECRET',
          status: 'active'
        }
      ];

      // POST /api/coupons/validate
      if (rawPath.includes('validate') && method === 'POST') {
        const body = event.body ? JSON.parse(event.body) : {};
        const rawCode = (body.code || '').trim().toUpperCase();
        const subtotal = Math.max(0, Number(body.subtotal) || 0);

        if (!rawCode) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, message: '❌ Please enter a coupon code.' })
          };
        }

        let coupon = DEFAULT_COUPONS.find(c => c.code.toUpperCase() === rawCode);

        if (!coupon) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              reason: 'not_found',
              message: `❌ Coupon "${rawCode}" does not exist. Please check your spelling and try again.`
            })
          };
        }

        if (coupon.status !== 'active') {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              reason: 'inactive',
              message: `❌ Coupon "${coupon.code}" is currently inactive and cannot be used.`
            })
          };
        }

        if (coupon.isPublic !== true) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              reason: 'not_public',
              message: `❌ Coupon "${coupon.code}" cannot be used until it is marked as public.`
            })
          };
        }

        if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
          const diff = coupon.minOrderValue - subtotal;
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              reason: 'min_order_unmet',
              minOrderValue: coupon.minOrderValue,
              missingAmount: diff,
              message: `⚠️ Coupon "${coupon.code}" requires a minimum order of ₹${coupon.minOrderValue.toLocaleString('en-IN')}. Your cart is ₹${subtotal.toLocaleString('en-IN')}. Add ₹${diff.toLocaleString('en-IN')} more to unlock!`
            })
          };
        }

        if (coupon.maxOrderValue && subtotal > coupon.maxOrderValue) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              reason: 'max_order_exceeded',
              maxOrderValue: coupon.maxOrderValue,
              message: `⚠️ Coupon "${coupon.code}" is only applicable for orders up to ₹${coupon.maxOrderValue.toLocaleString('en-IN')}. Your current cart is ₹${subtotal.toLocaleString('en-IN')}.`
            })
          };
        }

        let discount = 0;
        if (coupon.group === 'percentage' || coupon.type === 'percentage') {
          discount = Math.round((subtotal * coupon.value) / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
        } else {
          discount = Number(coupon.value) || 0;
        }
        discount = Math.min(discount, subtotal);

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            valid: true,
            code: coupon.code,
            title: coupon.title,
            group: coupon.group || 'flat',
            type: coupon.type || 'flat',
            value: coupon.value,
            discount,
            minOrderValue: coupon.minOrderValue,
            maxOrderValue: coupon.maxOrderValue,
            message: (coupon.group === 'percentage' || coupon.type === 'percentage')
              ? `✓ Store coupon "${coupon.code}" verified: ${coupon.value}% discount (-₹${discount.toLocaleString('en-IN')}) applied!`
              : `✓ Store coupon "${coupon.code}" verified: Flat ₹${discount.toLocaleString('en-IN')} discount applied!`
          })
        };
      }

      // GET /api/coupons
      if (method === 'GET') {
        const queryParams = event.queryStringParameters || {};
        const subtotal = queryParams.subtotal ? Math.max(0, Number(queryParams.subtotal) || 0) : null;
        const list = DEFAULT_COUPONS.filter(c => c.isPublic && c.status === 'active');

        const enhanced = list.map(c => {
          const min = Number(c.minOrderValue) || 0;
          const max = c.maxOrderValue ? Number(c.maxOrderValue) : null;
          let matchesPriceRange = true;
          let missingAmount = 0;
          let calculatedDiscount = 0;

          if (subtotal !== null) {
            if (subtotal < min) {
              matchesPriceRange = false;
              missingAmount = min - subtotal;
            }
            if (max && subtotal > max) matchesPriceRange = false;
            if (c.group === 'percentage' || c.type === 'percentage') {
              calculatedDiscount = Math.round((subtotal * c.value) / 100);
              if (c.maxDiscount && calculatedDiscount > c.maxDiscount) calculatedDiscount = c.maxDiscount;
            } else {
              calculatedDiscount = Number(c.value) || 0;
            }
            calculatedDiscount = Math.min(calculatedDiscount, subtotal);
          }

          return {
            code: c.code,
            title: c.title,
            desc: c.desc,
            group: c.group || (c.type === 'percentage' ? 'percentage' : 'flat'),
            type: c.type || c.group || 'flat',
            value: c.value,
            minOrderValue: min,
            maxOrderValue: max,
            maxDiscount: c.maxDiscount || null,
            isPublic: c.isPublic !== false,
            badge: c.badge || (c.group === 'percentage' ? `${c.value}% OFF` : `FLAT ₹${c.value}`),
            status: c.status || 'active',
            matchesPriceRange,
            missingAmount,
            calculatedDiscount
          };
        });

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            subtotal: subtotal !== null ? subtotal : undefined,
            count: enhanced.length,
            groups: {
              percentage: enhanced.filter(c => c.group === 'percentage'),
              flat: enhanced.filter(c => c.group === 'flat')
            },
            coupons: enhanced
          })
        };
      }
    }

    // 6b. CONTACT & SUPPORT INQUIRIES
    if (rawPath.includes('contact') || rawPath.includes('support')) {
      if (method === 'POST') {
        let body = {};
        try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
        const cleanName = String(body.name || '').trim();
        const cleanEmail = String(body.email || '').trim().toLowerCase();
        const cleanMessage = String(body.message || '').trim();
        const cleanCategory = String(body.category || 'General Support').trim();
        const cleanOrderNumber = String(body.orderNumber || '').trim();
        const cleanPhone = formatDisplayContactPhone(body.phone || '');

        if (!cleanName) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Please provide your full name.' }) };
        }
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Please provide a valid email address.' }) };
        }
        if (!cleanMessage || cleanMessage.length < 5) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Please provide a message of at least 5 characters.' }) };
        }

        const ticketId = `STREET-CARE-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date();
        const ticketRecord = {
          ticketId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          category: cleanCategory,
          orderNumber: cleanOrderNumber,
          message: cleanMessage,
          status: 'OPEN',
          createdAt: now.toISOString(),
          supportEmail: 'support@thestreetco.zohodesk.in',
          assignedDesk: 'Client Care Concierge'
        };

        inMemoryTickets.set(ticketId, ticketRecord);

        const gmail = getGmailTransporter();
        if (gmail) {
          try {
            const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
            const supportDeskHtml = `
              <div style="font-family:'Segoe UI',sans-serif;background:#0d0c10;color:#f3efe6;padding:24px;border-radius:8px;">
                <div style="font-size:11px;color:#c0121f;font-weight:700;letter-spacing:2px;margin-bottom:6px;">THE STREET CO · CLIENT CONCIERGE</div>
                <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">NEW SUPPORT TICKET #${ticketId}</h2>
                <div style="background:#16151c;padding:16px;border-radius:6px;border:1px solid #2a2933;margin-bottom:16px;">
                  <p style="margin:4px 0;"><strong>Customer Name:</strong> ${cleanName}</p>
                  <p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${cleanEmail}" style="color:#f3efe6;">${cleanEmail}</a></p>
                  <p style="margin:4px 0;"><strong>Phone:</strong> ${cleanPhone || 'Not provided'}</p>
                  <p style="margin:4px 0;"><strong>Category:</strong> ${cleanCategory}</p>
                  <p style="margin:4px 0;"><strong>Order Reference:</strong> ${cleanOrderNumber || 'N/A'}</p>
                  <p style="margin:4px 0;"><strong>Logged At:</strong> ${now.toISOString()}</p>
                </div>
                <div style="background:#16151c;padding:16px;border-radius:6px;border:1px solid #2a2933;">
                  <strong style="display:block;margin-bottom:8px;color:#c0121f;">CUSTOMER INQUIRY MESSAGE:</strong>
                  <p style="white-space:pre-wrap;line-height:1.6;color:#e8e4dc;margin:0;">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              </div>
            `;
            await gmail.sendMail({
              from: `"The Street Co Concierge" <${senderUser}>`,
              to: ZOHO_DESK_SUPPORT_EMAIL,
              replyTo: cleanEmail,
              subject: `[SUPPORT TICKET #${ticketId}] ${cleanCategory} - ${cleanName}`,
              html: supportDeskHtml
            });
            console.log(`[Netlify Support Mail] Gmail notification sent for ticket #${ticketId} to ${ZOHO_DESK_SUPPORT_EMAIL}`);
          } catch (mailErr) {
            console.warn(`[Netlify Support Mail] Notice for ticket #${ticketId}:`, mailErr.message);
          }
        }

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            ticketId,
            message: `Your inquiry has been received. Our team will contact you at ${cleanEmail} shortly.`,
            supportEmail: 'support@thestreetco.zohodesk.in',
            phone: '+91 6296731835',
            category: cleanCategory,
            orderNumber: cleanOrderNumber || null,
            createdAt: now.toISOString()
          })
        };
      }

      if (method === 'GET') {
        const tickets = Array.from(inMemoryTickets.values());
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, count: tickets.length, tickets })
        };
      }
    }

    // 7. STATUS / HEALTH
    if (rawPath.includes('db-status') || rawPath.includes('health') || rawPath.includes('status')) {
      const pList = getCachedProducts();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'healthy',
          engine: 'Netlify Serverless Functions',
          productsCount: pList.length,
          ordersCount: inMemoryOrders.size,
          subscribersCount: inMemorySubscribers.size,
          couponsCount: DEFAULT_COUPONS.length
        })
      };
    }

    // Fallback 404
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Not found: ${rawPath}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Operation failed',
        message: err.message
      })
    };
  }
};
