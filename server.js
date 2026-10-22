import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import * as zohoInventory from './zohoInventory.js';
import { getProductImageBuffer } from './productImage.js';

// Load local .env if present
if (process.loadEnvFile) {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID || process.env.GOOGLE_ANALYTICS_ID || 'G-P6M5JYSKP0').trim();

// Twilio SMS Automated Configuration
const TWILIO_ACCOUNT_SID = (process.env.TWILIO_ACCOUNT_SID || 'AC94691c71b285619460176e829e92fec4').trim();
const TWILIO_AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '1a6de980980e3bc5e8cd27a0e3446727').trim();
const TWILIO_PHONE_NUMBER = (process.env.TWILIO_PHONE_NUMBER || '+14356605689').trim();

// Direct Google Gmail SMTP Configuration (Exclusive Email Provider)
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
      console.log(`[Gmail SMTP] Initialized native Google mail transporter for ${user}`);
    } catch (err) {
      console.warn('[Gmail SMTP] Transporter initialization warning:', err.message);
      return null;
    }
  }
  return gmailTransporter;
}

let twilioClient = null;
function getTwilioClient() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID).trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || TWILIO_AUTH_TOKEN).trim();
  if (!sid || !token) return null;
  if (!twilioClient) {
    try {
      twilioClient = twilio(sid, token);
      console.log(`[Twilio] Client initialized with Account SID: ${sid.slice(0, 6)}...`);
    } catch (err) {
      console.warn('[Twilio] Initialization error:', err.message);
      return null;
    }
  }
  return twilioClient;
}

// Convert user phone to clean E.164 format (defaults to India +91 if 10 digits provided)
function formatToE164Phone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
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

// Automated Order Confirmation SMS Dispatcher
async function sendOrderConfirmationSms(order, hostOrigin = '') {
  const client = getTwilioClient();
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER).trim();

  if (!client || !fromNumber) {
    return {
      success: false,
      configured: false,
      notice: 'Twilio SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env'
    };
  }

  const rawPhone = order?.shippingAddress?.phone || order?.contactDetails?.phone || order?.userDetails?.phone || order?.phone || '';
  if (!rawPhone) {
    return { success: false, error: 'No phone number provided for recipient.' };
  }

  const cleanedDigits = rawPhone.replace(/[\s\-()+]/g, '');
  const isPlaceholderNumber = /^(?:91)?(?:9876543210|1234567890|0000000000|9999999999|1111111111)$/.test(cleanedDigits);
  if (isPlaceholderNumber) {
    console.log(`[Twilio] Test/placeholder phone number detected (${rawPhone}). SMS dispatch bypassed.`);
    return {
      success: false,
      skipped: true,
      notice: 'SMS dispatch bypassed for test/placeholder phone number.'
    };
  }

  const formattedPhone = formatToE164Phone(rawPhone);
  const orderCode = order.orderCode || order.orderId || 'UCHIHA-ORDER';
  const cleanCode = String(orderCode).replace(/^#/, '');
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Shinobi';
  const grandTotal = order.grandTotalInr ? `₹${Math.round(Number(order.grandTotalInr))}` : '₹0';

  const smsBody = `Hi ${customerName}, thank you for ordering from THE STREET CO! Order #${cleanCode} for ${grandTotal} is confirmed and being processed. Track: https://www.delhivery.com/tracking`;

  try {
    const message = await client.messages.create({
      body: smsBody,
      from: fromNumber,
      to: formattedPhone
    });
    console.log(`[Twilio] SMS successfully sent for order ${orderCode} to ${formattedPhone}. SID: ${message.sid}`);
    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: formattedPhone
    };
  } catch (err) {
    if (err.code === 21608) {
      console.warn(`[Twilio Notice] Phone ${formattedPhone} is unverified on Twilio Trial account. Verify this number in Twilio console to receive live SMS.`);
    } else {
      console.warn(`[Twilio Notice] SMS dispatch note for order ${orderCode}:`, err.message);
    }
    return {
      success: false,
      unverifiedTrialNumber: err.code === 21608,
      error: err.message,
      code: err.code
    };
  }
}

// Exclusive Google Gmail Transactional Email Dispatcher
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
      title: 'Heavyweight Graphic Hoodie',
      name: 'Heavyweight Graphic Hoodie',
      size: 'L',
      quantity: 1,
      qty: 1,
      price: Math.round(Number(order.grandTotalInr) || 1499),
      priceInr: Math.round(Number(order.grandTotalInr) || 1499),
      image: 'https://thestreetco.netlify.app/og-preview.jpg'
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

  const buyerGstin = (
    order.gstin ||
    order?.shippingAddress?.gstin ||
    order?.contactDetails?.gstin ||
    order?.userDetails?.gstin ||
    ''
  ).trim().toUpperCase();

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

    // Resolve item order picture
    let itemImg = item.image || item.imageUrl || (item.images && item.images[0]) || '';
    if (!itemImg) {
      itemImg = `${resolvedOrigin}/product-minato.jpg`;
    } else if (itemImg.startsWith('/')) {
      itemImg = `${resolvedOrigin}${itemImg}`;
    }

    // Calculate coupon discount per item
    const orderSubtotalNum = Number(order.subtotalInr) || totalItemPriceNum || 1;
    const proportion = totalItemPriceNum / orderSubtotalNum;
    const itemDiscountAmt = hasCoupon ? Math.round(discountVal * proportion) : 0;
    const itemFinalTotal = Math.max(0, totalItemPriceNum - itemDiscountAmt);
    const itemFinalUnit = Math.max(0, Math.round(itemFinalTotal / itemQty));

    const unitPriceDisplay = (hasCoupon && itemDiscountAmt > 0)
      ? `<span style="white-space:nowrap;display:inline-block;"><span style="text-decoration:line-through;color:#888888;font-size:12px;margin-right:6px;">₹ ${Math.round(unitPriceNum).toLocaleString('en-IN')}</span><strong style="color:#ed3031;font-size:13px;">₹ ${Math.round(itemFinalUnit).toLocaleString('en-IN')}</strong></span>`
      : `<span style="white-space:nowrap;display:inline-block;font-weight:600;color:#111111;">₹ ${Math.round(unitPriceNum).toLocaleString('en-IN')}</span>`;

    const totalPriceDisplay = (hasCoupon && itemDiscountAmt > 0)
      ? `<span style="white-space:nowrap;display:inline-block;"><span style="text-decoration:line-through;color:#888888;font-size:12px;font-weight:normal;margin-right:6px;">₹ ${Math.round(totalItemPriceNum).toLocaleString('en-IN')}</span><strong style="color:#ed3031;font-size:14px;">₹ ${Math.round(itemFinalTotal).toLocaleString('en-IN')}</strong></span>`
      : `<span style="white-space:nowrap;display:inline-block;color:#ed3031;font-size:14px;font-weight:700;">₹ ${Math.round(totalItemPriceNum).toLocaleString('en-IN')}</span>`;

    return `
        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;color:#282c3f;font-family:'Source Sans Pro', Helvetica, Arial, sans-serif;font-size:14px;line-height:22px;margin-bottom:16px;border-bottom:1px solid #e4e4e4;padding-bottom:14px;">
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
                  <td style="width:42%;text-align:right;padding-top:4px;vertical-align:middle;white-space:nowrap;">${totalPriceDisplay}</td>
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
  const firstItemImg = `${resolvedOrigin}/product-minato.jpg`;
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
              Contact No: ${recipientPhone || 'Not provided'}${buyerGstin ? `<br>GSTIN: <strong>${buyerGstin}</strong>` : ''}
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

      <!-- Financial Totals Summary (Matching 58%/42% Column Alignment & No-Wrap Prices) -->
      <div style="padding:0 5px 20px 5px;">
        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;table-layout:fixed;font-family:'Source Sans Pro', Helvetica, Arial, sans-serif;font-size:13px;color:#444444;line-height:22px;border-top:1px solid #e4e4e4;padding-top:12px;">
          <tr>
            <td style="width:58%;text-align:left;color:#686B78;padding:4px 0;vertical-align:middle;">Subtotal</td>
            <td style="width:42%;text-align:right;color:#111111;font-weight:600;padding:4px 0;vertical-align:middle;white-space:nowrap;">${subtotal}</td>
          </tr>
          <tr>
            <td style="width:58%;text-align:left;color:#686B78;padding:4px 0;vertical-align:middle;">Shipping &amp; Delivery</td>
            <td style="width:42%;text-align:right;color:#10b981;font-weight:600;padding:4px 0;vertical-align:middle;white-space:nowrap;">${deliveryFee}</td>
          </tr>
          ${discountVal > 0 ? `
          <tr>
            <td style="width:58%;text-align:left;color:#686B78;padding:4px 0;vertical-align:middle;">
              Coupon Discount ${couponCode ? `<strong style="color:#ed3031;font-weight:700;">(${couponCode})</strong>` : ''}
            </td>
            <td style="width:42%;text-align:right;color:#ed3031;font-weight:700;padding:4px 0;vertical-align:middle;white-space:nowrap;">-₹ ${discountVal.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="font-size:15px;font-weight:700;color:#111111;">
            <td style="width:58%;text-align:left;padding-top:10px;border-top:1px solid #e4e4e4;color:#111111;vertical-align:middle;">Grand Total</td>
            <td style="width:42%;text-align:right;padding-top:10px;border-top:1px solid #e4e4e4;color:#ed3031;font-size:16px;font-weight:700;white-space:nowrap;vertical-align:middle;">${grandTotal}</td>
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

  // Exclusive Google Gmail SMTP Delivery
  const gmail = getGmailTransporter();
  if (!gmail) {
    console.warn('[Gmail SMTP] Transporter not initialized. Ensure GMAIL_SMTP_USER and GMAIL_SMTP_PASS are set.');
    return {
      success: false,
      provider: 'gmail_smtp',
      error: 'Gmail SMTP credentials missing. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASS.'
    };
  }

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
    console.log(`[Gmail SMTP] Native Google order email successfully delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
    return {
      success: true,
      provider: 'gmail_smtp',
      messageId: info.messageId,
      recipient: recipientEmail
    };
  } catch (gmailErr) {
    console.error('[Gmail SMTP] Order email delivery error:', gmailErr.message);
    return {
      success: false,
      provider: 'gmail_smtp',
      error: gmailErr.message
    };
  }
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
  const supportEmail = 'support@thestreetco.zohodesk.in';

  const pdfFilename = `TheStreetCo-Invoice-${invoiceNo}.pdf`;

  // Subject: Your Invoice Is Ready – [Invoice Number/order id]
  const subject = `Your Invoice Is Ready – ${invoiceNo || orderCode}`;

  // Plain text draft matching user's exact specification
  const plainTextContent = `Hi ${customerName},

Your official GST Tax Invoice for order #${orderCode} from ${storeName} is ready.

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

  // Fetch Official 100% compliant Zoho PDF to attach directly to the email
  let pdfAttachment = null;
  const zohoInvoiceId = order.zoho_invoice_id || order.invoice_id;
  if (zohoInvoiceId && !String(zohoInvoiceId).startsWith('LOCAL-')) {
    try {
      const pdfBuffer = await zohoInventory.fetchZohoInvoicePdf(zohoInvoiceId);
      if (pdfBuffer && pdfBuffer.length > 0) {
        pdfAttachment = {
          filename: `TheStreetCo-Invoice-${invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        };
      }
    } catch (attErr) {
      console.warn('[Invoice Email] Could not fetch Zoho PDF attachment:', attErr.message);
    }
  }

  // 1. Attempt Native Google Gmail SMTP Delivery
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
      console.log(`[Gmail SMTP] Dedicated invoice email (with Zoho PDF attachment) delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
      return {
        success: true,
        provider: 'gmail_smtp',
        invoiceNo,
        messageId: info.messageId,
        recipient: recipientEmail,
        hasPdfAttachment: Boolean(pdfAttachment)
      };
    } catch (gmailErr) {
      console.error('[Gmail SMTP] Invoice email delivery failed:', gmailErr.message);
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
    recipient: recipientEmail,
    error: 'Gmail SMTP not configured. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASS.'
  };
}

// Local file-backed storage helper functions
function loadJsonCache(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {}
  return fallback;
}

function saveJsonCache(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

// Initial Streetwear catalog (canonical products and apparel)
// All products use:
// 1. `sku`: Unique catalog SKU code (e.g. 'akatsuki-cloak')
// 2. `priceInr`: Pricing in Indian Rupees (INR ₹)
// 3. `images`: Array of 4-5 curated image URLs for multi-angle gallery view
const DEFAULT_PRODUCTS = [
  // Streetwear Apparel & Essentials
  {
    sku: 'TS-MIN-001',
    id: 'TS-MIN-001',
    name: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
    title: 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear',
    collection: 'minato',
    collectionName: 'Minato Namikaze',
    category: 'Oversized T-Shirts',
    category_name: 'Oversized T-Shirts',
    fit: 'Oversized Fit',
    color: 'Ivory White',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'OFFICIAL DROP',
    priceInr: 1599,
    originalMrp: 1799,
    hasDiscount: true,
    discountPercent: 11,
    stock: 98,
    seal: '火',
    desc: 'Unleash the spirit of the Hidden Leaf\'s fastest shinobi. Premium drop-shoulder oversized tee with iconic Hokage cloak burgundy fire print and heavy 240+ GSM combed cotton.',
    specs: '240 GSM Combed Cotton · Drop Shoulder Boxy Fit · High Density Kanji Print',
    images: [
      '/product-minato.jpg',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'
    ],
    imageUrl: '/product-minato.jpg'
  },
  {
    sku: 'susanoo-tee',
    id: 'susanoo-tee',
    name: 'Susanoo Armor Heavyweight Oversized T-Shirt',
    title: 'Susanoo Spectral Ribcage Heavyweight Graphic Oversized T-Shirt',
    collection: 'uchiha',
    collectionName: 'Uchiha Clan',
    category: 'Oversized T-Shirts',
    category_name: 'Oversized T-Shirts',
    fit: 'Oversized Fit',
    color: 'Obsidian Black',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'BESTSELLER',
    priceInr: 1499,
    originalMrp: 1999,
    hasDiscount: true,
    discountPercent: 25,
    stock: 54,
    seal: '須',
    desc: 'Deep obsidian heavyweight boxy streetwear tee featuring high-density vermilion and celestial violet Susanoo skeletal armor graphics on front and back.',
    specs: '240 GSM Heavyweight Terry Cotton · Drop Shoulder · Ribbed Neck Collar',
    images: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80'
  },
  {
    sku: 'sharingan-hoodie',
    id: 'sharingan-hoodie',
    name: 'Sharingan Gaze Heavyweight Streetwear Hoodie',
    title: 'Sharingan Gaze 380 GSM Heavy French Terry Streetwear Hoodie',
    collection: 'uchiha',
    collectionName: 'Uchiha Clan',
    category: 'Hoodies & Sweatshirts',
    category_name: 'Hoodies & Sweatshirts',
    fit: 'Regular Fit',
    color: 'Obsidian Black',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'NEW ARRIVAL',
    priceInr: 2999,
    originalMrp: 3999,
    hasDiscount: true,
    discountPercent: 25,
    stock: 36,
    seal: '瞳',
    desc: 'Heavyweight 380 GSM brushed fleece streetwear hoodie with embroidered crimson tomoe eye seals on double-layered hood and front kangaroo pocket.',
    specs: '380 GSM Heavy French Terry · Thermal Lined Hood · Custom Drawstrings',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&q=80',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80'
  },
  {
    sku: 'akatsuki-bomber',
    id: 'akatsuki-bomber',
    name: 'Akatsuki Cloud Reversible Streetwear Bomber Jacket',
    title: 'Akatsuki Cloud Reversible Streetwear Flight Bomber Jacket',
    collection: 'akatsuki',
    collectionName: 'Akatsuki Shadows',
    category: 'Jackets & Outerwear',
    category_name: 'Jackets & Outerwear',
    fit: 'Regular Fit',
    color: 'Obsidian Black',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'LIMITED EDITION',
    priceInr: 4499,
    originalMrp: 5999,
    hasDiscount: true,
    discountPercent: 25,
    stock: 20,
    seal: '雲',
    desc: 'Reversible matte obsidian nylon MA-1 flight bomber with water-resistant shell, heavy ribbed cuffs, crimson silk lining, and vermilion cloud chest embroidery.',
    specs: 'High-Density Matte Nylon · Heavy Brass Zippers · Reversible Silk Lining',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80',
      'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800&q=80',
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'
  },
  {
    sku: 'shinobi-cargo',
    id: 'shinobi-cargo',
    name: 'Tactical Multi-Pocket Shinobi Cargo Pants',
    title: 'Tactical Multi-Pocket Shinobi Cargo Pants - Heavy Twill Streetwear',
    collection: 'street-core',
    collectionName: 'Street Core',
    category: 'Cargo Pants & Joggers',
    category_name: 'Cargo Pants & Joggers',
    fit: 'Relaxed Fit',
    color: 'Charcoal Grey',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'STREET CORE',
    priceInr: 2499,
    originalMrp: 3299,
    hasDiscount: true,
    discountPercent: 24,
    stock: 42,
    seal: '忍',
    desc: 'Engineered heavy cotton twill utility cargo pants featuring 6 gusseted 3D tactical pockets, magnetic snap buckles, and adjustable cinch bungee ankle hems.',
    specs: '100% Heavy Twill Cotton · 6 Modular Pockets · Adjustable Bungee Cuffs',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
      'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80'
  },
  {
    sku: 'itachi-dropcut-tee',
    id: 'itachi-dropcut-tee',
    name: 'Uchiha Clan Crimson Flame Drop-Cut T-Shirt',
    title: 'Uchiha Clan Crimson Flame Drop-Cut Streetwear T-Shirt',
    collection: 'uchiha',
    collectionName: 'Uchiha Clan',
    category: 'Classic T-Shirts',
    category_name: 'Classic T-Shirts',
    fit: 'Relaxed Fit',
    color: 'Crimson Red',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'POPULAR',
    priceInr: 1299,
    originalMrp: 1699,
    hasDiscount: true,
    discountPercent: 23,
    stock: 58,
    seal: '炎',
    desc: 'Signature curved-hem drop-cut streetwear tee in deep crimson dye wash, finished with minimalist Uchiha fan monochrome insignia on upper chest.',
    specs: '210 GSM Bio-Washed Cotton · Curved Drop Hem · Silicon Wash Softness',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'
  },
  {
    sku: 'shinobi-joggers',
    id: 'shinobi-joggers',
    name: 'Leaf Shinobi Heavyweight Terry Joggers',
    title: 'Leaf Shinobi Heavyweight French Terry Streetwear Joggers',
    collection: 'street-core',
    collectionName: 'Street Core',
    category: 'Cargo Pants & Joggers',
    category_name: 'Cargo Pants & Joggers',
    fit: 'Relaxed Fit',
    color: 'Obsidian Black',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'COMFORT ESSENTIAL',
    priceInr: 1899,
    originalMrp: 2499,
    hasDiscount: true,
    discountPercent: 24,
    stock: 45,
    seal: '木',
    desc: 'Relaxed-drape French terry streetwear joggers with deep zippered side stash pockets, elasticated drawstring waistband, and tailored ankle ribs.',
    specs: '360 GSM French Terry · Concealed Zip Pockets · Reinforced Knee Stitching',
    images: [
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&q=80',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80',
      'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80'
  },
  // Collection 1: Akatsuki Shadows
  {
    sku: 'akatsuki-cloak',
    id: 'akatsuki-cloak',
    name: 'Akatsuki Cloud Trench Cloak',
    collection: 'akatsuki',
    collectionName: 'Akatsuki Shadows',
    category: 'Jackets & Outerwear',
    category_name: 'Jackets & Outerwear',
    fit: 'Oversized Fit',
    color: 'Obsidian Black',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tag: 'LIMITED RE-ISSUE',
    priceInr: 11999,
    originalMrp: 14999,
    hasDiscount: true,
    discountPercent: 20,
    priceRyo: 18500,
    stock: 12,
    seal: '雲',
    desc: 'Heavy structured obsidian twill trench with high-stand collar, crimson satin silk lining, and hand-embroidered vermilion clouds.',
    specs: '100% Japanese Gabardine · Dry Clean Only · Tailored Fit',
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'
  },
  {
    sku: 'shu-ring',
    id: 'shu-ring',
    name: 'Akatsuki "Shu" Signet Ring',
    collection: 'akatsuki',
    collectionName: 'Akatsuki Shadows',
    category: 'Accessories & Jewelry',
    category_name: 'Accessories & Jewelry',
    color: 'Crimson Red',
    sizes: ['7', '8', '9', '10', '11'],
    tag: '925 STERLING SILVER',
    priceInr: 7999,
    priceRyo: 12000,
    stock: 24,
    seal: '朱',
    desc: 'Heavyweight oxidized .925 sterling silver band embedded with crimson carnelian stone bearing the "Shu" (Vermilion) kanji seal.',
    specs: '.925 Sterling Silver · Natural Carnelian · Custom Sizes 7-12',
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
      'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'
  },
  {
    sku: 'akatsuki-kasa',
    id: 'akatsuki-kasa',
    name: 'Straw Kasa Woven Hat with Veil',
    collection: 'akatsuki',
    collectionName: 'Akatsuki Shadows',
    category: 'Accessories & Jewelry',
    category_name: 'Accessories & Jewelry',
    color: 'Ivory White',
    sizes: ['Free Size'],
    tag: 'HANDWOVEN BAMBOO',
    priceInr: 5499,
    priceRyo: 8600,
    stock: 18,
    seal: '笠',
    desc: 'Traditional woven bamboo conical kasa with pendant brass chime bell and sheer shadow-veil curtains to conceal the sharingan gaze.',
    specs: 'Handwoven Bamboo · Brass Ringing Chime · Removable Veil',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
      'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'
  },
  {
    sku: 'shadow-holster',
    id: 'shadow-holster',
    name: 'Shadow Leather Kunai Leg Holster',
    collection: 'akatsuki',
    collectionName: 'Akatsuki Shadows',
    category: 'Accessories & Jewelry',
    category_name: 'Accessories & Jewelry',
    color: 'Obsidian Black',
    sizes: ['Free Size'],
    tag: 'FULL-GRAIN LEATHER',
    priceInr: 4499,
    priceRyo: 6900,
    stock: 35,
    seal: '鞘',
    desc: 'Full-grain oiled black cowhide tactical thigh holster with reinforced quick-draw slots and matte black military alloy buckles.',
    specs: 'Full-Grain Black Cowhide · Alloy Buckles · Adjustable Straps',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
  },

  // Collection 2: Uchiha Heritage
  {
    sku: 'leaf-protector',
    id: 'leaf-protector',
    name: 'Rogue Leaf Forehead Protector',
    collection: 'heritage',
    collectionName: 'Uchiha Heritage',
    category: 'Relics',
    tag: 'COLD-FORGED STEEL',
    priceInr: 5299,
    priceRyo: 8200,
    stock: 15,
    seal: '護',
    desc: 'Hand-carved stainless steel forehead protector bearing the engraved slash through the Leaf village crest on an obsidian fabric band.',
    specs: 'Brushed Steel · Indigo Cotton Band · Battle Scored Finish',
    images: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
      'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
    ]
  },
  {
    sku: 'mangekyo-print',
    id: 'mangekyo-print',
    name: 'Mangekyo Optical Art Print',
    collection: 'heritage',
    collectionName: 'Uchiha Heritage',
    category: 'Craft',
    tag: 'ARCHIVAL LENTICULAR',
    priceInr: 4299,
    priceRyo: 6500,
    stock: 22,
    seal: '眼',
    desc: 'Museum-grade 3-phase lenticular print transitioning between 3-Tomoe Sharingan and Itachi’s triangular pinwheel Mangekyo depending on viewer angle.',
    specs: 'Archival 380gsm Paper · 18 × 24 in · Foil Stamped Certificate',
    images: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
      'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80'
    ]
  },
  {
    sku: 'uchiha-wax-seal',
    id: 'uchiha-wax-seal',
    name: 'Official Emblem Brass Wax Seal Kit',
    collection: 'heritage',
    collectionName: 'Uchiha Heritage',
    category: 'Craft',
    tag: 'SOLID MACHINED BRASS',
    priceInr: 3199,
    priceRyo: 4800,
    stock: 30,
    seal: '印',
    desc: 'Solid machined brass sealing stamp bearing the iconic Uchiha paper fan crest. Includes 3 sticks of matte vermilion sealing wax.',
    specs: 'Machined Solid Brass · 3 Vermilion Wax Sticks · Wooden Box',
    images: [
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
      'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80'
    ]
  },
  {
    sku: 'tessen-fan',
    id: 'tessen-fan',
    name: 'Fire Style Cold-Forged Iron Tessen',
    collection: 'heritage',
    collectionName: 'Uchiha Heritage',
    category: 'Armory',
    tag: 'WAR COMBAT FAN',
    priceInr: 8999,
    priceRyo: 14000,
    stock: 8,
    seal: '扇',
    desc: 'Traditional war fan constructed from hardened black steel ribs and waxed heavyweight washi canvas depicting the Great Fireball.',
    specs: 'Forged High-Carbon Steel · Waxed Canvas · 11.5 in Folded',
    images: [
      'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=800&q=80',
      'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80'
    ]
  },

  // Collection 3: Crow Genjutsu & Sagecraft
  {
    sku: 'crow-burner',
    id: 'crow-burner',
    name: 'Crow Genjutsu Incense Burner',
    collection: 'genjutsu',
    collectionName: 'Crow Genjutsu',
    category: 'Craft',
    tag: 'HANDCRAFTED CERAMIC',
    priceInr: 6499,
    priceRyo: 9800,
    stock: 14,
    seal: '鴉',
    desc: 'Sculpted matte black stoneware crow burner. Backflow smoke pours down through the raven folded wings. Includes 20 cones of Hinoki cedar incense.',
    specs: 'High-Fired Stoneware · Matte Carbon Finish · 20x Hinoki Cones',
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
      'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=800&q=80',
      'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
    ]
  },
  {
    sku: 'amaterasu-beads',
    id: 'amaterasu-beads',
    name: 'Amaterasu Obsidian Prayer Beads',
    collection: 'genjutsu',
    collectionName: 'Crow Genjutsu',
    category: 'Relics',
    tag: 'VOLCANIC OBSIDIAN',
    priceInr: 3499,
    priceRyo: 5400,
    stock: 28,
    seal: '珠',
    desc: '108 natural matte black volcanic obsidian beads strung on reinforced silk cord, accented with an engraved emblem marker and crimson tassel.',
    specs: '8mm Natural Volcanic Stone · Crimson Silk · Laser-Etched Guru Bead',
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
      'https://images.unsplash.com/photo-1611591475837-775107936a18?w=800&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
      'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'
    ]
  },
  {
    sku: 'tsukuyomi-teacup',
    id: 'tsukuyomi-teacup',
    name: 'Tsukuyomi Midnight Ceramic Teacup',
    collection: 'genjutsu',
    collectionName: 'Crow Genjutsu',
    category: 'Craft',
    tag: 'WOOD-FIRED CERAMIC',
    priceInr: 2999,
    priceRyo: 4600,
    stock: 19,
    seal: '盃',
    desc: 'Handmade Tenmoku glaze ceramic cup fired in wood kilns. Iridescent iron oil spots appear like red stars inside black genjutsu skies.',
    specs: 'Kyoto Stoneware · Hand-Thrown · 180ml Capacity',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
      'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
      'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80'
    ]
  },
  {
    sku: 'crow-quill',
    id: 'crow-quill',
    name: 'Crow Quill & Vermilion Ink Set',
    collection: 'genjutsu',
    collectionName: 'Crow Genjutsu',
    category: 'Craft',
    tag: 'NATURAL FEATHER QUILL',
    priceInr: 2499,
    priceRyo: 3700,
    stock: 25,
    seal: '筆',
    desc: 'Natural iridescent black raven flight feather hand-cut for fine kanji calligraphy, paired with archival vermilion red mineral ink bottle.',
    specs: 'Genuine Raven Quill · 30ml Vermilion Ink · Wax Stopper',
    images: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80',
      'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&q=80',
      'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80'
    ]
  },

  // Collection 4: Shinobi Armory
  {
    sku: 'shadow-shuriken',
    id: 'shadow-shuriken',
    name: 'Shadow Windmill Shuriken (4-Pack)',
    collection: 'armory',
    collectionName: 'Shinobi Armory',
    category: 'Armory',
    tag: 'BLUED 440C STEEL',
    priceInr: 3999,
    priceRyo: 6100,
    stock: 40,
    seal: '手',
    desc: 'Precision-balanced 4-point aerodynamic throwing stars machined from blued 440C stainless steel with matte glare-free finish.',
    specs: '440C Stainless Steel · 4-Pack · Ballistic Nylon Case',
    images: [
      'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800&q=80',
      'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
      'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'
    ]
  },
  {
    sku: 'spring-tanto',
    id: 'spring-tanto',
    name: 'Concealed Tanto Dagger Replica',
    collection: 'armory',
    collectionName: 'Shinobi Armory',
    category: 'Armory',
    tag: 'ANBU SHORT BLADE',
    priceInr: 9999,
    priceRyo: 15800,
    stock: 10,
    seal: '刀',
    desc: 'Straight-edge display replica dagger featuring black ray-skin handle wrap, blackened brass habaki collar, and matte wooden scabbard.',
    specs: '1045 Carbon Steel (Unsharpened) · Ray Skin Wrap · 11 in',
    images: [
      'https://images.unsplash.com/photo-1590422749897-478a87679905?w=800&q=80',
      'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800&q=80',
      'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
      'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80'
    ]
  },
  {
    sku: 'wire-trap-reel',
    id: 'wire-trap-reel',
    name: 'High-Tensile Steel Wire Trap Spool',
    collection: 'armory',
    collectionName: 'Shinobi Armory',
    category: 'Armory',
    tag: 'MICRO-BRAIDED WIRE',
    priceInr: 2699,
    priceRyo: 4100,
    stock: 50,
    seal: '線',
    desc: '50-meter spool of ultra-thin micro-braided black stainless steel wire designed for shuriken trajectory guidance and perimeter rigging.',
    specs: 'Micro-Braided Steel · 50m Length · Friction Reel Spool',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
    ]
  },
  {
    sku: 'smoke-scroll',
    id: 'smoke-scroll',
    name: 'Crow Smoke Bomb Requisition',
    collection: 'armory',
    collectionName: 'Shinobi Armory',
    category: 'Armory',
    tag: 'SMOKE EXPLOSIVE CASK',
    priceInr: 2799,
    priceRyo: 4300,
    stock: 35,
    seal: '煙',
    desc: 'Set of six sealed spherical clay cartridges filled with non-toxic black pine smoke powder and crow feather scent for genjutsu escape.',
    specs: 'Clay Shells · 6 Cartridges · Sealed Wooden Cask',
    images: [
      'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=800&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
      'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80',
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80'
    ]
  }
];

// Helper to normalize product format (preserving strictly real Zoho inventory data)
function normalizeProduct(p) {
  const sku = p.sku || p.id || '';
  let priceInr = Number(p.priceInr || p.price || p.rate || 0);
  
  // Format images array
  let images = [];
  if (Array.isArray(p.images) && p.images.length > 0) {
    images = p.images.filter(url => typeof url === 'string' && url.trim().length > 0);
  } else if (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0) {
    images = [p.imageUrl.trim()];
  }

  const originalMrp = (p.originalMrp && Number(p.originalMrp) > priceInr)
    ? Number(p.originalMrp)
    : (p.originalPrice && Number(p.originalPrice) > priceInr ? Number(p.originalPrice) : null);

  const hasDiscount = Boolean(originalMrp && originalMrp > priceInr);
  const discountPercent = hasDiscount ? Math.round(((originalMrp - priceInr) / originalMrp) * 100) : 0;
  const description = p.description || p.purchase_description || '';

  return {
    ...p,
    sku,
    id: sku, // preserve id alias for backwards compatibility
    priceInr,
    price: priceInr,
    originalMrp,
    originalPrice: originalMrp,
    hasDiscount,
    discountPercent,
    description,
    purchase_description: p.purchase_description || '',
    unit: p.unit || '',
    category_name: p.category_name || 'T-Shirt',
    category: (p.category_name || 't-shirt').toLowerCase(),
    collectionName: (p.name && p.name.toLowerCase().includes('minato')) ? 'Minato' : (p.collectionName || 'Official Collection'),
    collection: ((p.name && p.name.toLowerCase().includes('minato')) ? 'minato' : (p.collection || 'official-collection')).toLowerCase(),
    images,
    imageUrl: images[0] || ''
  };
}

// Products & Orders are managed via Zoho Inventory
// Coupons & Newsletter Subscribers are stored in local persistent cache

const DEFAULT_COUPONS = [
  // ── GROUP 1: PERCENTAGE DISCOUNTS (%) ──
  {
    code: 'STREET10',
    title: '10% Off Entire Order',
    desc: 'Enjoy 10% instant discount on orders from ₹1,500 to ₹8,000.',
    group: 'percentage',
    type: 'percentage',
    value: 10, // 10%
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
    value: 15, // 15%
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
    value: 20, // 20%
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
    value: 25, // 25%
    minOrderValue: 8000,
    maxOrderValue: null,
    maxDiscount: 6000,
    isPublic: true,
    badge: '25% OFF',
    status: 'active'
  },

  // ── GROUP 2: FLAT DISCOUNTS (₹) ──
  {
    code: 'UCHIHA200',
    title: 'Flat ₹200 Welcome Offer',
    desc: 'Flat ₹200 off on shopping cart from ₹1,000 to ₹6,000.',
    group: 'flat',
    type: 'flat',
    value: 200, // ₹200
    minOrderValue: 1000,
    maxOrderValue: 6000,
    maxDiscount: 200,
    isPublic: true,
    badge: 'FLAT ₹200',
    status: 'active'
  },
  {
    code: 'ITACHI500',
    title: 'Flat ₹500 First Order Discount',
    desc: 'Flat ₹500 instant discount on orders from ₹3,000 to ₹20,000.',
    group: 'flat',
    type: 'flat',
    value: 500, // ₹500
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
    value: 1000, // ₹1,000
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
    value: 1500, // ₹1,500
    minOrderValue: 10000,
    maxOrderValue: null,
    maxDiscount: 1500,
    isPublic: true,
    badge: 'FLAT ₹1,500',
    status: 'active'
  },

  // ── INACTIVE / PRIVATE COUPONS ──
  // If inactive or not marked as public: cannot be used and never suggested!
  {
    code: 'SECRET300',
    title: 'Classified ANBU Operative Seal',
    desc: 'Covert seal (inactive & private until released to public).',
    group: 'flat',
    type: 'flat',
    value: 300,
    minOrderValue: 1800,
    maxOrderValue: null,
    maxDiscount: 300,
    isPublic: false,
    badge: 'INACTIVE',
    status: 'inactive'
  },
  {
    code: 'ANBU30',
    title: 'Private ANBU 30% Pass',
    desc: 'Confidential pass (inactive & private until released to public).',
    group: 'percentage',
    type: 'percentage',
    value: 30,
    minOrderValue: 4000,
    maxOrderValue: null,
    maxDiscount: 3000,
    isPublic: false,
    badge: 'INACTIVE',
    status: 'inactive'
  }
];

function validateCouponLogic(coupon, subtotalInr) {
  if (!coupon) {
    return {
      valid: false,
      reason: 'not_found',
      message: '❌ Coupon code not found. Please verify the code and try again.'
    };
  }

  // If marked as inactive, cannot be used!
  if (coupon.status !== 'active') {
    return {
      valid: false,
      reason: 'inactive',
      message: `❌ Coupon "${coupon.code}" is currently inactive and cannot be used.`
    };
  }

  // If not marked as public, cannot be used until marked as public!
  if (coupon.isPublic !== true) {
    return {
      valid: false,
      reason: 'not_public',
      message: `❌ Coupon "${coupon.code}" cannot be used until it is marked as public.`
    };
  }

  const subtotal = Math.max(0, Number(subtotalInr) || 0);

  // Check minimum order value range
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    const diff = coupon.minOrderValue - subtotal;
    return {
      valid: false,
      reason: 'min_order_unmet',
      minOrderValue: coupon.minOrderValue,
      missingAmount: diff,
      message: `⚠️ Coupon "${coupon.code}" requires a minimum order of ₹${coupon.minOrderValue.toLocaleString('en-IN')}. Your cart is ₹${subtotal.toLocaleString('en-IN')}. Add ₹${diff.toLocaleString('en-IN')} more to unlock!`
    };
  }

  // Check maximum order value range
  if (coupon.maxOrderValue && subtotal > coupon.maxOrderValue) {
    return {
      valid: false,
      reason: 'max_order_exceeded',
      maxOrderValue: coupon.maxOrderValue,
      message: `⚠️ Coupon "${coupon.code}" is only applicable for orders up to ₹${coupon.maxOrderValue.toLocaleString('en-IN')}. Your current cart is ₹${subtotal.toLocaleString('en-IN')}.`
    };
  }

  // Calculate discount based on group/type
  let discount = 0;
  if (coupon.group === 'percentage' || coupon.type === 'percentage') {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    // Flat cash discount
    discount = Number(coupon.value) || 0;
  }
  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    code: coupon.code,
    title: coupon.title,
    group: coupon.group || 'flat',
    type: coupon.type || 'flat',
    value: coupon.value,
    discount,
    minOrderValue: coupon.minOrderValue,
    maxOrderValue: coupon.maxOrderValue,
    message: `You have saved ₹${discount.toLocaleString('en-IN')} on this order.`
  };
}

// Local persistent coupons store
const COUPONS_CACHE_FILE = path.join(__dirname, 'coupons_cache.json');
let inMemoryCoupons = loadJsonCache(COUPONS_CACHE_FILE, null);
if (!Array.isArray(inMemoryCoupons) || inMemoryCoupons.length === 0) {
  inMemoryCoupons = [...DEFAULT_COUPONS];
  saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);
}

// ──────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────

// Direct download endpoint for Netlify .env file
app.get(['/api/download-env', '/api/env'], (req, res) => {
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
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=".env"');
  res.send(envContent);
});

// Direct download endpoint for zoho_inventory_cache.json
app.get(['/api/download-zoho-cache', '/api/download-cache', '/api/zoho-cache-file'], (req, res) => {
  const cachePath = path.join(__dirname, 'zoho_inventory_cache.json');
  if (fs.existsSync(cachePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zoho_inventory_cache.json"');
    return res.sendFile(cachePath);
  }
  return res.status(404).json({ error: 'zoho_inventory_cache.json file not found' });
});

// System Status endpoint
app.get('/api/db-status', (req, res) => {
  const zohoStatus = zohoInventory.getStatus();
  res.json({
    status: 'connected',
    engine: 'Zoho Inventory & Local Storage',
    zohoConfigured: zohoStatus.configured,
    zohoCachedItems: zohoStatus.cachedItemsCount,
    couponsCount: inMemoryCoupons.length,
    currency: 'INR',
    message: 'System operational. Products and Orders are integrated directly with Zoho Inventory.'
  });
});

// ──────────────────────────────────────────
// COUPONS API ROUTES
// ──────────────────────────────────────────

// GET /api/coupons
app.get('/api/coupons', (req, res) => {
  const subtotal = req.query.subtotal ? Math.max(0, Number(req.query.subtotal) || 0) : null;
  const showAll = req.query.all === 'true';

  const list = showAll ? inMemoryCoupons : inMemoryCoupons.filter(c => c.isPublic && c.status === 'active');

  // Normalize and enhance each coupon with user subtotal matching details
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
      if (max && subtotal > max) {
        matchesPriceRange = false;
      }

      if (c.group === 'percentage' || c.type === 'percentage') {
        calculatedDiscount = Math.round((subtotal * c.value) / 100);
        if (c.maxDiscount && calculatedDiscount > c.maxDiscount) {
          calculatedDiscount = c.maxDiscount;
        }
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

  const percentageCoupons = enhanced.filter(c => c.group === 'percentage');
  const flatCoupons = enhanced.filter(c => c.group === 'flat');

  res.json({
    success: true,
    source: 'memory_cache',
    subtotal: subtotal !== null ? subtotal : undefined,
    count: enhanced.length,
    groups: {
      percentage: percentageCoupons,
      flat: flatCoupons
    },
    coupons: enhanced
  });
});

// POST /api/coupons/validate
// Validates a typed or selected coupon code against user subtotal
app.post('/api/coupons/validate', async (req, res) => {
  const { code, subtotal } = req.body || {};
  const rawCode = (code || '').trim().toUpperCase();
  const subtotalInr = Math.max(0, Number(subtotal) || 0);

  if (!rawCode) {
    return res.status(400).json({
      valid: false,
      reason: 'empty_code',
      message: '❌ Please enter a coupon code.'
    });
  }

  const matchedCoupon = inMemoryCoupons.find(c => c.code.toUpperCase() === rawCode);

  if (!matchedCoupon) {
    return res.json({
      valid: false,
      reason: 'not_found',
      message: `❌ Coupon "${rawCode}" does not exist. Please check your spelling and try again.`
    });
  }

  const result = validateCouponLogic(matchedCoupon, subtotalInr);
  return res.json(result);
});

// POST /api/coupons (Admin add / update coupon)
app.post('/api/coupons', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'itachi-admin-secret-2026';
  if (adminKey !== expectedKey) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }

  try {
    const data = req.body || {};
    const rawCode = (data.code || '').trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: 'Coupon code is required.' });

    const group = (data.group === 'percentage' || data.type === 'percentage') ? 'percentage' : 'flat';
    const value = Number(data.value);
    if (!value || isNaN(value) || value <= 0) {
      return res.status(400).json({ error: 'Valid discount value is required.' });
    }

    const doc = {
      code: rawCode,
      title: data.title || (group === 'percentage' ? `${value}% Off` : `Flat ₹${value} Off`),
      desc: data.desc || `Discount on orders matching price range`,
      group,
      type: group,
      value,
      minOrderValue: Number(data.minOrderValue) || 0,
      maxOrderValue: data.maxOrderValue ? Number(data.maxOrderValue) : null,
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
      isPublic: data.isPublic !== false,
      badge: data.badge || (group === 'percentage' ? `${value}% OFF` : `FLAT ₹${value}`),
      status: data.status || 'active',
      updatedAt: new Date()
    };

    const idx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === rawCode);
    if (idx >= 0) {
      inMemoryCoupons[idx] = { ...inMemoryCoupons[idx], ...doc };
    } else {
      inMemoryCoupons.push(doc);
    }
    saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);

    res.json({ success: true, message: `Coupon "${rawCode}" saved successfully.`, coupon: doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save coupon', message: err.message });
  }
});

// DELETE /api/coupons/:code (Admin delete coupon)
app.delete('/api/coupons/:code', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'itachi-admin-secret-2026';
  if (adminKey !== expectedKey) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }

  try {
    const rawCode = (req.params.code || '').trim().toUpperCase();
    inMemoryCoupons = inMemoryCoupons.filter(c => c.code.toUpperCase() !== rawCode);
    saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);
    res.json({ success: true, message: `Coupon "${rawCode}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon', message: err.message });
  }
});

// Products: List all (powered in real-time by Zoho Inventory & Streetwear Catalog)
const handleListProducts = async (req, res) => {
  let zohoItems = [];
  let zohoCats = { categories: [], collections: [] };

  if (zohoInventory.isZohoConfigured()) {
    try {
      const [zohoResult, catsResult] = await Promise.all([
        zohoInventory.fetchZohoItems().catch(() => null),
        zohoInventory.fetchZohoCategories().catch(() => ({ categories: [], collections: [] }))
      ]);

      if (zohoResult && Array.isArray(zohoResult.items) && zohoResult.items.length > 0) {
        zohoItems = zohoResult.items;
      } else if (zohoInventory.tokenState && Array.isArray(zohoInventory.tokenState.cachedItems)) {
        zohoItems = zohoInventory.tokenState.cachedItems;
      }
      if (catsResult) zohoCats = catsResult;
    } catch (zohoErr) {
      console.warn('[Zoho Inventory] Real-time sync notice:', zohoErr.message);
    }
  }

  // Combine Zoho items first, then DEFAULT_PRODUCTS for any remaining catalog items
  const combined = [...zohoItems];
  const seenSkus = new Set(zohoItems.map(i => (i.sku || i.id || '').toLowerCase()));
  for (const p of DEFAULT_PRODUCTS) {
    if (!seenSkus.has((p.sku || p.id || '').toLowerCase())) {
      combined.push(p);
    }
  }

  const normalized = combined.map(normalizeProduct);

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'oversized-t-shirts', name: 'Oversized T-Shirts' },
    { id: 'classic-t-shirts', name: 'Classic T-Shirts' },
    { id: 'hoodies', name: 'Hoodies & Sweatshirts' },
    { id: 'jackets', name: 'Jackets & Outerwear' },
    { id: 'cargo-pants', name: 'Cargo Pants & Joggers' },
    { id: 'accessories', name: 'Accessories & Jewelry' }
  ];

  const collections = [
    { id: 'all', name: 'All Collections' },
    { id: 'minato', name: 'Minato Namikaze' },
    { id: 'akatsuki', name: 'Akatsuki Shadows' },
    { id: 'uchiha', name: 'Uchiha Clan' },
    { id: 'street-core', name: 'Street Core' },
    { id: 'armory', name: 'Shinobi Armory' }
  ];

  return res.json({
    source: zohoItems.length > 0 ? 'zoho_inventory' : 'street_co_catalog',
    organization_id: zohoInventory.config.orgId,
    count: normalized.length,
    products: normalized,
    categories,
    collections,
    lastSync: new Date().toISOString()
  });
};
app.get('/api/products', handleListProducts);
app.get('/api/shop', handleListProducts);

app.get('/api/zoho-inventory/categories', async (req, res) => {
  try {
    const cats = await zohoInventory.fetchZohoCategories();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Products: Add or update (Admin only)
const handleSaveProduct = async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'itachi-admin-secret-2026';
  if (adminKey !== expectedKey) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }

  res.json({
    success: true,
    message: 'Products are managed in Zoho Inventory. Please add or update items in Zoho Inventory to sync automatically with the store.'
  });
};
app.post('/api/products', handleSaveProduct);
app.post('/api/shop', handleSaveProduct);

// Products: Delete a product by SKU (Admin only)
const handleDeleteProduct = async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'itachi-admin-secret-2026';
  if (adminKey !== expectedKey) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }

  res.json({
    success: true,
    message: 'Products are managed in Zoho Inventory. Delete or mark inactive in Zoho Inventory to remove from the store.'
  });
};
app.delete('/api/products/:sku', handleDeleteProduct);
app.delete('/api/shop/:sku', handleDeleteProduct);

// Local file-backed orders cache
const ORDERS_CACHE_FILE = path.join(__dirname, 'orders_cache.json');
const savedOrdersList = loadJsonCache(ORDERS_CACHE_FILE, []);
const inMemoryOrders = new Map();
if (Array.isArray(savedOrdersList)) {
  for (const ord of savedOrdersList) {
    if (ord && ord.orderCode) inMemoryOrders.set(ord.orderCode, ord);
    if (ord && ord.orderId) inMemoryOrders.set(ord.orderId, ord);
  }
}
function persistOrders() {
  saveJsonCache(ORDERS_CACHE_FILE, Array.from(new Set(inMemoryOrders.values())));
}

// Orders: Save checkout order with complete user details, product details, delivery, and payment
app.post('/api/orders', async (req, res) => {
  try {
    const raw = req.body || {};
    const now = new Date();

    const orderCode = (raw.orderCode || `UCHIHA-${Math.floor(10000 + Math.random() * 90000)}`).toUpperCase();
    const orderId = (raw.orderId || ('ITA-' + Math.random().toString(36).substring(2, 8).toUpperCase())).toUpperCase();

    // 1. Comprehensive User & Contact Details
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

    const isB2BOrder = Boolean(raw.isB2B || rawUser.isB2B);
    const customerGstin = (raw.gstin || rawUser.gstin || '').trim().toUpperCase();

    const contactDetails = {
      fullName,
      phone,
      email,
      pincode,
      isB2B: isB2BOrder,
      gstin: customerGstin
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
      isB2B: isB2BOrder,
      gstin: customerGstin,
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
        collectionName: p.collectionName || 'Official Collection',
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

    // 5. Clean Order Document (Zero redundant duplicate keys)
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

      // B2B & GSTIN Information
      isB2B: isB2BOrder,
      gstin: customerGstin,

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

    // Cache in memory and file for instant lookup
    inMemoryOrders.set(orderCode, orderDocument);
    inMemoryOrders.set(orderId, orderDocument);
    persistOrders();

    // Automated Zoho Inventory Sales Order Push
    let zohoSalesOrderResult = null;
    try {
      zohoSalesOrderResult = await zohoInventory.createSalesOrder(orderDocument);
      if (zohoSalesOrderResult && zohoSalesOrderResult.success) {
        orderDocument.zoho_salesorder_id = zohoSalesOrderResult.zoho_salesorder_id;
        orderDocument.zoho_salesorder_number = zohoSalesOrderResult.zoho_salesorder_number;
      }
    } catch (zohoOrderErr) {
      console.warn('[Zoho Inventory] Sales order sync notice:', zohoOrderErr.message);
      zohoSalesOrderResult = { success: false, error: zohoOrderErr.message };
    }

    // Automated Zoho Indian GST Tax Invoice Creation
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
      console.warn('[Zoho GST Invoice Notice]', invErr.message);
      zohoInvoiceResult = { success: false, error: invErr.message };
    }

    const hostOrigin = `${req.protocol}://${req.get('host')}`;

    // Automated Dispatches in Parallel (SMS + Order Confirmation Email + Dedicated GST Tax Invoice Email)
    const [smsDispatchResult, emailDispatchResult, invoiceEmailResult] = await Promise.all([
      sendOrderConfirmationSms(orderDocument, hostOrigin).catch(smsErr => {
        console.warn('[Twilio] Background SMS attempt error:', smsErr.message);
        return { success: false, error: smsErr.message };
      }),
      sendOrderConfirmationEmailSendGrid(orderDocument, hostOrigin).catch(emailErr => {
        console.warn('[Email] Background Order Confirmation attempt error:', emailErr.message);
        return { success: false, error: emailErr.message };
      }),
      sendGstTaxInvoiceEmail(orderDocument, hostOrigin).catch(invEmailErr => {
        console.warn('[Email] Background GST Tax Invoice attempt error:', invEmailErr.message);
        return { success: false, error: invEmailErr.message };
      })
    ]);

    res.json({
      success: true,
      orderCode: orderDocument.orderCode,
      orderId: orderDocument.orderId,
      order: orderDocument,
      zohoSalesOrder: zohoSalesOrderResult,
      zohoInvoice: zohoInvoiceResult,
      invoiceUrl: orderDocument.invoiceUrl || `/invoice/${orderDocument.orderCode}`,
      sms: smsDispatchResult,
      email: emailDispatchResult,
      invoiceEmail: invoiceEmailResult,
      message: 'Order created, Sales Order registered, and both Order Confirmation & GST Tax Invoice emails dispatched separately.'
    });
  } catch (err) {
    console.error('[Server] Order processing error:', err);
    res.status(500).json({ error: 'Order processing error', detail: err.message });
  }
});

// Endpoint to trigger or resend GST Tax Invoice Email for an order
app.post('/api/orders/:code/send-invoice-email', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const order = inMemoryOrders.get(code);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const hostOrigin = `${req.protocol}://${req.get('host')}`;
  const result = await sendGstTaxInvoiceEmail(order, hostOrigin);
  res.json({ success: true, result });
});

// Orders: Get single order by orderCode or orderId (from memory/cache & Zoho)
app.get('/api/orders/:code', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const cached = inMemoryOrders.get(code);
  if (cached) {
    return res.json({ success: true, order: cached, source: 'cache' });
  }

  res.status(404).json({ success: false, error: 'Order not found' });
});

// Twilio SMS: Status & configuration check
app.get('/api/twilio-status', (req, res) => {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const phone = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const isConfigured = Boolean(sid && token && phone);

  res.json({
    success: true,
    configured: isConfigured,
    accountSidMasked: sid ? `${sid.slice(0, 6)}...${sid.slice(-4)}` : null,
    phoneNumber: phone || null,
    hasAuthToken: Boolean(token),
    instructions: isConfigured
      ? 'Twilio SMS service is actively configured and ready to dispatch order notifications.'
      : 'Twilio SMS credentials missing. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.'
  });
});

// Twilio SMS: Trigger order SMS manually or test dispatch
app.post('/api/send-order-sms', async (req, res) => {
  try {
    const { orderCode, orderId, phone, customerName, totalAmount, customMessage } = req.body || {};
    const code = (orderCode || orderId || '').trim().toUpperCase();

    let targetOrder = null;
    if (code && inMemoryOrders.has(code)) {
      targetOrder = inMemoryOrders.get(code);
    }

    // If order found, send confirmation SMS for it
    if (targetOrder) {
      const hostOrigin = `${req.protocol}://${req.get('host')}`;
      const result = await sendOrderConfirmationSms(targetOrder, hostOrigin);
      return res.json(result);
    }

    // Direct ad-hoc message or test dispatch
    if (phone) {
      const client = getTwilioClient();
      const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER).trim();

      if (!client || !fromNumber) {
        return res.status(400).json({
          success: false,
          configured: false,
          error: 'Twilio credentials not configured in environment.'
        });
      }

      const formattedPhone = formatToE164Phone(phone);
      const cleanAmt = String(totalAmount || '0').replace(/[,\s]/g, '');
      const cleanCode = String(code || '334862').replace(/^#/, '');
      const text = customMessage || `Hi ${customerName || 'Customer'}, thank you for ordering from THE STREET CO! Order #${cleanCode} for ₹${cleanAmt} is confirmed and being processed. Track: https://www.delhivery.com/tracking`;

      const message = await client.messages.create({
        body: text,
        from: fromNumber,
        to: formattedPhone
      });

      return res.json({
        success: true,
        sid: message.sid,
        status: message.status,
        to: formattedPhone
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Please provide either a valid orderCode or a recipient phone number.'
    });
  } catch (err) {
    console.error('[Twilio] Send order SMS endpoint error:', err.message);
    res.status(500).json({ success: false, error: err.message, code: err.code });
  }
});

// Orders: Get list for admin
app.get('/api/orders', async (req, res) => {
  res.json({ success: true, orders: Array.from(inMemoryOrders.values()) });
});

// Helper to format consistent date and time across ISO, UTC, and IST
function formatSubscriberDateTime(d = new Date()) {
  const dateObj = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
  const iso = dateObj.toISOString();
  const date = iso.slice(0, 10); // "YYYY-MM-DD"
  const time = iso.slice(11, 19); // "HH:mm:ss" UTC

  const dateFormatted = dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }); // e.g. "24 Sep 2026"

  const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }); // e.g. "09:35:00 PM"

  return {
    date,
    time,
    dateTime: iso,
    dateFormatted,
    timeFormatted,
    istDateTime: `${dateFormatted}, ${timeFormatted} IST`,
    timestamp: dateObj.getTime()
  };
}

// Local JSON backup path to guarantee persistent newsletter storage
const SUBSCRIBERS_BACKUP_PATH = path.join(__dirname, 'newsletter_subscribers.json');

function saveSubscriberToFileBackup(subscriber) {
  try {
    let list = [];
    if (fs.existsSync(SUBSCRIBERS_BACKUP_PATH)) {
      try {
        const raw = fs.readFileSync(SUBSCRIBERS_BACKUP_PATH, 'utf8');
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch (_) {
        list = [];
      }
    }
    const idx = list.findIndex(item => item.email === subscriber.email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...subscriber, updatedAt: new Date().toISOString() };
    } else {
      list.push(subscriber);
    }
    fs.writeFileSync(SUBSCRIBERS_BACKUP_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Backup] Error saving newsletter subscriber to file:', err.message);
  }
}

// Newsletter: Subscribe to Raven Intelligence Network (saves email + date + time in local storage)
const inMemorySubscribers = new Set();
if (fs.existsSync(SUBSCRIBERS_BACKUP_PATH)) {
  try {
    const list = JSON.parse(fs.readFileSync(SUBSCRIBERS_BACKUP_PATH, 'utf8'));
    if (Array.isArray(list)) {
      list.forEach(s => { if (s && s.email) inMemorySubscribers.add(s.email.toLowerCase()); });
    }
  } catch (_) {}
}

app.post('/api/newsletter', (req, res) => {
  const { email, clientDate, clientTime } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid safehouse email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid safehouse email format.' });
  }

  const isNew = !inMemorySubscribers.has(cleanEmail);
  inMemorySubscribers.add(cleanEmail);

  const now = new Date();
  const dt = formatSubscriberDateTime(now);

  const subscriberDocument = {
    email: cleanEmail,
    date: dt.date,
    time: dt.time,
    dateTime: dt.dateTime,
    dateFormatted: dt.dateFormatted,
    timeFormatted: dt.timeFormatted,
    istDateTime: dt.istDateTime,
    timestamp: dt.timestamp,
    clientDate: clientDate || null,
    clientTime: clientTime || null,
    subscribedAt: now,
    createdAt: now,
    updatedAt: now,
    status: 'ACTIVE',
    memberTier: 'RAVEN_NETWORK',
    welcomeCreditInr: 500,
    source: 'footer_newsletter_form',
    submissionCount: 1
  };

  saveSubscriberToFileBackup(subscriberDocument);

  return res.json({
    success: true,
    isNew,
    email: cleanEmail,
    date: dt.date,
    time: dt.time,
    dateFormatted: dt.dateFormatted,
    timeFormatted: dt.timeFormatted,
    istDateTime: dt.istDateTime,
    savedToDatabase: true,
    message: isNew
      ? 'Subscription complete. You have been enrolled into the VIP Network. ₹500 welcome credit activated!'
      : 'Your email is already subscribed to VIP dispatches. Updates will continue as scheduled.'
  });
});

// Newsletter: Get all subscribers with date and time
app.get(['/api/newsletter', '/api/newsletter/subscribers', '/api/newsletters'], (req, res) => {
  if (fs.existsSync(SUBSCRIBERS_BACKUP_PATH)) {
    try {
      const raw = fs.readFileSync(SUBSCRIBERS_BACKUP_PATH, 'utf8');
      const list = JSON.parse(raw);
      return res.json({
        success: true,
        count: list.length,
        subscribers: list
      });
    } catch (_) {}
  }

  return res.json({
    success: true,
    count: inMemorySubscribers.size,
    subscribers: Array.from(inMemorySubscribers).map(email => ({
      email,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      status: 'ACTIVE'
    })),
    source: 'memory_cache'
  });
});

// Support Inquiries & Concierge Tickets System
const SUPPORT_TICKETS_FILE = path.join(__dirname, 'support_tickets.json');
let inMemorySupportTickets = [];

try {
  if (fs.existsSync(SUPPORT_TICKETS_FILE)) {
    const rawTickets = fs.readFileSync(SUPPORT_TICKETS_FILE, 'utf8');
    inMemorySupportTickets = JSON.parse(rawTickets);
  }
} catch (_) {
  inMemorySupportTickets = [];
}

function persistSupportTickets(tickets) {
  try {
    fs.writeFileSync(SUPPORT_TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Support] Unable to persist tickets to disk:', err.message);
  }
}

// Handler for Client Contact & Support Inquiries
app.post(['/api/contact', '/api/support', '/api/contact-support'], async (req, res) => {
  try {
    const { name, email, phone, category, orderNumber, message } = req.body || {};

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanMessage = String(message || '').trim();
    const cleanCategory = String(category || 'General Support').trim();
    const cleanOrderNumber = String(orderNumber || '').trim();
    const cleanPhone = formatDisplayContactPhone(phone || '');

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Please provide your full name.' });
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (!cleanMessage || cleanMessage.length < 5) {
      return res.status(400).json({ success: false, error: 'Please provide a message of at least 5 characters.' });
    }

    const ticketId = `STREET-CARE-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const istTime = formatSubscriberDateTime(now);

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
      dateFormatted: istTime.dateFormatted,
      timeFormatted: istTime.timeFormatted,
      istDateTime: istTime.istDateTime,
      supportEmail: 'support@thestreetco.zohodesk.in',
      assignedDesk: 'Client Care Concierge'
    };

    inMemorySupportTickets.unshift(ticketRecord);
    if (inMemorySupportTickets.length > 500) inMemorySupportTickets.length = 500;
    persistSupportTickets(inMemorySupportTickets);

    // Attempt sending notification email to desk and user via Google Gmail SMTP
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
              <p style="margin:4px 0;"><strong>Logged At:</strong> ${istTime.istDateTime}</p>
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
        console.log(`[Support Mail] Gmail notification sent for ticket #${ticketId} to ${ZOHO_DESK_SUPPORT_EMAIL}`);
      } catch (mailErr) {
        console.warn(`[Support Mail] Notice for ticket #${ticketId}:`, mailErr.message);
      }
    }

    return res.json({
      success: true,
      ticketId,
      message: `Your inquiry has been received. Our team will contact you at ${cleanEmail} shortly.`,
      supportEmail: 'support@thestreetco.zohodesk.in',
      phone: '+91 6296731835',
      category: cleanCategory,
      orderNumber: cleanOrderNumber || null,
      savedToDatabase: true,
      createdAt: now.toISOString()
    });
  } catch (err) {
    console.error('[Support] Post handler error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to process support inquiry. Please mail support@thestreetco.zohodesk.in directly.',
      message: err.message
    });
  }
});

// Support: Get recent tickets
app.get(['/api/contact/tickets', '/api/support/tickets'], (req, res) => {
  return res.json({
    success: true,
    count: inMemorySupportTickets.length,
    tickets: inMemorySupportTickets
  });
});

// Google Analytics Measurement ID configuration endpoint
app.get('/api/analytics-config', (req, res) => {
  res.json({
    measurementId: GA_MEASUREMENT_ID,
    configured: GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX'
  });
});

// Route to upload and update compressed OG image
app.post('/api/upload-og-image', (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Missing imageBase64 payload' });
    }
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(imageBase64, 'base64');
    
    // Save compressed og-image.jpg
    const targetPath = path.join(__dirname, 'og-image.jpg');
    fs.writeFileSync(targetPath, buffer);

    console.log(`[OG-Image] Successfully saved ${buffer.length} bytes to ${targetPath}`);
    return res.json({
      success: true,
      message: 'OG image updated and saved successfully',
      sizeBytes: buffer.length,
      url: '/og-image.jpg?t=' + Date.now()
    });
  } catch (err) {
    console.error('[OG-Image] Upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ZOHO INVENTORY MANAGEMENT & SYNC ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Status & diagnostic check
app.get('/api/zoho-inventory/status', (req, res) => {
  res.json({
    success: true,
    zoho: zohoInventory.getStatus(),
    timestamp: new Date().toISOString()
  });
});

// Trigger full catalog sync from Zoho Inventory
app.post('/api/zoho-inventory/sync', async (req, res) => {
  try {
    const result = await zohoInventory.fetchZohoItems();
    res.json({
      success: result.success,
      source: result.source,
      count: result.count || 0,
      lastSync: result.lastSync,
      message: result.success
        ? `Successfully synchronized ${result.count} items from Zoho Inventory.`
        : (result.error || result.message || 'Unable to sync with Zoho Inventory')
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy Zoho Inventory Item Images with OAuth Token & Guaranteed Fallback
app.get('/api/zoho-inventory/items/:itemId/image', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (zohoInventory.isZohoConfigured()) {
      const token = await zohoInventory.getAccessToken();
      const url = `${zohoInventory.getApiBaseUrl()}/items/${itemId}/image?organization_id=${zohoInventory.config.orgId}`;
      const zohoRes = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      if (zohoRes.ok) {
        const contentType = zohoRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buffer = await zohoRes.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }
    }
  } catch (err) {
    console.warn('[Server Zoho Item Image Proxy Note]:', err.message);
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(getProductImageBuffer());
});

// Proxy Zoho Inventory Document Images & Guaranteed Fallback
app.get(['/api/zoho-inventory/documents/:docId', '/api/product-image'], async (req, res) => {
  try {
    const { docId } = req.params;
    if (docId && zohoInventory.isZohoConfigured()) {
      const token = await zohoInventory.getAccessToken();
      const url = `${zohoInventory.getApiBaseUrl()}/documents/${docId}?organization_id=${zohoInventory.config.orgId}`;
      const zohoRes = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      if (zohoRes.ok) {
        const contentType = zohoRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buffer = await zohoRes.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }
    }
  } catch (err) {
    console.warn('[Server Zoho Document Proxy Note]:', err.message);
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(getProductImageBuffer());
});

// Update or test Zoho Inventory configuration dynamically
app.post('/api/zoho-inventory/setup', (req, res) => {
  const { clientId, clientSecret, refreshToken, orgId, domain } = req.body || {};
  zohoInventory.updateZohoConfig({ clientId, clientSecret, refreshToken, orgId, domain });
  res.json({
    success: true,
    message: 'Zoho Inventory configuration updated.',
    status: zohoInventory.getStatus()
  });
});

// Exchange temporary code for permanent refresh token
app.post('/api/zoho-inventory/exchange-code', async (req, res) => {
  try {
    const { code, clientId, clientSecret, accountsDomain } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required.' });
    }
    const result = await zohoInventory.exchangeCodeForRefreshToken({ code, clientId, clientSecret, accountsDomain });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────
// ZOHO GST BILLING MANAGEMENT ROUTES
// ──────────────────────────────────────────

// Get current Indian GST Billing configuration
app.get('/api/zoho-inventory/gst-config', (req, res) => {
  res.json({
    success: true,
    gstConfig: zohoInventory.config,
    stateCodes: zohoInventory.GST_STATE_CODES
  });
});

// Update Indian GST Billing configuration
app.post('/api/zoho-inventory/gst-config', (req, res) => {
  const {
    sellerGstin,
    businessName,
    businessAddress,
    businessState,
    businessStateCode,
    defaultHsnCode,
    defaultGstRate,
    autoGenerateInvoice
  } = req.body || {};

  zohoInventory.updateZohoConfig({
    sellerGstin,
    businessName,
    businessAddress,
    businessState,
    businessStateCode,
    defaultHsnCode,
    defaultGstRate,
    autoGenerateInvoice
  });

  res.json({
    success: true,
    message: 'Indian GST Billing configuration updated.',
    status: zohoInventory.getStatus()
  });
});

// Instant GST calculation helper
app.post('/api/gst/calculate', (req, res) => {
  const { amount, state, isB2B, gstin, rate } = req.body || {};
  const breakdown = zohoInventory.calculateGstBreakdown({
    subtotalInr: Number(amount || 0),
    customerState: state,
    isB2B: Boolean(isB2B),
    gstin: gstin,
    customGstRate: rate ? Number(rate) : null
  });
  res.json({ success: true, ...breakdown });
});

// List all generated GST Tax Invoices
app.get('/api/invoices', (req, res) => {
  res.json({
    success: true,
    count: zohoInventory.getInvoicesList().length,
    invoices: zohoInventory.getInvoicesList()
  });
});

// View printable GST Tax Invoice HTML or stream official Zoho PDF for specific order
app.get(['/api/orders/:code/invoice', '/invoice/:code'], async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const order = inMemoryOrders.get(code);

  if (!order) {
    return res.status(404).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2>Order #${code} Not Found</h2>
        <p>The requested invoice could not be located. Please verify your order code.</p>
        <a href="/" style="color:#c0121f; font-weight:bold;">Return to Storefront</a>
      </div>
    `);
  }

  // Stream Official Zoho PDF rendered with "The Street Co" template
  if (req.query.pdf === 'true' || req.query.download === 'pdf' || req.headers.accept?.includes('application/pdf')) {
    const zohoInvoiceId = order.zoho_invoice_id || order.invoice_id;
    if (zohoInvoiceId && !String(zohoInvoiceId).startsWith('LOCAL-')) {
      try {
        const pdfBuf = await zohoInventory.fetchZohoInvoicePdf(zohoInvoiceId);
        if (pdfBuf) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="TheStreetCo-Invoice-${code}.pdf"`);
          return res.send(pdfBuf);
        }
      } catch (pdfErr) {
        console.warn('[PDF Delivery Error]:', pdfErr.message);
      }
    }
  }

  const invoiceHtml = zohoInventory.renderGstInvoiceHtml(order);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(invoiceHtml);
});

// Zoho Inventory Admin Setup Portal
app.get(['/zoho-inventory', '/zoho-inventory/', '/admin-zoho', '/admin-zoho/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-zoho.html'));
});

// Admin OG Image Tool Page
app.get('/admin-og', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-og.html'));
});

// Live Email Template Preview Page
app.get('/email-preview', (req, res) => {
  res.sendFile(path.join(__dirname, 'email-preview.html'));
});

// Progressive Web App (PWA) Manifest & Service Worker
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

app.get(['/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-192x192.png', '/pwa-maskable-512x512.png', '/apple-touch-icon.png'], (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, path.basename(req.path)));
});

// Serve index.html with dynamic Open Graph URLs tailored to current host (for accurate social previews on any domain)
function sendDynamicIndex(req, res) {
  const host = req.get('x-forwarded-host') || req.get('host') || 'itachii.netlify.app';
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;

  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  if (host && !host.includes('itachii.netlify.app')) {
    html = html.replaceAll('https://itachii.netlify.app', baseUrl);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

app.get(['/', '/index.html'], (req, res) => {
  sendDynamicIndex(req, res);
});

// Serve static files from root
app.use(express.static(__dirname, { index: false }));

// Fallback route for index.html
app.get('*', (req, res) => {
  sendDynamicIndex(req, res);
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
