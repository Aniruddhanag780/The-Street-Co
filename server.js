import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import * as zohoInventory from './zohoInventory.js';
import { getProductImageBuffer } from './productImage.js';
import {
  connectMongoDb,
  getMongoStatus,
  getCollection,
  findUserByPhone,
  upsertUserByPhone,
  changeUserPhone,
  appendOrderToUserAccount,
  findOrdersByAccountPhone,
  normalizeUserAddresses,
  getUserStreetCash,
  awardStreetCashForOrder,
  redeemStreetCashCoupon,
  findCouponInMongo,
  burnOneTimeCoupon,
  awardStreetCashBonus,
  syncUserOnboardingBonuses,
  STREET_CASH_BONUS_CONFIG
} from './mongoDb.js';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';
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

// DEVELOPMENT MODE NOTIFICATION GATE:
// While in active development, actual SMS and email transmissions are strictly paused.
// They are simulated and logged locally without calling external APIs until live integration is explicitly requested.
const LIVE_NOTIFICATIONS_ENABLED = process.env.ENABLE_LIVE_NOTIFICATIONS === 'true';

let gmailTransporter = null;
function getGmailTransporter() {
  if (!LIVE_NOTIFICATIONS_ENABLED) {
    return {
      sendMail: async (mailOptions) => {
        const to = mailOptions?.to || 'recipient';
        const subject = mailOptions?.subject || 'Notification';
        console.log(`[Email Paused in Dev] Simulated email to: ${to} | Subject: "${subject}"`);
        return {
          messageId: 'simulated_dev_email_' + Date.now(),
          response: '250 Simulated Dev Delivery (No real email sent)',
          accepted: [to],
          rejected: []
        };
      }
    };
  }

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
  if (!LIVE_NOTIFICATIONS_ENABLED) {
    return {
      messages: {
        create: async (msgOptions) => {
          const to = msgOptions?.to || 'recipient';
          const body = (msgOptions?.body || '').slice(0, 120);
          console.log(`[SMS Paused in Dev] Simulated SMS to: ${to} | Body: "${body}..."`);
          return {
            sid: 'SM_simulated_dev_' + Math.random().toString(36).substring(2, 10),
            status: 'simulated_delivered',
            to: to,
            body: msgOptions?.body || ''
          };
        }
      }
    };
  }

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
  const rawPhone = order?.shippingAddress?.phone || order?.contactDetails?.phone || order?.userDetails?.phone || order?.phone || '';
  if (!rawPhone) {
    return { success: false, error: 'No phone number provided for recipient.' };
  }

  const formattedPhone = formatToE164Phone(rawPhone);
  const orderCode = order.orderCode || order.orderId || 'UCHIHA-ORDER';
  const cleanCode = String(orderCode).replace(/^#/, '');
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Customer';
  const grandTotal = order.grandTotalInr ? `₹${Math.round(Number(order.grandTotalInr))}` : '₹0';
  const smsBody = `Hi ${customerName}, thank you for ordering from THE STREET CO! Order #${cleanCode} for ${grandTotal} is confirmed and being processed. Track: https://www.delhivery.com/tracking`;

  if (!LIVE_NOTIFICATIONS_ENABLED) {
    console.log(`[Twilio SMS - Dev Paused] Order confirmation SMS for ${orderCode} to ${formattedPhone}: ${smsBody}`);
    return {
      success: true,
      simulated: true,
      pausedInDev: true,
      to: formattedPhone,
      body: smsBody
    };
  }

  const client = getTwilioClient();
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER || '').trim();

  if (!client || !fromNumber) {
    return {
      success: false,
      configured: false,
      notice: 'Twilio SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env'
    };
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

// Automated The Street Cash VIP Points Credited SMS Dispatcher
async function sendStreetCashSms(rawPhone, pointsAdded, reason, totalBalance) {
  if (!rawPhone) {
    return { success: false, error: 'No phone number provided for Street Cash SMS.' };
  }

  const formattedPhone = formatToE164Phone(rawPhone);
  const smsBody = `THE STREET CO VIP: +${pointsAdded} The Street Cash credited to your vault for ${reason}! Total Balance: ${totalBalance} pts. Redeem at 499 pts for ₹499 OFF! https://thestreetco.in/#street-cash`;

  const client = getTwilioClient();
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER || '').trim();
  const cleanedDigits = String(rawPhone).replace(/[\s\-()+]/g, '');
  const isPlaceholderNumber = /^(?:91)?(?:9876543210|1234567890|0000000000|9999999999|1111111111)$/.test(cleanedDigits);

  if (!LIVE_NOTIFICATIONS_ENABLED || isPlaceholderNumber || !client || !fromNumber) {
    console.log(`[Twilio SMS - The Street Cash - Dev Paused] Dispatched to ${formattedPhone}: ${smsBody}`);
    return {
      success: true,
      simulated: true,
      pausedInDev: !LIVE_NOTIFICATIONS_ENABLED,
      to: formattedPhone,
      body: smsBody
    };
  }

  try {
    const message = await client.messages.create({
      body: smsBody,
      from: fromNumber,
      to: formattedPhone
    });
    console.log(`[Twilio SMS - The Street Cash] Successfully sent to ${formattedPhone}. SID: ${message.sid}`);
    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: formattedPhone
    };
  } catch (err) {
    console.warn(`[Twilio SMS - The Street Cash] Notice for ${formattedPhone}:`, err.message);
    return {
      success: false,
      error: err.message,
      to: formattedPhone
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

  if (!LIVE_NOTIFICATIONS_ENABLED) {
    console.log(`[Gmail - Dev Paused] Order confirmation email for ${orderCode} to ${recipientEmail} simulated.`);
    return { success: true, simulated: true, pausedInDev: true };
  }

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

  // Official Zoho Tax Invoice PDF attachment when order is confirmed
  const mailAttachments = [];
  const zohoInvoiceId = order.zoho_invoice_id || order.invoice_id;
  if (zohoInvoiceId && !String(zohoInvoiceId).startsWith('LOCAL-')) {
    try {
      const pdfBuffer = await zohoInventory.fetchZohoInvoicePdf(zohoInvoiceId);
      if (pdfBuffer && pdfBuffer.length > 0) {
        mailAttachments.push({
          filename: `TheStreetCo-Invoice-${order.invoice_number || cleanOrderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }
    } catch (attErr) {
      console.warn('[Confirmation Email] Could not fetch Zoho PDF attachment:', attErr.message);
    }
  }

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

// ══════════════════════════════════════════════════════════════════════════
// Dedicated Delhivery Done / Order Delivered Email Dispatcher
// ══════════════════════════════════════════════════════════════════════════
async function sendDeliveryDoneEmail(order, hostOrigin = '') {
  const recipientEmail = (
    order?.contactDetails?.email ||
    order?.shippingAddress?.email ||
    order?.userDetails?.email ||
    order?.email ||
    ''
  ).trim();

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email provided for delivery notification.' };
  }

  const orderCode = order.orderCode || order.orderId || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Valued Customer';
  const deliveredAt = order.deliveredAtFormatted || new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' IST';

  const shippingAddr = order.shippingAddress || {};
  const streetAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.houseFlat, shippingAddr.streetRoad].filter(Boolean).join(', ') || 'Your address on file';
  const cityStateZip = [shippingAddr.city, shippingAddr.state, shippingAddr.pincode].filter(Boolean).join(' - ');
  const fullAddress = `${streetAddr}, ${cityStateZip}`.trim();

  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const trackingUrl = `https://www.delhivery.com/tracking?awb=${encodeURIComponent(cleanOrderNumber)}`;
  const exchangePortalUrl = `${storeUrl}/#account`;

  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : ((Array.isArray(order.products) && order.products.length > 0)
        ? order.products
        : []);

  const items = rawItems.length > 0 ? rawItems : [
    { title: 'Fourth Hokage Minato Inspired Oversized T-Shirt', size: 'M', qty: 1 }
  ];

  const subject = `Delivered! Your Drop Has Arrived – #${cleanOrderNumber} · The Street Co`;

  const itemsHtml = items.map(item => {
    const itemTitle = item.title || item.name || 'Streetwear Apparel';
    const itemSize = item.size || 'M';
    const itemQty = Number(item.quantity || item.qty || 1);
    return `
      <div style="padding:10px 0;border-bottom:1px solid #f0eee9;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="color:#0e0e11;font-size:14px;">${itemTitle}</strong>
          <div style="color:#71717a;font-size:12px;margin-top:2px;">Size: <strong>${itemSize}</strong> · Qty: <strong>${itemQty}</strong></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:#10b981;background:#ecfdf5;border:1px solid #a7f3d0;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">DELIVERED</span>
      </div>
    `;
  }).join('');

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#18181b;">
    <div style="width:100%;margin:0;padding:0;background-color:#ffffff;">
      
      <!-- Top Brand Header -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0b0a0f;border-bottom:2px solid #e05a47;">
        <tbody>
          <tr>
            <td style="padding:22px 20px;text-align:center;">
              <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                <span style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:900;letter-spacing:3px;color:#ffffff;text-transform:uppercase;">THE STREET CO</span>
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Main Column -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:28px 20px;">
        
        <!-- Delivery Banner -->
        <div style="background:#f4fbf7;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
          <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:50%;background:#10b981;color:#ffffff;font-size:22px;font-weight:bold;margin-bottom:10px;">✓</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800;color:#065f46;letter-spacing:-0.3px;margin-bottom:6px;">Your Drop Has Been Delivered!</div>
          <div style="font-size:13px;color:#047857;font-weight:600;">Delhivery Express delivery completed on ${deliveredAt}</div>
        </div>

        <div style="font-size:15px;line-height:1.65;color:#27272a;margin-bottom:20px;">
          Hey <strong>${customerName}</strong>,<br><br>
          Your order <strong>#${cleanOrderNumber}</strong> has been successfully delivered by Delhivery Express to your doorstep. We hope you love the fit, drape, and heavyweight craftsmanship!
        </div>

        <!-- Delivery Destination Card -->
        <div style="background:#faf9f5;border:1px solid #e7e5e0;border-radius:8px;padding:16px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#71717a;margin-bottom:6px;">DELIVERED TO</div>
          <div style="font-size:14px;font-weight:700;color:#0e0e11;">${customerName}</div>
          <div style="font-size:13px;color:#52525b;line-height:1.5;margin-top:2px;">${fullAddress}</div>
          <div style="font-size:12px;color:#71717a;margin-top:8px;">Courier: <strong>Delhivery Express</strong> · Tracking: <a href="${trackingUrl}" target="_blank" style="color:#0e0e11;font-weight:700;text-decoration:underline;">AWB #${cleanOrderNumber} ↗</a></div>
        </div>

        <!-- Items Delivered -->
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0e0e11;margin-bottom:10px;">ITEMS DELIVERED IN THIS SHIPMENT</div>
          ${itemsHtml}
        </div>

        <!-- 7-Day Free Size Exchange & Return Guarantee Callout -->
        <div style="background:#0e0e11;color:#ffffff;border-radius:10px;padding:22px;margin-bottom:26px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#e05a47;text-transform:uppercase;margin-bottom:6px;">7-DAY EASY SIZE EXCHANGE &amp; RETURN GUARANTEE</div>
          <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:8px;">Need a Different Size or Resolution?</div>
          <p style="font-size:13px;line-height:1.6;color:#d4d4d8;margin:0 0 16px 0;">
            Try your pieces on with peace of mind. If you need a size exchange or return, our automated self-service portal is ready for you. We provide free doorstep reverse pickup via Delhivery Express!
          </p>
          <div style="text-align:center;">
            <a href="${exchangePortalUrl}" target="_blank" style="display:inline-block;background:#ffffff;color:#0e0e11;font-weight:800;font-size:12px;letter-spacing:0.8px;text-transform:uppercase;padding:12px 24px;border-radius:6px;text-decoration:none;">
              REQUEST SIZE EXCHANGE OR RETURN ↗
            </a>
          </div>
        </div>

        <!-- Support Info -->
        <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e4e4e7;padding-top:18px;">
          Have questions or feedback? Reply directly to this email or reach our dedicated support desk at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
        </div>

        <!-- Signoff -->
        <div style="font-size:13px;color:#27272a;margin-bottom:24px;">
          Best regards,<br>
          <strong>The Street Co Team</strong>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color:#0b0a0f;padding:22px 20px;text-align:center;color:#a1a1aa;font-size:11px;">
        <div style="margin-bottom:8px;letter-spacing:1px;font-weight:700;color:#ffffff;">THE STREET CO APPAREL PVT LTD</div>
        <div>West Bengal, India · © ${new Date().getFullYear()} The Street Co · All rights reserved.</div>
      </div>

    </div>
  </body>
</html>`;

  const plainTextContent = `Delivered! Your Drop Has Arrived – #${cleanOrderNumber}

Hey ${customerName},

Great news! Your order #${cleanOrderNumber} has been successfully delivered by Delhivery Express on ${deliveredAt}.

DELIVERED TO:
${customerName}
${fullAddress}
Courier: Delhivery Express
Tracking: ${trackingUrl}

7-DAY EASY SIZE EXCHANGE & RETURN GUARANTEE:
Need a different size or fit adjustment? Every order is protected by our 7-Day Free Size Exchange Policy.
Initiate your exchange or return easily at: ${exchangePortalUrl}

Customer Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) {
    return { success: false, error: 'Gmail SMTP transporter not initialized.' };
  }

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject: subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Delhivery Done email delivered for #${cleanOrderNumber} to ${recipientEmail}. MessageId:`, info.messageId);
    return {
      success: true,
      provider: 'gmail_smtp',
      messageId: info.messageId,
      recipient: recipientEmail
    };
  } catch (err) {
    console.error('[Gmail SMTP] Delhivery Done email error:', err.message);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Dedicated Return & Exchange Approval Email Dispatcher (Reverse Logistics)
// ══════════════════════════════════════════════════════════════════════════
async function sendReturnApprovedEmail(returnRecord, hostOrigin = '') {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    ''
  ).trim();

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email found for return notification.' };
  }

  const returnId = returnRecord.id || `RET-${Date.now()}`;
  const orderCode = returnRecord.orderCode || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = returnRecord.customerName || returnRecord.fullName || 'Valued Customer';
  const isExchange = returnRecord.type === 'exchange';
  const typeLabel = isExchange ? 'Size Exchange' : 'Return for Refund';
  const reverseAwb = returnRecord.reverseAwb || `STC-REV-${String(returnId).replace(/\D/g, '') || '89201'}`;
  const pickupAddress = returnRecord.pickupAddress || 'Your delivery address on file';
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const zohoRef = returnRecord.salesreturn_number || returnRecord.zoho_salesreturn_id || 'Registered in Zoho Inventory';

  const items = Array.isArray(returnRecord.items) && returnRecord.items.length > 0
    ? returnRecord.items
    : [{ name: returnRecord.itemNames || 'Streetwear Garment', size: 'Original Size' }];

  const itemsHtml = items.map(item => {
    const itemName = item.name || item.title || 'Streetwear Apparel';
    const itemSize = item.size ? `Size: <strong>${item.size}</strong>` : '';
    return `
      <div style="padding:10px 0;border-bottom:1px solid #f0eee9;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="color:#0e0e11;font-size:14px;">${itemName}</strong>
          ${itemSize ? `<div style="color:#71717a;font-size:12px;margin-top:2px;">${itemSize}</div>` : ''}
        </div>
        <span style="font-size:11px;font-weight:700;color:#10b981;background:#ecfdf5;border:1px solid #a7f3d0;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">APPROVED</span>
      </div>
    `;
  }).join('');

  const subject = `Reverse Pickup Confirmed: ${typeLabel} #${returnId} (Order #${cleanOrderNumber}) · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">REVERSE LOGISTICS · PICKUP CONFIRMED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Approval Banner -->
          <div style="background:#f4fbf7;border:1px solid #bbf7d0;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#059669;color:#ffffff;font-size:20px;font-weight:bold;margin-bottom:8px;">✓</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#065f46;letter-spacing:-0.2px;margin-bottom:4px;">Reverse Pickup Scheduled</div>
            <div style="font-size:12px;color:#047857;font-weight:600;">Delhivery Express reverse doorstep pickup scheduled within 24–48 hours</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            Your request for <strong style="color:#0e0e11;">${typeLabel}</strong> on Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong> has been verified and registered in Zoho Inventory (<strong style="color:#0e0e11;">${zohoRef}</strong>). Our logistics partner, Delhivery Express, has been assigned for doorstep pickup.
          </p>

          <!-- Request Summary Card -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <table cellpadding="0" cellspacing="0" width="100%" border="0" style="font-size:13px;line-height:22px;color:#3f3f46;margin-bottom:12px;">
              <tr>
                <td style="color:#8a7b6e;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:4px;">REQUEST TYPE</td>
                <td style="color:#8a7b6e;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:4px;text-align:right;">REFERENCE ID</td>
              </tr>
              <tr>
                <td style="font-weight:700;color:#0e0e11;font-size:14px;">${typeLabel.toUpperCase()}</td>
                <td style="font-weight:700;color:#0e0e11;font-size:14px;text-align:right;font-family:monospace;">${returnId}</td>
              </tr>
            </table>

            ${isExchange && returnRecord.requestedSize ? `
              <div style="background:#ffffff;border:1px solid #e8e2d8;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#3f3f46;">
                Requested Replacement Size: <strong style="color:#0e0e11;background:#faf8f5;border:1px solid #e8e2d8;padding:2px 8px;border-radius:4px;margin-left:6px;">${returnRecord.requestedSize}</strong>
              </div>
            ` : `
              <div style="background:#ffffff;border:1px solid #e8e2d8;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#3f3f46;">
                <strong style="color:#0e0e11;">Return for Refund:</strong> No size selection needed. Full purchase refund will be issued to your original payment method or bank UPI.
              </div>
            `}

            <div style="font-size:13px;line-height:1.5;color:#52525b;margin-bottom:10px;">
              <strong style="color:#0e0e11;">Doorstep Pickup Address:</strong><br/>
              ${pickupAddress}
            </div>

            <div style="font-size:12px;color:#71717a;border-top:1px dashed #e8e2d8;padding-top:10px;">
              Reverse Logistics: <strong style="color:#0e0e11;">Delhivery Express</strong> · <strong style="color:#0e0e11;">AWB #${reverseAwb}</strong>
            </div>
          </div>

          <!-- Items to Return -->
          <div style="margin-bottom:26px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a7b6e;margin-bottom:12px;">ARTICLES FOR REVERSE PICKUP</div>
            ${itemsHtml}
          </div>

          <!-- Important Handover Instructions -->
          <div style="background:#0e0e11;color:#ffffff;border-radius:10px;padding:24px 22px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;color:#c5a880;text-transform:uppercase;margin-bottom:8px;">DOORSTEP PICKUP GUIDELINES</div>
            <ol style="font-size:13px;line-height:1.65;color:#d4d4d8;margin:0 0 16px 0;padding-left:18px;">
              <li style="margin-bottom:6px;"><strong style="color:#ffffff;">Keep Tags Intact:</strong> Please ensure garments remain unworn with original brand tags attached.</li>
              <li style="margin-bottom:6px;"><strong style="color:#ffffff;">Pack in Bag:</strong> Place the items in any sealed courier bag or the original packaging.</li>
              <li style="margin-bottom:6px;"><strong style="color:#ffffff;">Zero Reverse Fee:</strong> Hand the parcel to the Delhivery courier agent. Do <em>not</em> pay any courier fee — reverse logistics is 100% free under our 7-Day Guarantee.</li>
              <li><strong style="color:#ffffff;">${isExchange ? 'Replacement Dispatch:' : 'Fast Refund Credit:'}</strong> ${isExchange ? 'Your replacement size will be dispatched immediately once the return pickup is scanned.' : 'Full amount will be credited to your original payment method or UPI within 24 hours of doorstep scan.'}</li>
            </ol>
          </div>

          <!-- Support Info -->
          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            Have questions or need to reschedule your reverse pickup? Reply directly to this email or reach us at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Reverse Pickup Confirmed: ${typeLabel} #${returnId} (Order #${cleanOrderNumber})

Hey ${customerName},

Great news! Your ${typeLabel} request for Order #${cleanOrderNumber} has been approved and confirmed in Zoho Inventory (${zohoRef}).

REVERSE PICKUP DETAILS:
Return Reference ID: ${returnId}
Request Type: ${typeLabel}
${isExchange && returnRecord.requestedSize ? `Requested Replacement Size: ${returnRecord.requestedSize}\n` : 'Refund Destination: Original Payment Method / Bank Account\n'}
Doorstep Pickup Address:
${pickupAddress}

Reverse Courier: Delhivery Express
Reverse Tracking AWB: ${reverseAwb}
Pickup Window: Within 24-48 business hours

IMPORTANT INSTRUCTIONS:
1. Please ensure garments are unworn with original tags attached.
2. Hand over the package to the Delhivery agent. Doorstep reverse pickup is 100% FREE.
3. ${isExchange ? 'Your replacement size will be dispatched once pickup is scanned.' : 'Refund will be credited within 24 hours of pickup scan.'}

Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) {
    return { success: false, error: 'Gmail SMTP transporter not initialized.' };
  }

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject: subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Return approval email delivered for #${returnId} to ${recipientEmail}. MessageId:`, info.messageId);
    return {
      success: true,
      provider: 'gmail_smtp',
      messageId: info.messageId,
      recipient: recipientEmail
    };
  } catch (err) {
    console.error('[Gmail SMTP] Return approval email error:', err.message);
    return { success: false, error: err.message };
  }
}

// Pickup Confirmed alias for seamless semantic usage
const sendPickupConfirmedEmail = sendReturnApprovedEmail;

// ══════════════════════════════════════════════════════════════════════════
// 3. Dedicated Order Ready to Ship (Packed & Manifested) Email Dispatcher
// ══════════════════════════════════════════════════════════════════════════
async function sendOrderReadyToShipEmail(order, hostOrigin = '') {
  const recipientEmail = (
    order?.contactDetails?.email ||
    order?.shippingAddress?.email ||
    order?.userDetails?.email ||
    order?.email ||
    ''
  ).trim();

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email provided for ready-to-ship notification.' };
  }

  const orderCode = order.orderCode || order.orderId || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Valued Customer';
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const awbCode = order.trackingAwb || order.deliveryDetails?.trackingCode || `DEL-${cleanOrderNumber}`;
  const trackingUrl = `https://www.delhivery.com/tracking?awb=${encodeURIComponent(awbCode)}`;

  const shippingAddr = order.shippingAddress || {};
  const streetAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.houseFlat, shippingAddr.streetRoad].filter(Boolean).join(', ') || 'Your address on file';
  const cityStateZip = [shippingAddr.city, shippingAddr.state, shippingAddr.pincode].filter(Boolean).join(' - ');
  const fullAddress = `${streetAddr}, ${cityStateZip}`.trim();

  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : ((Array.isArray(order.products) && order.products.length > 0) ? order.products : []);

  const itemsHtml = rawItems.map(item => {
    const itemTitle = item.title || item.name || 'Streetwear Apparel';
    const itemSize = item.size || 'M';
    const itemQty = Number(item.quantity || item.qty || 1);
    return `
      <div style="padding:10px 0;border-bottom:1px solid #f0eee9;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="color:#0e0e11;font-size:14px;">${itemTitle}</strong>
          <div style="color:#71717a;font-size:12px;margin-top:2px;">Size: <strong>${itemSize}</strong> · Qty: <strong>${itemQty}</strong></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">PACKED</span>
      </div>
    `;
  }).join('');

  const subject = `Packed & Ready to Ship: Order #${cleanOrderNumber} · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">DELHIVERY EXPRESS · PACKED &amp; MANIFESTED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Packed Status Banner -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#0e0e11;color:#ffffff;font-size:18px;font-weight:bold;margin-bottom:8px;">⚡</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#0e0e11;letter-spacing:-0.2px;margin-bottom:4px;">Packed &amp; Ready To Ship</div>
            <div style="font-size:12px;color:#8a7b6e;font-weight:600;">Delhivery Express courier handover queued · AWB #${awbCode}</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            Your garments for Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong> have passed final quality control, sealed in custom unboxing packaging, and are waiting for Delhivery Express courier dispatch from our safehouse.
          </p>

          <!-- Shipping Destination Card -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;margin-bottom:6px;">DISPATCH DESTINATION</div>
            <div style="font-size:14px;font-weight:700;color:#0e0e11;">${customerName}</div>
            <div style="font-size:13px;color:#52525b;line-height:1.5;margin-top:2px;">${fullAddress}</div>
            <div style="font-size:12px;color:#71717a;margin-top:10px;border-top:1px dashed #e8e2d8;padding-top:8px;">
              Carrier: <strong style="color:#0e0e11;">Delhivery Express</strong> · AWB: <strong style="color:#0e0e11;">#${awbCode}</strong>
            </div>
          </div>

          <!-- Items Ready -->
          <div style="margin-bottom:26px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a7b6e;margin-bottom:12px;">ARTICLES READY FOR DISPATCH</div>
            ${itemsHtml}
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${trackingUrl}" target="_blank" style="display:inline-block;background-color:#0e0e11;color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 2px 10px rgba(14,14,17,0.12);">
              TRACK LIVE ON DELHIVERY ↗
            </a>
          </div>

          <!-- Support Info -->
          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            Questions about your shipment? Contact our concierge team anytime at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Packed & Ready to Ship: Order #${cleanOrderNumber}

Hey ${customerName},

Great news! Your order #${cleanOrderNumber} is packed and ready for dispatch via Delhivery Express.

Tracking AWB: ${awbCode}
Shipping Address:
${fullAddress}

Track your package: ${trackingUrl}
Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) return { success: false, error: 'Gmail SMTP transporter not initialized.' };

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Ready to ship email delivered for #${cleanOrderNumber} to ${recipientEmail}. MessageId:`, info.messageId);
    return { success: true, provider: 'gmail_smtp', messageId: info.messageId, recipient: recipientEmail };
  } catch (err) {
    console.error('[Gmail SMTP] Ready to ship email error:', err.message);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 5. Dedicated Confirmation of Exchange Request Submitted Email
// ══════════════════════════════════════════════════════════════════════════
async function sendExchangeRequestSubmittedEmail(returnRecord, hostOrigin = '') {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for exchange confirmation.' };

  const returnId = returnRecord.id || `EX-${Date.now()}`;
  const orderCode = returnRecord.orderCode || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = returnRecord.customerName || returnRecord.fullName || 'Valued Customer';
  const requestedSize = returnRecord.requestedSize || 'Selected Size';
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const items = Array.isArray(returnRecord.items) && returnRecord.items.length > 0
    ? returnRecord.items
    : [{ name: returnRecord.itemNames || 'Streetwear Garment', size: 'M' }];

  const itemsHtml = items.map(item => `
    <div style="padding:10px 0;border-bottom:1px solid #f0eee9;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="color:#0e0e11;font-size:14px;">${item.name || 'Streetwear Garment'}</strong>
        <div style="color:#71717a;font-size:12px;margin-top:2px;">Original Size: <strong>${item.size || 'M'}</strong></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#6366f1;background:#eef2ff;border:1px solid #c7d2fe;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">EXCHANGE REQUESTED</span>
    </div>
  `).join('');

  const subject = `Exchange Request Received: Order #${cleanOrderNumber} (${returnId}) · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">CLIENT CONCIERGE · SIZE EXCHANGE REQUEST</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#0e0e11;color:#ffffff;font-size:18px;font-weight:bold;margin-bottom:8px;">↺</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#0e0e11;letter-spacing:-0.2px;margin-bottom:4px;">Exchange Request Received</div>
            <div style="font-size:12px;color:#8a7b6e;font-weight:600;">Requested Size: <strong>${requestedSize}</strong> · Request ID: ${returnId}</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            We have received your size exchange request for Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong>. We are holding your replacement article in size <strong style="color:#0e0e11;">${requestedSize}</strong>.
          </p>

          <!-- Request Summary Card -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;">EXCHANGE REFERENCE</span>
              <span style="font-family:monospace;font-size:13px;color:#0e0e11;font-weight:700;">${returnId}</span>
            </div>
            <div style="font-size:13px;color:#3f3f46;margin-bottom:6px;">
              Replacement Size: <strong style="background:#ffffff;border:1px solid #e8e2d8;padding:2px 8px;border-radius:4px;color:#0e0e11;">${requestedSize}</strong>
            </div>
            <div style="font-size:12px;color:#71717a;margin-top:8px;border-top:1px dashed #e8e2d8;padding-top:8px;">
              Doorstep Pickup Address: <strong style="color:#0e0e11;">${returnRecord.pickupAddress || 'Address on file'}</strong>
            </div>
          </div>

          <!-- Items to Exchange -->
          <div style="margin-bottom:26px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a7b6e;margin-bottom:12px;">ARTICLE TO BE EXCHANGED</div>
            ${itemsHtml}
          </div>

          <!-- Next Steps -->
          <div style="background:#0e0e11;color:#ffffff;border-radius:10px;padding:22px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;color:#c5a880;text-transform:uppercase;margin-bottom:6px;">WHAT HAPPENS NEXT?</div>
            <p style="font-size:13px;line-height:1.6;color:#d4d4d8;margin:0;">
              1. Our fulfillment team validates your request in Zoho Inventory.<br/>
              2. You will receive an official <strong>Pickup Confirmed email</strong> with Delhivery reverse tracking details.<br/>
              3. Delhivery collects your parcel and your new <strong>${requestedSize}</strong> piece is dispatched immediately!
            </p>
          </div>

          <!-- Support Info -->
          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            Questions? Reply directly to this email or reach us at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Exchange Request Received: Order #${cleanOrderNumber} (${returnId})

Hey ${customerName},

We've received your exchange request for Order #${cleanOrderNumber}.
Requested Replacement Size: ${requestedSize}
Reference ID: ${returnId}

Next step: Once approved in Zoho Inventory, you'll receive reverse pickup scheduling details via Delhivery Express.

Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) return { success: false, error: 'Gmail SMTP transporter not initialized.' };

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Exchange request confirmation email delivered for #${returnId} to ${recipientEmail}. MessageId:`, info.messageId);
    return { success: true, provider: 'gmail_smtp', messageId: info.messageId, recipient: recipientEmail };
  } catch (err) {
    console.error('[Gmail SMTP] Exchange request confirmation email error:', err.message);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 6. Dedicated Confirmation of Return Request Submitted Email (No Size Needed)
// ══════════════════════════════════════════════════════════════════════════
async function sendReturnRequestSubmittedEmail(returnRecord, hostOrigin = '') {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for return confirmation.' };

  const returnId = returnRecord.id || `RET-${Date.now()}`;
  const orderCode = returnRecord.orderCode || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = returnRecord.customerName || returnRecord.fullName || 'Valued Customer';
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const items = Array.isArray(returnRecord.items) && returnRecord.items.length > 0
    ? returnRecord.items
    : [{ name: returnRecord.itemNames || 'Streetwear Garment', size: 'M' }];

  const itemsHtml = items.map(item => `
    <div style="padding:10px 0;border-bottom:1px solid #e8e2d8;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="color:#0e0e11;font-size:14px;">${item.name || 'Streetwear Garment'}</strong>
        <div style="color:#71717a;font-size:12px;margin-top:2px;">Size: <strong style="color:#0e0e11;">${item.size || 'Original'}</strong></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#52525b;background:#faf8f5;border:1px solid #e8e2d8;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">RETURN (REFUND)</span>
    </div>
  `).join('');

  const subject = `Return Request Received: Order #${cleanOrderNumber} (${returnId}) · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">CLIENT CONCIERGE · RETURN FOR REFUND</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#0e0e11;color:#ffffff;font-size:18px;font-weight:bold;margin-bottom:8px;">↩</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#0e0e11;letter-spacing:-0.2px;margin-bottom:4px;">Return For Refund Received</div>
            <div style="font-size:12px;color:#8a7b6e;font-weight:600;">Direct Refund Scheduled · No Size Needed · Ref ID: ${returnId}</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            We have received your request to return articles from Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong> for a direct purchase refund. No replacement size selection is required.
          </p>

          <!-- Refund Summary Card -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;">REFUND DETAILS</span>
              <span style="font-family:monospace;font-size:13px;color:#0e0e11;font-weight:700;">${returnId}</span>
            </div>
            <div style="font-size:13px;color:#3f3f46;margin-bottom:6px;">
              Refund Destination: <strong style="color:#0e0e11;">Original Payment Method / Bank UPI</strong>
            </div>
            <div style="font-size:12px;color:#71717a;margin-top:8px;border-top:1px dashed #e8e2d8;padding-top:8px;">
              Doorstep Pickup Address: <strong style="color:#0e0e11;">${returnRecord.pickupAddress || 'Address on file'}</strong>
            </div>
          </div>

          <!-- Items to Return -->
          <div style="margin-bottom:26px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a7b6e;margin-bottom:12px;">ARTICLES TO BE RETURNED</div>
            ${itemsHtml}
          </div>

          <!-- Timeline -->
          <div style="background:#0e0e11;color:#ffffff;border-radius:10px;padding:22px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;color:#c5a880;text-transform:uppercase;margin-bottom:6px;">REVERSE LOGISTICS &amp; REFUND TIMELINE</div>
            <p style="font-size:13px;line-height:1.6;color:#d4d4d8;margin:0;">
              • You will receive a <strong>Pickup Confirmed email</strong> as soon as Delhivery reverse courier is assigned.<br/>
              • Hand the parcel with brand tags attached to the courier. Free doorstep pickup.<br/>
              • 100% full refund will be processed immediately upon doorstep collection scan!
            </p>
          </div>

          <!-- Support Info -->
          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            Have questions? Reply directly to this email or reach us at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Return Request Received: Order #${cleanOrderNumber} (${returnId})

Hey ${customerName},

Your return for refund request for Order #${cleanOrderNumber} has been received.
Reference ID: ${returnId}
Refund Method: Original Payment Method / Bank UPI (No size needed)

Doorstep Pickup: Free reverse pickup via Delhivery Express will be assigned within 24-48 hours.

Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) return { success: false, error: 'Gmail SMTP transporter not initialized.' };

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Return request confirmation email delivered for #${returnId} to ${recipientEmail}. MessageId:`, info.messageId);
    return { success: true, provider: 'gmail_smtp', messageId: info.messageId, recipient: recipientEmail };
  } catch (err) {
    console.error('[Gmail SMTP] Return request confirmation email error:', err.message);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 8. Dedicated Refund Done Email Dispatcher
// ══════════════════════════════════════════════════════════════════════════
async function sendRefundDoneEmail(returnRecord, hostOrigin = '') {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for refund notification.' };

  const returnId = returnRecord.id || `RET-${Date.now()}`;
  const orderCode = returnRecord.orderCode || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = returnRecord.customerName || returnRecord.fullName || 'Valued Customer';
  const refundAmount = Number(returnRecord.refundAmountInr || returnRecord.amount || 1599);
  const refundTxnId = returnRecord.refundTransactionId || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const subject = `Refund Processed: ₹${refundAmount.toLocaleString('en-IN')} for Order #${cleanOrderNumber} (${returnId}) · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">FINANCIAL CONCIERGE · REFUND SETTLEMENT</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#f4fbf7;border:1px solid #bbf7d0;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#059669;color:#ffffff;font-size:20px;font-weight:bold;margin-bottom:8px;">✓</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#065f46;letter-spacing:-0.2px;margin-bottom:4px;">Refund Successfully Processed</div>
            <div style="font-size:13px;color:#047857;font-weight:700;">₹${refundAmount.toLocaleString('en-IN')} credited to your original payment source / UPI</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            Your return for Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong> (${returnId}) has been collected and verified. We have processed a full purchase refund of <strong style="color:#0e0e11;">₹${refundAmount.toLocaleString('en-IN')}</strong>.
          </p>

          <!-- Refund Receipt -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;margin-bottom:12px;">REFUND SETTLEMENT VOUCHER</div>
            <table cellpadding="0" cellspacing="0" width="100%" border="0" style="font-size:13px;line-height:22px;color:#3f3f46;">
              <tr>
                <td style="color:#71717a;padding:4px 0;">Refund Amount:</td>
                <td style="text-align:right;font-weight:800;color:#0e0e11;font-size:15px;padding:4px 0;">₹${refundAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="color:#71717a;padding:4px 0;">Transaction Ref:</td>
                <td style="text-align:right;font-family:monospace;font-weight:700;color:#0e0e11;padding:4px 0;">${refundTxnId}</td>
              </tr>
              <tr>
                <td style="color:#71717a;padding:4px 0;">Order Reference:</td>
                <td style="text-align:right;color:#0e0e11;padding:4px 0;">#${cleanOrderNumber}</td>
              </tr>
              <tr>
                <td style="color:#71717a;padding:4px 0;">Settlement Destination:</td>
                <td style="text-align:right;color:#0e0e11;padding:4px 0;">Source Payment / Bank UPI</td>
              </tr>
            </table>
          </div>

          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            Depending on your issuing bank or UPI provider, the funds usually reflect immediately or within 1–2 business days. If you have any questions, reach our finance desk at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Refund Processed: ₹${refundAmount} for Order #${cleanOrderNumber} (${returnId})

Hey ${customerName},

Great news! Your refund of ₹${refundAmount} for Order #${cleanOrderNumber} has been successfully processed and credited back to your original payment method or UPI.

Refund Reference ID: ${refundTxnId}
Amount: ₹${refundAmount}
Status: Completed

Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) return { success: false, error: 'Gmail SMTP transporter not initialized.' };

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Refund done email delivered for #${returnId} to ${recipientEmail}. MessageId:`, info.messageId);
    return { success: true, provider: 'gmail_smtp', messageId: info.messageId, recipient: recipientEmail };
  } catch (err) {
    console.error('[Gmail SMTP] Refund done email error:', err.message);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 9. Dedicated Exchange Done (Replacement Delivered) Email Dispatcher
// ══════════════════════════════════════════════════════════════════════════
async function sendExchangeDoneEmail(returnRecord, hostOrigin = '') {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for exchange completion notification.' };

  const returnId = returnRecord.id || `EX-${Date.now()}`;
  const orderCode = returnRecord.orderCode || 'ORDER';
  const cleanOrderNumber = String(orderCode).replace('#', '').trim();
  const customerName = returnRecord.customerName || returnRecord.fullName || 'Valued Customer';
  const replacementSize = returnRecord.requestedSize || 'Your Selected Size';
  const itemName = returnRecord.itemNames || 'Streetwear Garment';
  const storeUrl = 'https://thestreetco.netlify.app';
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const subject = `Exchange Completed: Replacement Delivered for Order #${cleanOrderNumber} · The Street Co`;

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      body { margin:0;padding:0;background-color:#faf8f5;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#faf8f5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Obsidian Header with Gold Accent -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#0e0e11;border-bottom:1px solid #c5a880;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c5a880;text-transform:uppercase;margin-top:6px;">DELHIVERY EXPRESS · REPLACEMENT DELIVERED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#f4fbf7;border:1px solid #bbf7d0;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
            <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:#059669;color:#ffffff;font-size:20px;font-weight:bold;margin-bottom:8px;">✓</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#065f46;letter-spacing:-0.2px;margin-bottom:4px;">Exchange Completed &amp; Delivered</div>
            <div style="font-size:12px;color:#047857;font-weight:600;">Replacement Size ${replacementSize} successfully delivered</div>
          </div>

          <p style="font-size:15px;font-weight:600;color:#18181b;margin:0 0 10px;">
            Hey ${customerName},
          </p>
          <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0 0 24px;">
            Your size exchange for Order <strong style="color:#0e0e11;">#${cleanOrderNumber}</strong> is officially fulfilled. Your replacement <strong style="color:#0e0e11;">${itemName}</strong> in size <strong style="color:#0e0e11;">${replacementSize}</strong> has arrived at your doorstep.
          </p>

          <!-- Record Summary -->
          <div style="background:#faf8f5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;margin-bottom:8px;">EXCHANGE RECORD SUMMARY</div>
            <div style="font-size:14px;font-weight:700;color:#0e0e11;">${itemName}</div>
            <div style="font-size:13px;color:#3f3f46;margin-top:4px;">
              Delivered Size: <strong style="color:#065f46;background:#f4fbf7;border:1px solid #bbf7d0;padding:2px 8px;border-radius:4px;">${replacementSize}</strong>
            </div>
            <div style="font-size:12px;color:#71717a;margin-top:8px;border-top:1px dashed #e8e2d8;padding-top:8px;">
              Exchange Request Ref: <strong style="color:#0e0e11;">${returnId}</strong>
            </div>
          </div>

          <div style="font-size:13px;line-height:1.6;color:#52525b;margin-bottom:24px;border-top:1px solid #e8e2d8;padding-top:18px;">
            We hope the fit and drape are now immaculate! If there is anything else you need, please reach our team at <a href="mailto:${supportEmail}" style="color:#0e0e11;font-weight:700;text-decoration:underline;">${supportEmail}</a>.
          </div>

          <!-- Signoff -->
          <div style="font-size:13px;color:#18181b;">
            Best regards,<br>
            <strong style="color:#0e0e11;">The Street Co Team</strong>
          </div>

        </div> <!-- /main content -->

        <!-- Footer -->
        <div style="background-color:#faf8f5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
          <div style="margin-bottom:14px;">
            <a href="${storeUrl}" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">The Shop</a>
            <span style="color:#c5a880;">•</span>
            <a href="mailto:${supportEmail}" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Client Concierge</a>
            <span style="color:#c5a880;">•</span>
            <a href="https://www.instagram.com/thestreetco_shop?stkn=ZnJ3eDZmaHd6Ym5o" target="_blank" style="text-decoration:none;margin:0 12px;font-size:12px;font-weight:600;color:#0e0e11;">Instagram</a>
          </div>
          <div style="font-size:11px;line-height:1.6;color:#8a7b6e;max-width:440px;margin:0 auto;">
            The Street Co Apparel · Thakurnagar Shimulpur Hazratala, West Bengal 743287, India<br>
            © ${new Date().getFullYear()} The Street Co · All rights reserved.
          </div>
        </div>

      </div> <!-- /center card -->
    </div> <!-- /outer canvas -->
  </body>
</html>`;

  const plainTextContent = `Exchange Completed: Replacement Delivered for Order #${cleanOrderNumber}

Hey ${customerName},

Your size exchange for Order #${cleanOrderNumber} is complete!
Your replacement ${itemName} in size ${replacementSize} has been delivered.

Reference: ${returnId}
Support: ${supportEmail}

Best regards,
The Street Co Team`;

  const gmail = getGmailTransporter();
  if (!gmail) return { success: false, error: 'Gmail SMTP transporter not initialized.' };

  try {
    const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
    const senderDisplayName = (process.env.GMAIL_SENDER_NAME || GMAIL_SENDER_NAME).trim();
    const replyToEmail = (process.env.GMAIL_REPLY_TO || GMAIL_REPLY_TO).trim();

    const info = await gmail.sendMail({
      from: `"${senderDisplayName}" <${senderUser}>`,
      replyTo: replyToEmail,
      to: recipientEmail,
      subject,
      text: plainTextContent,
      html: htmlContent
    });

    console.log(`[Gmail SMTP] Exchange done email delivered for #${returnId} to ${recipientEmail}. MessageId:`, info.messageId);
    return { success: true, provider: 'gmail_smtp', messageId: info.messageId, recipient: recipientEmail };
  } catch (err) {
    console.error('[Gmail SMTP] Exchange done email error:', err.message);
    return { success: false, error: err.message };
  }
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

// Helper function to format coupon sub text with minimum and maximum order values
function formatCouponSubText(minOrderValue, maxOrderValue) {
  const min = Number(minOrderValue) || 0;
  const max = maxOrderValue ? Number(maxOrderValue) : null;
  if (min > 0 && max && max > min) {
    return `Valid on orders between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`;
  }
  if (min > 0) {
    return `Valid on orders above ₹${min.toLocaleString('en-IN')}`;
  }
  if (max) {
    return `Valid on orders up to ₹${max.toLocaleString('en-IN')}`;
  }
  return 'Applicable on all orders (No minimum order value)';
}

const DEFAULT_COUPONS = [
  // ── GROUP 1: PERCENTAGE DISCOUNTS (%) ──
  {
    code: 'STREET10',
    couponName: '10% Off Entire Order',
    couponText: 'Enjoy 10% instant discount across entire streetwear catalog.',
    couponSubText: 'Valid on orders between ₹1,500 and ₹8,000',
    title: '10% Off Entire Order',
    desc: 'Enjoy 10% instant discount across entire streetwear catalog.',
    subText: 'Valid on orders between ₹1,500 and ₹8,000',
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
    couponName: '15% Off Shinobi Relics',
    couponText: 'Receive 15% instant discount on shinobi graphic hoodies & tees.',
    couponSubText: 'Valid on orders between ₹2,500 and ₹12,000',
    title: '15% Off Shinobi Relics',
    desc: 'Receive 15% instant discount on shinobi graphic hoodies & tees.',
    subText: 'Valid on orders between ₹2,500 and ₹12,000',
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
    couponName: '20% Off Black Flame Hoard',
    couponText: 'Unlock 20% discount on high-tier streetwear apparel.',
    couponSubText: 'Valid on orders between ₹5,000 and ₹25,000',
    title: '20% Off Black Flame Hoard',
    desc: 'Unlock 20% discount on high-tier streetwear apparel.',
    subText: 'Valid on orders between ₹5,000 and ₹25,000',
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
    couponName: '25% Off Grand Archive Master Collection',
    couponText: 'Exclusive 25% discount for major streetwear collectors.',
    couponSubText: 'Valid on orders above ₹8,000',
    title: '25% Off Grand Archive Master Collection',
    desc: 'Exclusive 25% discount for major streetwear collectors.',
    subText: 'Valid on orders above ₹8,000',
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
  {
    code: 'FITBUNDLE10',
    couponName: '10% Off Complete Lookbook Outfit Bundle',
    couponText: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.',
    couponSubText: 'Valid on orders above ₹1,500',
    title: '10% Off Complete Lookbook Outfit Bundle',
    desc: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.',
    subText: 'Valid on orders above ₹1,500',
    group: 'percentage',
    type: 'percentage',
    value: 10,
    minOrderValue: 1500,
    maxOrderValue: null,
    maxDiscount: 3500,
    isPublic: true,
    badge: '10% BUNDLE',
    status: 'active'
  },
  {
    code: 'ANBU30',
    couponName: 'Private ANBU 30% Pass',
    couponText: 'Confidential pass (inactive & private until released to public).',
    couponSubText: 'Valid on orders above ₹4,000',
    title: 'Private ANBU 30% Pass',
    desc: 'Confidential pass (inactive & private until released to public).',
    subText: 'Valid on orders above ₹4,000',
    group: 'percentage',
    type: 'percentage',
    value: 30,
    minOrderValue: 4000,
    maxOrderValue: null,
    maxDiscount: 3000,
    isPublic: false,
    badge: 'INACTIVE',
    status: 'inactive'
  },

  // ── GROUP 2: FLAT DISCOUNTS (₹) ──
  {
    code: 'UCHIHA200',
    couponName: 'Flat ₹200 Welcome Offer',
    couponText: 'Flat ₹200 off instant discount on your streetwear order.',
    couponSubText: 'Valid on orders between ₹1,000 and ₹6,000',
    title: 'Flat ₹200 Welcome Offer',
    desc: 'Flat ₹200 off instant discount on your streetwear order.',
    subText: 'Valid on orders between ₹1,000 and ₹6,000',
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
    couponName: 'Flat ₹500 First Order Discount',
    couponText: 'Flat ₹500 instant discount on oversized drop-shoulder fits.',
    couponSubText: 'Valid on orders between ₹3,000 and ₹20,000',
    title: 'Flat ₹500 First Order Discount',
    desc: 'Flat ₹500 instant discount on orders from ₹3,000 to ₹20,000.',
    subText: 'Valid on orders between ₹3,000 and ₹20,000',
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
    couponName: 'Flat ₹1,000 Rogue Ninja Vault',
    couponText: 'Flat ₹1,000 deduction on premium streetwear orders.',
    couponSubText: 'Valid on orders above ₹6,000',
    title: 'Flat ₹1,000 Rogue Ninja Vault',
    desc: 'Flat ₹1,000 deduction on premium streetwear orders.',
    subText: 'Valid on orders above ₹6,000',
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
    couponName: 'Flat ₹1,500 Divine Armor Requisition',
    couponText: 'Save flat ₹1,500 on all orders above ₹10,000.',
    couponSubText: 'Valid on orders above ₹10,000',
    title: 'Flat ₹1,500 Divine Armor Requisition',
    desc: 'Save flat ₹1,500 on all orders above ₹10,000.',
    subText: 'Valid on orders above ₹10,000',
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
  {
    code: 'VIP100',
    couponName: 'VIP Street Cred ₹100 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (200 Points).',
    couponSubText: 'Valid on orders above ₹999',
    title: 'VIP Street Cred ₹100 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (200 Points).',
    subText: 'Valid on orders above ₹999',
    group: 'flat',
    type: 'flat',
    value: 100,
    minOrderValue: 999,
    maxOrderValue: null,
    maxDiscount: 100,
    isPublic: true,
    badge: 'VIP ₹100',
    status: 'active'
  },
  {
    code: 'VIP250',
    couponName: 'VIP Street Cred ₹250 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (450 Points).',
    couponSubText: 'Valid on orders above ₹1,499',
    title: 'VIP Street Cred ₹250 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (450 Points).',
    subText: 'Valid on orders above ₹1,499',
    group: 'flat',
    type: 'flat',
    value: 250,
    minOrderValue: 1499,
    maxOrderValue: null,
    maxDiscount: 250,
    isPublic: true,
    badge: 'VIP ₹250',
    status: 'active'
  },
  {
    code: 'VIP500',
    couponName: 'VIP Street Cred ₹500 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (850 Points).',
    couponSubText: 'Valid on orders above ₹2,499',
    title: 'VIP Street Cred ₹500 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (850 Points).',
    subText: 'Valid on orders above ₹2,499',
    group: 'flat',
    type: 'flat',
    value: 500,
    minOrderValue: 2499,
    maxOrderValue: null,
    maxDiscount: 500,
    isPublic: true,
    badge: 'VIP ₹500',
    status: 'active'
  },
  {
    code: 'VIP1000',
    couponName: 'VIP Street Cred ₹1,000 Obsidian Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (1,500 Points).',
    couponSubText: 'Valid on orders above ₹4,999',
    title: 'VIP Street Cred ₹1,000 Obsidian Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (1,500 Points).',
    subText: 'Valid on orders above ₹4,999',
    group: 'flat',
    type: 'flat',
    value: 1000,
    minOrderValue: 4999,
    maxOrderValue: null,
    maxDiscount: 1000,
    isPublic: true,
    badge: 'VIP ₹1,000',
    status: 'active'
  },
  {
    code: 'SECRET300',
    couponName: 'Classified ANBU Operative Seal',
    couponText: 'Covert seal (inactive & private until released to public).',
    couponSubText: 'Valid on orders above ₹1,800',
    title: 'Classified ANBU Operative Seal',
    desc: 'Covert seal (inactive & private until released to public).',
    subText: 'Valid on orders above ₹1,800',
    group: 'flat',
    type: 'flat',
    value: 300,
    minOrderValue: 1800,
    maxOrderValue: null,
    maxDiscount: 300,
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

  // One-time use check (The Street Cash VIP loyalty coupons)
  if (coupon.isOneTimeUse && (coupon.isRedeemed === true || coupon.status === 'used')) {
    return {
      valid: false,
      reason: 'already_redeemed',
      message: `❌ This Street Cash coupon "${coupon.code}" has already been redeemed and can only be used once.`
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

  // If not marked as public (and not a private one-time user voucher), cannot be used
  if (coupon.isPublic !== true && !coupon.isOneTimeUse) {
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

  const cName = coupon.couponName || coupon.title || (coupon.group === 'percentage' ? `${coupon.value}% Off` : `Flat ₹${coupon.value} Off`);
  const cText = coupon.couponText || coupon.desc || `Discount on orders matching price range`;
  const cSubText = coupon.couponSubText || coupon.subText || formatCouponSubText(coupon.minOrderValue, coupon.maxOrderValue);

  return {
    valid: true,
    code: coupon.code,
    couponName: cName,
    couponText: cText,
    couponSubText: cSubText,
    title: cName,
    desc: cText,
    subText: cSubText,
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

# --- 5. MongoDB Atlas Database ---
MONGODB_URI=mongodb+srv://aniruddhanag780_db_user:MIHtGOi9FH6Wgzd1@cluster-1.torqvts.mongodb.net/thestreetco?retryWrites=true&w=majority&appName=Cluster-1
MONGODB_DB_NAME=thestreetco

# --- 6. Security, Admin Passkey & Google Analytics ---
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

// System & MongoDB Status endpoints
app.get(['/api/db-status', '/api/mongodb-status'], async (req, res) => {
  const zohoStatus = zohoInventory.getStatus();
  await connectMongoDb();
  const mongoStatus = getMongoStatus();
  res.json({
    status: mongoStatus.connected ? 'connected' : 'degraded',
    engine: 'MongoDB Atlas + Firebase Auth + Zoho Inventory',
    mongodb: mongoStatus,
    firebaseAuthProject: 'the-street-co-780',
    zohoConfigured: zohoStatus.configured,
    zohoCachedItems: zohoStatus.cachedItemsCount,
    ordersCount: inMemoryOrders.size,
    couponsCount: inMemoryCoupons.length,
    currency: 'INR',
    message: mongoStatus.connected
      ? `Connected to MongoDB Atlas (${mongoStatus.cluster} / ${mongoStatus.dbName}) and Firebase Auth (the-street-co-780).`
      : `MongoDB Atlas connection pending (${mongoStatus.lastError || 'check Network Access IP whitelist'}).`
  });
});

// ──────────────────────────────────────────
// UPI DYNAMIC QR GENERATOR API
// ──────────────────────────────────────────
app.get('/api/upi/qr', async (req, res) => {
  try {
    const { text, pa = 'thestreetco@okhdfcbank', pn = 'The Street Co', am, cu = 'INR', tn = 'Order Payment' } = req.query;
    let upiUri = text;
    if (!upiUri) {
      const encodedPn = encodeURIComponent(pn);
      const encodedTn = encodeURIComponent(tn);
      upiUri = `upi://pay?pa=${pa}&pn=${encodedPn}&am=${am || 0}&cu=${cu}&tn=${encodedTn}`;
    }
    const format = req.query.format || 'svg';
    if (format === 'svg') {
      const svg = await QRCode.toString(upiUri, {
        type: 'svg',
        margin: 2,
        width: 320,
        color: { dark: '#111111', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    } else {
      const dataUrl = await QRCode.toDataURL(upiUri, {
        margin: 2,
        width: 360,
        color: { dark: '#111111', light: '#ffffff' }
      });
      return res.json({ success: true, dataUrl, upiUri });
    }
  } catch (err) {
    console.error('[UPI QR Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────
// MERCHANT GMAIL OAUTH & FAMPAY VERIFICATION
// ──────────────────────────────────────────
const MERCHANT_GMAIL_TOKEN_FILE = path.join(__dirname, 'merchant-gmail-token.json');

function loadMerchantGmailConfig() {
  try {
    if (fs.existsSync(MERCHANT_GMAIL_TOKEN_FILE)) {
      const raw = fs.readFileSync(MERCHANT_GMAIL_TOKEN_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (_) {}
  return {
    accessToken: null,
    email: 'aniruddhanag780@gmail.com',
    connectedAt: null,
    expiresAt: null
  };
}

let merchantGmailConfig = loadMerchantGmailConfig();

function saveMerchantGmailConfig(cfg) {
  try {
    fs.writeFileSync(MERCHANT_GMAIL_TOKEN_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Merchant Token Save Error]', err.message);
  }
}

// Dedicated Merchant Setup Page Routes
app.get(['/setup-gmail', '/setup-gmail/', '/admin-gmail', '/admin-gmail/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'setup-gmail.html'));
});

// POST /api/merchant/set-gmail-token - Save active OAuth access token
app.post('/api/merchant/set-gmail-token', express.json(), (req, res) => {
  const { token, email, expiresIn } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }
  merchantGmailConfig.accessToken = token;
  merchantGmailConfig.email = email || merchantGmailConfig.email || 'aniruddhanag780@gmail.com';
  merchantGmailConfig.connectedAt = new Date().toISOString();
  if (expiresIn) {
    merchantGmailConfig.expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  }
  saveMerchantGmailConfig(merchantGmailConfig);
  console.log(`[Merchant Gmail] Token registered and saved for ${merchantGmailConfig.email}`);
  return res.json({
    success: true,
    connected: true,
    email: merchantGmailConfig.email,
    connectedAt: merchantGmailConfig.connectedAt
  });
});

// GET /api/merchant/gmail-status - Check if token is connected
app.get('/api/merchant/gmail-status', (req, res) => {
  res.json({
    connected: Boolean(merchantGmailConfig.accessToken),
    email: merchantGmailConfig.email,
    connectedAt: merchantGmailConfig.connectedAt,
    expiresAt: merchantGmailConfig.expiresAt
  });
});

// POST /api/merchant/disconnect-gmail - Disconnect token
app.post('/api/merchant/disconnect-gmail', (req, res) => {
  merchantGmailConfig.accessToken = null;
  merchantGmailConfig.connectedAt = null;
  saveMerchantGmailConfig(merchantGmailConfig);
  res.json({ success: true, connected: false });
});

// GET /api/verify-payment - Checks Gmail API for FamPay receipt within 9:59 time window
app.get('/api/verify-payment', async (req, res) => {
  try {
    const rawAuth = req.headers.authorization;
    const bearerToken = rawAuth ? rawAuth.replace(/^Bearer\s+/i, '').trim() : null;
    const token = bearerToken || merchantGmailConfig.accessToken;

    const amount = Number(req.query.amount) || 0;
    const orderId = String(req.query.orderId || '').trim();
    // Default search window: within the last 10 minutes (600 seconds)
    const sinceEpoch = Number(req.query.since) || Math.floor((Date.now() - 600000) / 1000);

    if (!token) {
      return res.json({
        verified: false,
        reason: 'no_token',
        message: 'Merchant Gmail not connected yet. Waiting or use UTR manual submission.'
      });
    }

    // Query Gmail API for incoming messages after sinceEpoch
    const query = `after:${sinceEpoch} (fampay OR upi OR payment OR "money received" OR "amount received" OR credited OR transferred)`;
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (listRes.status === 401) {
      merchantGmailConfig.accessToken = null;
      return res.json({
        verified: false,
        reason: 'token_expired',
        message: 'OAuth token has expired. Please reconnect merchant Gmail.'
      });
    }

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.warn('[Gmail Verify Error]', listRes.status, errText);
      return res.json({
        verified: false,
        reason: 'api_error',
        message: 'Error communicating with Gmail API.'
      });
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return res.json({
        verified: false,
        reason: 'no_messages',
        checkedCount: 0
      });
    }

    // Inspect each candidate message
    const formattedAmount = String(amount);
    const amountVariants = [
      formattedAmount,
      amount.toLocaleString('en-IN'),
      `${amount}.00`,
      `${amount.toLocaleString('en-IN')}.00`
    ];

    for (const msgItem of messages) {
      try {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!msgRes.ok) continue;

        const msgData = await msgRes.json();
        const snippet = msgData.snippet || '';
        const headers = msgData.payload?.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

        // Extract raw body text
        let fullBodyText = snippet;
        if (msgData.payload?.body?.data) {
          try {
            fullBodyText += ' ' + Buffer.from(msgData.payload.body.data, 'base64').toString('utf8');
          } catch (_) {}
        }
        if (msgData.payload?.parts) {
          for (const part of msgData.payload.parts) {
            if (part.body?.data) {
              try {
                fullBodyText += ' ' + Buffer.from(part.body.data, 'base64').toString('utf8');
              } catch (_) {}
            }
          }
        }

        const combinedText = `${subject} ${from} ${snippet} ${fullBodyText}`.toLowerCase();

        // Check if amount is present
        const hasAmount = amount > 0 && amountVariants.some(v => combinedText.includes(v.toLowerCase()));

        // Check for payment receipt keywords
        const isPaymentReceipt =
          combinedText.includes('fampay') ||
          combinedText.includes('received') ||
          combinedText.includes('credited') ||
          combinedText.includes('paid you') ||
          combinedText.includes('successful') ||
          combinedText.includes('upi transaction');

        // Check for order ID if present in note
        const hasOrderId = orderId ? combinedText.includes(orderId.toLowerCase()) : false;

        if (hasAmount && isPaymentReceipt) {
          console.log(`[FamPay Verified] Amount: ₹${amount}, MsgId: ${msgItem.id}, Subject: ${subject}`);
          return res.json({
            verified: true,
            method: 'fampay_gmail_auto',
            messageId: msgItem.id,
            subject,
            snippet: snippet.slice(0, 160),
            date,
            matchedAmount: amount,
            orderId: hasOrderId ? orderId : null
          });
        }
      } catch (innerErr) {
        console.warn('[Message Inspection Error]', innerErr);
      }
    }

    return res.json({
      verified: false,
      reason: 'awaiting_receipt',
      checkedCount: messages.length
    });
  } catch (err) {
    console.error('[Verify Payment Exception]', err);
    res.status(500).json({ verified: false, error: err.message });
  }
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

    const cName = c.couponName || c.title || (c.group === 'percentage' ? `${c.value}% Off` : `Flat ₹${c.value} Off`);
    const cText = c.couponText || c.desc || (c.group === 'percentage' ? `${c.value}% discount on order` : `Flat ₹${c.value} discount`);
    const cSubText = c.couponSubText || c.subText || formatCouponSubText(min, max);

    return {
      code: c.code,
      couponName: cName,
      couponText: cText,
      couponSubText: cSubText,
      title: cName,
      desc: cText,
      subText: cSubText,
      group: c.group || (c.type === 'percentage' ? 'percentage' : 'flat'),
      type: c.type || c.group || 'flat',
      value: c.value,
      minOrderValue: min,
      maxOrderValue: max,
      maxDiscount: c.maxDiscount || null,
      isPublic: c.isPublic !== false,
      badge: c.badge || (c.group === 'percentage' ? `${c.value}% OFF` : `FLAT ₹${c.value}`),
      status: c.status || 'active',
      isOneTimeUse: Boolean(c.isOneTimeUse),
      isRedeemed: Boolean(c.isRedeemed),
      matchesPriceRange,
      missingAmount,
      calculatedDiscount
    };
  });

  const percentageCoupons = enhanced.filter(c => c.group === 'percentage');
  const flatCoupons = enhanced.filter(c => c.group === 'flat');

  res.json({
    success: true,
    source: 'mongodb',
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
// Validates a typed or selected coupon code against user subtotal via MongoDB Atlas & fast cache
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

  let matchedCoupon = inMemoryCoupons.find(c => c.code.toUpperCase() === rawCode);

  // If not found in memory, or if it might be updated in MongoDB, query MongoDB Atlas
  if (!matchedCoupon || matchedCoupon.isOneTimeUse) {
    try {
      const dbCoupon = await findCouponInMongo(rawCode);
      if (dbCoupon) {
        matchedCoupon = { ...dbCoupon, source: 'mongodb' };
        const idx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === rawCode);
        if (idx >= 0) {
          inMemoryCoupons[idx] = { ...inMemoryCoupons[idx], ...matchedCoupon };
        } else {
          inMemoryCoupons.push(matchedCoupon);
        }
        saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);
      }
    } catch (_) {}
  }

  if (!matchedCoupon) {
    return res.json({
      valid: false,
      reason: 'not_found',
      message: `❌ Coupon "${rawCode}" does not exist. Please check your spelling and try again.`
    });
  }

  const result = validateCouponLogic(matchedCoupon, subtotalInr);
  result.source = 'mongodb';
  return res.json(result);
});

// POST /api/coupons (Admin add / update coupon in MongoDB Atlas)
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

    const minVal = Number(data.minOrderValue) || 0;
    const maxVal = data.maxOrderValue ? Number(data.maxOrderValue) : null;
    const cName = data.couponName || data.title || (group === 'percentage' ? `${value}% Off` : `Flat ₹${value} Off`);
    const cText = data.couponText || data.desc || `Discount on orders matching price range`;
    const cSubText = data.couponSubText || data.subText || formatCouponSubText(minVal, maxVal);

    const doc = {
      code: rawCode,
      couponName: cName,
      couponText: cText,
      couponSubText: cSubText,
      title: cName,
      desc: cText,
      subText: cSubText,
      group,
      type: group,
      value,
      minOrderValue: minVal,
      maxOrderValue: maxVal,
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
      isPublic: data.isPublic !== false,
      badge: data.badge || (group === 'percentage' ? `${value}% OFF` : `FLAT ₹${value}`),
      status: data.status || 'active',
      source: 'mongodb',
      updatedAt: new Date()
    };

    const idx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === rawCode);
    if (idx >= 0) {
      inMemoryCoupons[idx] = { ...inMemoryCoupons[idx], ...doc };
    } else {
      inMemoryCoupons.push(doc);
    }
    saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);

    // Persist to MongoDB Atlas 'coupons' collection
    getCollection('coupons').then(col => {
      if (col) col.updateOne({ code: rawCode }, { $set: doc }, { upsert: true }).catch(() => {});
    });

    res.json({ success: true, message: `Coupon "${rawCode}" saved to MongoDB Atlas successfully.`, coupon: doc, source: 'mongodb' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save coupon', message: err.message });
  }
});

// DELETE /api/coupons/:code (Admin delete coupon from MongoDB Atlas)
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

    // Delete from MongoDB Atlas 'coupons' collection
    getCollection('coupons').then(col => {
      if (col) col.deleteOne({ code: rawCode }).catch(() => {});
    });

    res.json({ success: true, message: `Coupon "${rawCode}" deleted from MongoDB Atlas.` });
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
function persistOrders(singleOrder = null) {
  saveJsonCache(ORDERS_CACHE_FILE, Array.from(new Set(inMemoryOrders.values())));
  if (singleOrder && singleOrder.orderCode) {
    getCollection('orders').then(col => {
      if (col) {
        const cleanDoc = { ...singleOrder };
        delete cleanDoc._id;
        col.updateOne({ orderCode: cleanDoc.orderCode }, { $set: cleanDoc }, { upsert: true }).catch(err => {
          console.warn('[MongoDB orders.upsert]:', err.message);
        });
      }
    });
  }
}

// Local file-backed returns & exchanges cache
const RETURNS_CACHE_FILE = path.join(__dirname, 'returns_cache.json');
const savedReturnsList = loadJsonCache(RETURNS_CACHE_FILE, []);
const inMemoryReturns = new Map();
if (Array.isArray(savedReturnsList)) {
  for (const ret of savedReturnsList) {
    if (ret && ret.id) inMemoryReturns.set(ret.id, ret);
    if (ret && ret.orderCode) inMemoryReturns.set(`ORD_${ret.orderCode}`, ret);
  }
}
function persistReturn(singleReturn = null) {
  saveJsonCache(RETURNS_CACHE_FILE, Array.from(new Set(inMemoryReturns.values())));
  if (singleReturn && singleReturn.id) {
    getCollection('returns').then(col => {
      if (col) {
        const cleanDoc = { ...singleReturn };
        delete cleanDoc._id;
        col.updateOne({ id: cleanDoc.id }, { $set: cleanDoc }, { upsert: true }).catch(err => {
          console.warn('[MongoDB returns.upsert]:', err.message);
        });
      }
    });
  }
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

    // Resolve logged-in user's account phone (or fallback to shipping phone)
    const accountPhone = String(raw.accountPhone || raw.userAccountPhone || phone || '').replace(/\D/g, '').slice(-10);

    // 5. Clean Order Document (Zero redundant duplicate keys)
    // 5. Clean Order Document (Initial status: AWAITING_ZOHO_CONFIRMATION)
    // Communications (SMS + email + invoice) are strictly deferred until merchant confirms in Zoho Inventory
    const orderDocument = {
      orderId,
      orderCode,
      accountPhone,
      status: raw.status || 'AWAITING_ZOHO_CONFIRMATION',
      zoho_status: 'pending_confirmation',
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

    // Cache in memory, file, and MongoDB Atlas ('orders' collection + user's account in 'users' collection)
    inMemoryOrders.set(orderCode, orderDocument);
    inMemoryOrders.set(orderId, orderDocument);
    persistOrders(orderDocument);
    if (accountPhone.length === 10) {
      appendOrderToUserAccount(accountPhone, orderDocument).catch(() => {});
    }

    // 1. Burn one-time Street Cash voucher if used on this order
    const appliedCouponCode = String(raw.promoCode || rawPricing.promoCode || raw.couponCode || '').trim().toUpperCase();
    if (appliedCouponCode) {
      orderDocument.appliedPromoCode = appliedCouponCode;
      burnOneTimeCoupon(appliedCouponCode, orderCode).catch(() => {});
      const cIdx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === appliedCouponCode);
      if (cIdx >= 0 && inMemoryCoupons[cIdx].isOneTimeUse) {
        inMemoryCoupons[cIdx].isRedeemed = true;
        inMemoryCoupons[cIdx].status = 'used';
      }
    }

    // 2. Award The Street Cash loyalty points: Per 1,000 Rs spent will give you 199 The Street Cash
    let streetCashAwarded = null;
    if (accountPhone.length === 10 && grandTotalInr > 0) {
      try {
        streetCashAwarded = await awardStreetCashForOrder(accountPhone, grandTotalInr, orderCode);
        if (streetCashAwarded) {
          orderDocument.streetCashEarned = streetCashAwarded.pointsAwarded;
          orderDocument.streetCashAwarded = streetCashAwarded;
          const reasonNotice = streetCashAwarded.isFirstOrder
            ? `Order #${orderCode} (+${streetCashAwarded.standardPoints} pts + 49 pts First Order Milestone)`
            : `Order #${orderCode}`;
          sendStreetCashSms(accountPhone, streetCashAwarded.pointsAwarded, reasonNotice, streetCashAwarded.newBalance).catch(() => {});
        }
      } catch (ptsErr) {
        console.warn('[The Street Cash points awarding notice]:', ptsErr.message);
      }
    }

    // Automated Zoho Inventory Sales Order Push upon checkout
    let zohoSalesOrderResult = null;
    try {
      zohoSalesOrderResult = await zohoInventory.createSalesOrder(orderDocument);
      if (zohoSalesOrderResult && zohoSalesOrderResult.success) {
        orderDocument.zoho_salesorder_id = zohoSalesOrderResult.zoho_salesorder_id;
        orderDocument.zoho_salesorder_number = zohoSalesOrderResult.zoho_salesorder_number;
        persistOrders(orderDocument);
      }
    } catch (zohoOrderErr) {
      console.warn('[Zoho Inventory] Sales order sync notice:', zohoOrderErr.message);
      zohoSalesOrderResult = { success: false, error: zohoOrderErr.message };
    }

    // NOTE: Order confirmation SMS, email, and Zoho Invoice are strictly deferred per business rules.
    // They will ONLY be dispatched once the order is confirmed in Zoho Inventory (via webhook or admin action).

    res.json({
      success: true,
      orderCode: orderDocument.orderCode,
      orderId: orderDocument.orderId,
      order: orderDocument,
      zohoSalesOrder: zohoSalesOrderResult,
      status: orderDocument.status,
      awaitingZohoConfirmation: true,
      message: 'Order placed and registered in Zoho Inventory. Confirmation SMS, email, and Zoho Invoice will be sent as soon as the merchant marks the order confirmed in Zoho Inventory.'
    });
  } catch (err) {
    console.error('[Server] Order processing error:', err);
    res.status(500).json({ error: 'Order processing error', detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ZOHO INVENTORY LIFECYCLE: CONFIRMATION & FULFILLMENT CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Confirm order from Zoho Inventory:
 * 1. Converts Zoho Sales Order to official Zoho Invoice (INV-XXXX)
 * 2. Updates order status to CONFIRMED
 * 3. Dispatches Confirmation SMS to customer
 * 4. Dispatches Confirmation Email with official Zoho PDF Invoice attached
 * 5. Dispatches dedicated GST Tax Invoice Email with PDF attached
 */
async function confirmOrderFromZoho(codeOrId, hostOrigin = '') {
  const code = String(codeOrId || '').trim().toUpperCase().replace(/^#/, '');
  let order = inMemoryOrders.get(code) || inMemoryOrders.get(`UCHIHA-${code}`) || null;
  if (!order) {
    for (const ord of inMemoryOrders.values()) {
      if (ord && (
        String(ord.orderCode || '').toUpperCase().replace(/^#/, '') === code ||
        String(ord.orderId || '').toUpperCase() === code ||
        String(ord.zoho_salesorder_id || '') === code ||
        String(ord.zoho_salesorder_number || '').toUpperCase() === code
      )) {
        order = ord;
        break;
      }
    }
  }

  if (!order) {
    return { success: false, error: `Order #${codeOrId} not found in database.` };
  }

  console.log(`[Zoho Order Lifecycle] Processing Zoho confirmation for #${order.orderCode} (Sales Order: ${order.zoho_salesorder_number || order.zoho_salesorder_id || 'N/A'})`);

  // 1. Mark confirmed in Zoho Inventory if salesorder_id exists
  if (order.zoho_salesorder_id) {
    await zohoInventory.confirmSalesOrderInZoho(order.zoho_salesorder_id).catch(() => {});
  }

  // 2. Convert Sales Order to Official Zoho Invoice via Zoho Invoice API
  let zohoInvoiceResult = null;
  try {
    zohoInvoiceResult = await zohoInventory.convertSalesOrderToInvoice(order.zoho_salesorder_id, order);
    if (zohoInvoiceResult && zohoInvoiceResult.success) {
      order.invoice_number = zohoInvoiceResult.invoice_number;
      order.invoice_id = zohoInvoiceResult.invoice_id;
      order.zoho_invoice_id = zohoInvoiceResult.zoho_invoice_id || zohoInvoiceResult.invoice_id;
      order.zoho_invoice_url = zohoInvoiceResult.invoice_url || '';
      order.template_name = zohoInvoiceResult.template_name || 'The Street Co';
      order.gstBreakdown = zohoInvoiceResult.gstBreakdown || order.gstBreakdown;
      order.invoiceUrl = `/invoice/${order.orderCode}`;
    }
  } catch (invErr) {
    console.warn('[Zoho Invoice Conversion Notice]', invErr.message);
  }

  // 3. Update order state to CONFIRMED
  order.status = 'CONFIRMED';
  order.zoho_status = 'confirmed';
  order.confirmedAt = new Date().toISOString();
  persistOrders(order);

  // 4. Now dispatch Confirmation SMS, Email with Invoice attached, and Dedicated GST Tax Invoice Email
  const resolvedHostOrigin = hostOrigin || 'https://thestreetco.netlify.app';
  const [smsResult, emailResult, invoiceEmailResult] = await Promise.all([
    sendOrderConfirmationSms(order, resolvedHostOrigin).catch(smsErr => {
      console.warn('[Twilio SMS Notice]:', smsErr.message);
      return { success: false, error: smsErr.message };
    }),
    sendOrderConfirmationEmailGmail(order, resolvedHostOrigin).catch(emailErr => {
      console.warn('[Order Email Notice]:', emailErr.message);
      return { success: false, error: emailErr.message };
    }),
    sendGstTaxInvoiceEmail(order, resolvedHostOrigin).catch(invErr => {
      console.warn('[GST Invoice Email Notice]:', invErr.message);
      return { success: false, error: invErr.message };
    })
  ]);

  return {
    success: true,
    orderCode: order.orderCode,
    order,
    zohoInvoice: zohoInvoiceResult,
    sms: smsResult,
    email: emailResult,
    invoiceEmail: invoiceEmailResult,
    message: `Order #${order.orderCode} confirmed in Zoho Inventory! Converted to Zoho Invoice (${order.invoice_number || 'INV'}), and confirmation SMS and email with invoice attached dispatched.`
  };
}

/**
 * Mark shipment as fulfilled in Zoho Inventory:
 * 1. Updates order status to DELIVERED / DELIVERY_DONE
 * 2. Marks shipment delivered in Zoho Inventory
 * 3. Dispatches dedicated Delhivery Done email with 7-Day Return/Exchange window info
 */
async function markOrderShipmentFulfilled(codeOrId, hostOrigin = '') {
  const code = String(codeOrId || '').trim().toUpperCase().replace(/^#/, '');
  let order = inMemoryOrders.get(code) || inMemoryOrders.get(`UCHIHA-${code}`) || null;
  if (!order) {
    for (const ord of inMemoryOrders.values()) {
      if (ord && (
        String(ord.orderCode || '').toUpperCase().replace(/^#/, '') === code ||
        String(ord.orderId || '').toUpperCase() === code ||
        String(ord.zoho_salesorder_id || '') === code ||
        String(ord.zoho_salesorder_number || '').toUpperCase() === code
      )) {
        order = ord;
        break;
      }
    }
  }

  if (!order) {
    return { success: false, error: `Order #${codeOrId} not found in database.` };
  }

  console.log(`[Zoho Order Lifecycle] Marking shipment fulfilled for #${order.orderCode} (Sales Order: ${order.zoho_salesorder_number || order.zoho_salesorder_id || 'N/A'})`);

  // 1. Mark delivered in Zoho if salesorder_id exists
  let zohoFulfilledResult = null;
  if (order.zoho_salesorder_id) {
    try {
      zohoFulfilledResult = await zohoInventory.markShipmentFulfilledInZoho(order.zoho_salesorder_id);
    } catch (_) {}
  }

  // 2. Update order state to DELIVERED
  order.status = 'DELIVERED';
  order.fulfillment_status = 'fulfilled';
  order.deliveryStatus = 'DELIVERY_DONE';
  order.deliveredAt = new Date().toISOString();
  order.deliveredAtFormatted = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' IST';
  persistOrders(order);

  // 3. Dispatch Delhivery Done Email to user
  const resolvedHostOrigin = hostOrigin || 'https://thestreetco.netlify.app';
  const deliveryEmailResult = await sendDeliveryDoneEmail(order, resolvedHostOrigin).catch(err => {
    console.warn('[Delhivery Done Email Notice]:', err.message);
    return { success: false, error: err.message };
  });

  return {
    success: true,
    orderCode: order.orderCode,
    order,
    zohoFulfilled: zohoFulfilledResult,
    deliveryDoneEmail: deliveryEmailResult,
    message: `Order #${order.orderCode} marked as shipment fulfilled/delivered in Zoho Inventory! Delhivery Done email successfully dispatched to customer.`
  };
}

// ══════════════════════════════════════════════════════════════════════════
// AUTOMATED TRIGGERED SHIPMENT FULFILLED EMAIL SERVICE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Automated Background Monitor:
 * Checks Zoho Inventory for orders whose status in Zoho transitioned to 'fulfilled' or 'shipped'.
 * When detected, automatically updates the order to DELIVERED and triggers the Delhivery Done email!
 */
let isCheckingFulfillments = false;
async function checkZohoShipmentFulfillments(hostOrigin = '') {
  if (isCheckingFulfillments || !zohoInventory.isZohoConfigured()) {
    return { checked: 0, updated: 0, orders: [] };
  }
  isCheckingFulfillments = true;
  const updatedOrders = [];

  try {
    const candidateOrders = Array.from(inMemoryOrders.values()).filter(o => 
      o && o.zoho_salesorder_id && o.status !== 'DELIVERED' && o.deliveryStatus !== 'DELIVERY_DONE'
    );

    if (candidateOrders.length === 0) {
      isCheckingFulfillments = false;
      return { checked: 0, updated: 0, orders: [] };
    }

    for (const order of candidateOrders) {
      try {
        const so = await zohoInventory.getSalesOrderFromZoho(order.zoho_salesorder_id);
        if (!so) continue;

        const rawStatus = String(so.status || '').toLowerCase();
        const rawShipped = String(so.shipped_status || '').toLowerCase();
        const rawOrderStat = String(so.order_status || '').toLowerCase();

        const isFulfilledInZoho = 
          rawStatus === 'fulfilled' || 
          rawStatus === 'delivered' || 
          rawStatus === 'shipped' ||
          rawShipped === 'shipped' || 
          rawShipped === 'fulfilled' ||
          rawOrderStat === 'fulfilled';

        if (isFulfilledInZoho) {
          console.log(`[Automated Zoho Monitor] Order #${order.orderCode} (Sales Order: ${so.salesorder_number || order.zoho_salesorder_id}) is marked as fulfilled in Zoho! Automatically triggering shipment fulfilled email.`);
          const result = await markOrderShipmentFulfilled(order.orderCode, hostOrigin);
          updatedOrders.push({
            orderCode: order.orderCode,
            salesOrderNumber: so.salesorder_number,
            zohoStatus: so.status,
            shippedStatus: so.shipped_status,
            emailSent: result?.deliveryDoneEmail?.success || false,
            recipient: result?.deliveryDoneEmail?.recipient
          });
        }
      } catch (checkErr) {
        console.warn(`[Zoho Check Order ${order.orderCode} Notice]:`, checkErr.message);
      }
    }
  } catch (err) {
    console.warn('[Automated Zoho Monitor Notice]:', err.message);
  } finally {
    isCheckingFulfillments = false;
  }

  return {
    checked: true,
    updated: updatedOrders.length,
    orders: updatedOrders
  };
}

// Start automated background monitoring loop (runs automatically every 30 seconds)
setInterval(() => {
  checkZohoShipmentFulfillments().catch(() => {});
}, 30000);

// Endpoint to inspect automated fulfillment monitor status
app.get('/api/zoho/fulfillment-monitor-status', (req, res) => {
  const isConfigured = zohoInventory.isZohoConfigured();
  const pendingCount = Array.from(inMemoryOrders.values()).filter(o => 
    o && o.zoho_salesorder_id && o.status !== 'DELIVERED' && o.deliveryStatus !== 'DELIVERY_DONE'
  ).length;

  res.json({
    success: true,
    service: 'Automated Zoho Shipment Fulfilled Email Dispatcher',
    active: true,
    intervalSeconds: 30,
    zohoConfigured: isConfigured,
    pendingFulfillmentOrders: pendingCount,
    webhookEndpoints: [
      '/api/zoho/webhook',
      '/api/zoho/shipment-fulfilled'
    ],
    description: 'Polls Zoho Inventory every 30 seconds and listens to real-time webhooks. When an order is marked fulfilled in Zoho, the Delhivery delivery notification email is automatically dispatched to the customer.'
  });
});

// Endpoint to trigger instant manual sync & check from Zoho Inventory
app.post('/api/zoho/sync-fulfillments', async (req, res) => {
  try {
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const result = await checkZohoShipmentFulfillments(hostOrigin);
    res.json({
      success: true,
      message: result.updated > 0 
        ? `Checked Zoho Inventory: ${result.updated} order(s) marked fulfilled and delivery email(s) dispatched!` 
        : 'Checked Zoho Inventory: All orders are up to date.',
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Zoho Inventory Webhook Receiver (Automated real-time event sync)
app.post([
  '/api/zoho/webhook',
  '/api/zoho-inventory/webhook',
  '/api/zoho/shipment-fulfilled',
  '/api/zoho/shipment-fulfilled-webhook'
], async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[Zoho Webhook Received]:', JSON.stringify(payload).slice(0, 300));

    const salesOrder = payload.salesorder || payload.sales_order || payload.data?.salesorder || {};
    const shipment = payload.shipmentorder || payload.shipment || payload.package || payload.data?.shipment || {};
    const eventType = String(payload.event_type || payload.event || payload.action || payload.type || '').toLowerCase();

    const salesOrderId = salesOrder.salesorder_id || payload.salesorder_id || shipment.salesorder_id || '';
    const referenceNumber = salesOrder.reference_number || payload.reference_number || payload.order_id || payload.orderCode || '';
    const hostOrigin = `${req.protocol}://${req.get('host')}`;

    const targetId = referenceNumber || salesOrderId;
    if (!targetId) {
      return res.status(200).json({ received: true, notice: 'No salesorder reference or ID found in payload.' });
    }

    const rawStatus = String(salesOrder.status || payload.status || '').toLowerCase();
    const rawShipped = String(salesOrder.shipped_status || payload.shipped_status || '').toLowerCase();

    const isDeliveryEvent = 
      eventType.includes('delivered') || 
      eventType.includes('shipment') || 
      eventType.includes('fulfill') || 
      eventType.includes('package') ||
      rawStatus === 'fulfilled' || 
      rawStatus === 'shipped' ||
      rawShipped === 'shipped';

    const isConfirmEvent = 
      eventType.includes('confirm') || 
      eventType.includes('open') || 
      rawStatus === 'confirmed' || 
      rawStatus === 'open';

    // Sales Return Webhook Support
    const salesReturn = payload.salesreturn || payload.sales_return || payload.data?.salesreturn || {};
    const salesReturnId = salesReturn.salesreturn_id || payload.salesreturn_id || '';
    if (salesReturnId || eventType.includes('return')) {
      const targetReturn = salesReturn.reference_number || salesReturnId || referenceNumber;
      if (targetReturn) {
        const retResult = await confirmReturnRequest(targetReturn, hostOrigin);
        return res.json({ received: true, action: 'sales_return_confirmed', result: retResult });
      }
    }

    if (isDeliveryEvent) {
      console.log(`[Zoho Webhook] Shipment fulfilled event detected for ${targetId}! Triggering automated delivery email.`);
      const result = await markOrderShipmentFulfilled(targetId, hostOrigin);
      return res.json({ received: true, action: 'shipment_fulfilled', result });
    }

    if (isConfirmEvent || salesOrder.status === 'confirmed') {
      const result = await confirmOrderFromZoho(targetId, hostOrigin);
      return res.json({ received: true, action: 'order_confirmed', result });
    }

    res.json({ received: true, payloadReceived: true });
  } catch (err) {
    console.error('[Zoho Webhook Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Merchant Admin trigger: Confirm in Zoho & Convert to Invoice
app.post('/api/orders/:code/confirm-in-zoho', async (req, res) => {
  try {
    const { code } = req.params;
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const result = await confirmOrderFromZoho(code, hostOrigin);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Merchant Admin trigger: Mark Order Ready to Ship (Delhivery Manifested Email)
app.post('/api/orders/:code/ready-to-ship', async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = String(code || '').trim().toUpperCase().replace(/^#/, '');
    const order = inMemoryOrders.get(cleanCode) || inMemoryOrders.get(`UCHIHA-${cleanCode}`);
    if (!order) {
      return res.status(404).json({ success: false, error: `Order #${code} not found.` });
    }

    order.status = 'READY_TO_SHIP';
    order.dispatchStatus = 'READY_TO_SHIP';
    order.deliveryDetails = order.deliveryDetails || {};
    order.deliveryDetails.dispatchStatus = 'READY_TO_SHIP';
    order.readyToShipAt = new Date().toISOString();
    persistOrders(order);

    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const emailResult = await sendOrderReadyToShipEmail(order, hostOrigin);

    res.json({
      success: true,
      orderCode: order.orderCode,
      status: 'READY_TO_SHIP',
      emailResult,
      message: `Order #${order.orderCode} marked ready to ship! Packed & Manifested email dispatched to customer.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Merchant Admin trigger: Mark Shipment Fulfilled (Delhivery Done Email)
app.post('/api/orders/:code/mark-fulfilled', async (req, res) => {
  try {
    const { code } = req.params;
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const result = await markOrderShipmentFulfilled(code, hostOrigin);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// ══════════════════════════════════════════════════════════════════════════
// RETURNS & EXCHANGES CONTROLLERS (ZOHO SALES RETURN & APPROVAL WORKFLOW)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Confirm Return / Exchange from Zoho or Merchant:
 * 1. Confirms sales return in Zoho Inventory if zoho_salesreturn_id exists
 * 2. Updates return status to APPROVED / CONFIRMED
 * 3. Dispatches dedicated Reverse Pickup Approval email via Gmail SMTP
 */
async function confirmReturnRequest(returnIdOrCode, hostOrigin = '') {
  const cleanId = String(returnIdOrCode || '').trim().toUpperCase();
  let returnRecord = inMemoryReturns.get(cleanId) || inMemoryReturns.get(`ORD_${cleanId}`) || null;
  if (!returnRecord) {
    for (const ret of inMemoryReturns.values()) {
      if (ret && (
        String(ret.id || '').toUpperCase() === cleanId ||
        String(ret.orderCode || '').toUpperCase() === cleanId ||
        String(ret.zoho_salesreturn_id || '') === cleanId ||
        String(ret.salesreturn_number || '').toUpperCase() === cleanId
      )) {
        returnRecord = ret;
        break;
      }
    }
  }

  if (!returnRecord) {
    return { success: false, error: `Return / Exchange record #${returnIdOrCode} not found.` };
  }

  console.log(`[Zoho Return Lifecycle] Processing return confirmation for #${returnRecord.id} (Order: #${returnRecord.orderCode})`);

  // 1. Confirm Sales Return in Zoho Inventory
  let zohoConfirmResult = null;
  if (returnRecord.zoho_salesreturn_id) {
    try {
      zohoConfirmResult = await zohoInventory.confirmSalesReturnInZoho(returnRecord.zoho_salesreturn_id);
    } catch (zErr) {
      console.warn('[Zoho Return Confirmation Notice]:', zErr.message);
    }
  }

  // 2. Mark Return state as APPROVED / CONFIRMED
  returnRecord.status = 'APPROVED';
  returnRecord.zoho_status = 'confirmed';
  returnRecord.reverseAwb = returnRecord.reverseAwb || `STC-REV-${String(returnRecord.id).replace(/\D/g, '') || Math.floor(100000 + Math.random() * 900000)}`;
  returnRecord.confirmedAt = new Date().toISOString();
  persistReturn(returnRecord);

  // Also update associated order
  const order = inMemoryOrders.get(returnRecord.orderCode) || inMemoryOrders.get(`UCHIHA-${returnRecord.orderCode}`);
  if (order) {
    order.returnStatus = 'APPROVED';
    order.returnRequest = returnRecord;
    persistOrders(order);
  }

  // 3. Dispatch Approval Confirmation Email to customer with Delhivery reverse pickup details
  const resolvedHostOrigin = hostOrigin || 'https://thestreetco.netlify.app';
  const emailResult = await sendReturnApprovedEmail(returnRecord, resolvedHostOrigin).catch(err => {
    console.warn('[Return Approved Email Notice]:', err.message);
    return { success: false, error: err.message };
  });

  return {
    success: true,
    returnId: returnRecord.id,
    orderCode: returnRecord.orderCode,
    returnRecord,
    zohoConfirm: zohoConfirmResult,
    emailResult,
    message: `Return #${returnRecord.id} approved and confirmed in Zoho Inventory! Reverse pickup email successfully dispatched to customer.`
  };
}

// Returns: List all returns for admin
app.get('/api/returns', async (req, res) => {
  res.json({ success: true, returns: Array.from(new Set(inMemoryReturns.values())) });
});

// Returns: Create return or exchange and register in Zoho Inventory as Sales Return
app.post('/api/returns/create', async (req, res) => {
  try {
    const raw = req.body || {};
    const orderCode = String(raw.orderCode || '').trim().toUpperCase().replace(/^#/, '');
    const type = raw.type === 'exchange' ? 'exchange' : 'return';

    // Find corresponding order if available
    let order = inMemoryOrders.get(orderCode) || inMemoryOrders.get(`UCHIHA-${orderCode}`) || null;
    if (!order) {
      const codeDigits = orderCode.replace(/\D/g, '');
      for (const ord of inMemoryOrders.values()) {
        if (!ord) continue;
        const c1 = String(ord.orderCode || '').trim().toUpperCase().replace(/^#/, '');
        const c2 = String(ord.orderId || '').trim().toUpperCase().replace(/^#/, '');
        if (c1 === orderCode || c2 === orderCode || (codeDigits && (c1.replace(/\D/g, '') === codeDigits || c2.replace(/\D/g, '') === codeDigits))) {
          order = ord;
          break;
        }
      }
    }

    const returnId = raw.id || `RET-${Math.floor(10000 + Math.random() * 90000)}`;
    const customerName = raw.customerName || order?.shippingAddress?.fullName || order?.contactDetails?.fullName || 'Customer';
    const customerPhone = raw.customerPhone || order?.shippingAddress?.phone || order?.contactDetails?.phone || '';
    const customerEmail = raw.customerEmail || order?.shippingAddress?.email || order?.contactDetails?.email || '';
    const pickupAddress = raw.pickupAddress || order?.shippingAddress?.fullAddress || 'Address on file';
    const requestedSize = type === 'exchange' ? (raw.requestedSize || 'L') : null; // Strictly null for return!

    const returnRecord = {
      id: returnId,
      orderCode,
      type,
      items: Array.isArray(raw.items) ? raw.items : [],
      itemNames: raw.itemNames || (Array.isArray(raw.items) ? raw.items.map(i => i.name).join(', ') : 'Streetwear Garment'),
      requestedSize,
      reason: raw.reason || 'Fit / Size Adjustment',
      notes: raw.notes || '',
      customerName,
      customerPhone,
      customerEmail,
      pickupAddress,
      reverseAwb: `STC-REV-${String(returnId).replace(/\D/g, '') || Math.floor(100000 + Math.random() * 900000)}`,
      status: 'PENDING_CONFIRMATION',
      createdAt: new Date().toISOString(),
      zoho_salesorder_id: order?.zoho_salesorder_id || raw.zoho_salesorder_id || null
    };

    // Save in Zoho Inventory as a Sales Return
    let zohoSalesReturnResult = null;
    try {
      zohoSalesReturnResult = await zohoInventory.createSalesReturnInZoho(returnRecord, order || {});
      if (zohoSalesReturnResult && zohoSalesReturnResult.success) {
        returnRecord.zoho_salesreturn_id = zohoSalesReturnResult.zoho_salesreturn_id;
        returnRecord.salesreturn_number = zohoSalesReturnResult.salesreturn_number;
      }
    } catch (zErr) {
      console.warn('[Zoho createSalesReturnInZoho Notice]:', zErr.message);
    }

    inMemoryReturns.set(returnId, returnRecord);
    inMemoryReturns.set(`ORD_${orderCode}`, returnRecord);
    persistReturn(returnRecord);

    if (order) {
      order.returnStatus = type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED';
      order.returnRequest = returnRecord;
      persistOrders(order);
    }

    // 5 & 6. Dispatch Confirmation of Exchange or Confirmation of Return email to customer
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    let submissionEmailResult = null;
    if (type === 'exchange') {
      submissionEmailResult = await sendExchangeRequestSubmittedEmail(returnRecord, hostOrigin).catch(e => {
        console.warn('[Exchange Submission Email Notice]:', e.message);
        return { success: false, error: e.message };
      });
    } else {
      submissionEmailResult = await sendReturnRequestSubmittedEmail(returnRecord, hostOrigin).catch(e => {
        console.warn('[Return Submission Email Notice]:', e.message);
        return { success: false, error: e.message };
      });
    }

    res.json({
      success: true,
      returnId: returnRecord.id,
      orderCode: returnRecord.orderCode,
      type: returnRecord.type,
      returnRecord,
      zohoSalesReturn: zohoSalesReturnResult,
      submissionEmail: submissionEmailResult,
      message: `${type === 'exchange' ? 'Size exchange' : 'Return'} saved and registered in Zoho Inventory as Sales Return (#${returnRecord.salesreturn_number || returnRecord.id}). Confirmation email dispatched to customer.`
    });
  } catch (err) {
    console.error('[Server] Return create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Returns: Cancel return or exchange request endpoint
app.post('/api/returns/cancel', async (req, res) => {
  try {
    const raw = req.body || {};
    const orderCode = String(raw.orderCode || '').trim().toUpperCase().replace(/^#/, '');
    const returnId = String(raw.returnId || '').trim().toUpperCase();

    // 1. Remove from inMemoryReturns map
    if (returnId) inMemoryReturns.delete(returnId);
    if (orderCode) {
      inMemoryReturns.delete(`ORD_${orderCode}`);
      for (const [key, val] of inMemoryReturns.entries()) {
        if (!val) continue;
        const c = String(val.orderCode || '').trim().toUpperCase().replace(/^#/, '');
        const rid = String(val.id || '').trim().toUpperCase();
        if (c === orderCode || (returnId && rid === returnId)) {
          inMemoryReturns.delete(key);
        }
      }
    }
    saveJsonCache(RETURNS_CACHE_FILE, Array.from(new Set(inMemoryReturns.values())));

    // 2. Clear returnRequest and returnStatus from inMemoryOrders & orders_cache.json
    const codeDigits = orderCode.replace(/\D/g, '');
    let matchedOrder = inMemoryOrders.get(orderCode) || inMemoryOrders.get(`UCHIHA-${orderCode}`) || null;
    if (!matchedOrder) {
      for (const ord of inMemoryOrders.values()) {
        if (!ord) continue;
        const c1 = String(ord.orderCode || '').trim().toUpperCase().replace(/^#/, '');
        const c2 = String(ord.orderId || '').trim().toUpperCase().replace(/^#/, '');
        if (c1 === orderCode || c2 === orderCode || (codeDigits && (c1.replace(/\D/g, '') === codeDigits || c2.replace(/\D/g, '') === codeDigits))) {
          matchedOrder = ord;
          break;
        }
      }
    }

    if (matchedOrder) {
      delete matchedOrder.returnStatus;
      delete matchedOrder.returnRequest;
      persistOrders(matchedOrder);
    } else {
      // Also check all inMemoryOrders to be completely thorough
      for (const ord of inMemoryOrders.values()) {
        if (!ord) continue;
        const c1 = String(ord.orderCode || '').trim().toUpperCase().replace(/^#/, '');
        const c2 = String(ord.orderId || '').trim().toUpperCase().replace(/^#/, '');
        if (c1 === orderCode || c2 === orderCode || (codeDigits && (c1.replace(/\D/g, '') === codeDigits || c2.replace(/\D/g, '') === codeDigits))) {
          delete ord.returnStatus;
          delete ord.returnRequest;
        }
      }
      saveJsonCache(ORDERS_CACHE_FILE, Array.from(new Set(inMemoryOrders.values())));
    }

    // 3. Clear from MongoDB Atlas ('orders' collection, 'users' collection, and 'returns' collection)
    getCollection('orders').then(col => {
      if (col && orderCode) {
        col.updateMany(
          { $or: [{ orderCode }, { orderId: orderCode }] },
          { $unset: { returnRequest: '', returnStatus: '' } }
        ).catch(() => {});
      }
    });

    getCollection('users').then(userCol => {
      if (userCol && orderCode) {
        userCol.updateMany(
          { 'orders.orderCode': orderCode },
          { $unset: { 'orders.$.returnRequest': '', 'orders.$.returnStatus': '' } }
        ).catch(() => {});
      }
    });

    getCollection('returns').then(retCol => {
      if (retCol) {
        retCol.deleteMany({
          $or: [
            ...(orderCode ? [{ orderCode }] : []),
            ...(returnId ? [{ id: returnId }] : [])
          ]
        }).catch(() => {});
      }
    });

    res.json({
      success: true,
      orderCode,
      message: `Return / exchange request for order #${orderCode} cancelled successfully.`
    });
  } catch (err) {
    console.error('[Server] Return cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Returns: Merchant confirm endpoint (approves in Zoho & dispatches pickup confirmed email)
app.post('/api/returns/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const result = await confirmReturnRequest(id, hostOrigin);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Merchant trigger: Mark Refund Done & dispatch refund completion receipt email
app.post('/api/returns/:id/mark-refund-done', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim().toUpperCase();
    let returnRecord = inMemoryReturns.get(cleanId) || inMemoryReturns.get(`ORD_${cleanId}`) || null;
    if (!returnRecord) {
      for (const ret of inMemoryReturns.values()) {
        if (ret && (String(ret.id || '').toUpperCase() === cleanId || String(ret.orderCode || '').toUpperCase() === cleanId)) {
          returnRecord = ret;
          break;
        }
      }
    }
    if (!returnRecord) {
      return res.status(404).json({ success: false, error: `Return record #${id} not found.` });
    }

    returnRecord.status = 'REFUND_DONE';
    returnRecord.refundDoneAt = new Date().toISOString();
    returnRecord.refundTransactionId = req.body?.transactionId || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
    if (req.body?.amount) {
      returnRecord.refundAmountInr = Number(req.body.amount);
    }
    persistReturn(returnRecord);

    const order = inMemoryOrders.get(returnRecord.orderCode);
    if (order) {
      order.returnStatus = 'REFUND_DONE';
      persistOrders(order);
    }

    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const emailResult = await sendRefundDoneEmail(returnRecord, hostOrigin);

    res.json({
      success: true,
      returnId: returnRecord.id,
      status: 'REFUND_DONE',
      emailResult,
      message: `Refund for #${returnRecord.id} marked as completed! Refund receipt email dispatched to customer.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Merchant trigger: Mark Exchange Done (replacement delivered) & dispatch completion email
app.post('/api/returns/:id/mark-exchange-done', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim().toUpperCase();
    let returnRecord = inMemoryReturns.get(cleanId) || inMemoryReturns.get(`ORD_${cleanId}`) || null;
    if (!returnRecord) {
      for (const ret of inMemoryReturns.values()) {
        if (ret && (String(ret.id || '').toUpperCase() === cleanId || String(ret.orderCode || '').toUpperCase() === cleanId)) {
          returnRecord = ret;
          break;
        }
      }
    }
    if (!returnRecord) {
      return res.status(404).json({ success: false, error: `Exchange record #${id} not found.` });
    }

    returnRecord.status = 'EXCHANGE_DONE';
    returnRecord.exchangeDoneAt = new Date().toISOString();
    persistReturn(returnRecord);

    const order = inMemoryOrders.get(returnRecord.orderCode);
    if (order) {
      order.returnStatus = 'EXCHANGE_DONE';
      persistOrders(order);
    }

    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const emailResult = await sendExchangeDoneEmail(returnRecord, hostOrigin);

    res.json({
      success: true,
      returnId: returnRecord.id,
      status: 'EXCHANGE_DONE',
      emailResult,
      message: `Exchange #${returnRecord.id} marked as done! Replacement delivered email dispatched to customer.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  getCollection('newsletter_subscribers').then(col => {
    if (col) {
      col.updateOne({ email: cleanEmail }, { $set: subscriberDocument }, { upsert: true }).catch(() => {});
    }
  });

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
    getCollection('support_tickets').then(col => {
      if (col) {
        col.updateOne({ ticketId: ticketRecord.ticketId }, { $set: ticketRecord }, { upsert: true }).catch(() => {});
      }
    });

    // Attempt sending notification email to desk and user via Google Gmail SMTP
    const gmail = getGmailTransporter();
    if (gmail) {
      try {
        const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
        const supportDeskHtml = `
          <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;background:#FAF8F5;color:#18181B;padding:24px;border:1px solid #E8E2D8;border-radius:12px;max-width:560px;margin:0 auto;">
            <div style="font-size:11px;color:#8A7B6E;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">THE STREET CO · CLIENT CONCIERGE</div>
            <h2 style="margin:0 0 16px;color:#0E0E11;font-size:20px;font-family:'Playfair Display',Georgia,serif;">NEW SUPPORT TICKET #${ticketId}</h2>
            <div style="background:#FFFFFF;padding:16px;border-radius:8px;border:1px solid #E8E2D8;margin-bottom:16px;font-size:13px;line-height:22px;">
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Customer Name:</strong> ${cleanName}</p>
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Email:</strong> <a href="mailto:${cleanEmail}" style="color:#0E0E11;">${cleanEmail}</a></p>
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Phone:</strong> ${cleanPhone || 'Not provided'}</p>
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Category:</strong> ${cleanCategory}</p>
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Order Reference:</strong> ${cleanOrderNumber || 'N/A'}</p>
              <p style="margin:3px 0;"><strong style="color:#0E0E11;">Logged At:</strong> ${istTime.istDateTime}</p>
            </div>
            <div style="background:#FFFFFF;padding:16px;border-radius:8px;border:1px solid #E8E2D8;font-size:13px;">
              <strong style="display:block;margin-bottom:8px;color:#8A7B6E;letter-spacing:0.06em;font-size:11px;text-transform:uppercase;">CUSTOMER INQUIRY MESSAGE:</strong>
              <p style="white-space:pre-wrap;line-height:1.6;color:#3F3F46;margin:0;">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
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
// NEXT-GEN STOREFRONT SUITE ROUTES
// (Drop Vault Waitlist, VIP Street Cred Loyalty, Order Lookup & 7-Day Exchanges, Smart Fit Profile)
// ═══════════════════════════════════════════════════════════════════════════

// Ensure bundle & VIP reward coupons exist in inMemoryCoupons for seamless checkout validation
const SUITE_COUPONS = [
  {
    code: 'FITBUNDLE10',
    title: '10% Off Complete Lookbook Outfit Bundle',
    desc: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.',
    group: 'percentage',
    type: 'percentage',
    value: 10,
    minOrderValue: 1500,
    maxOrderValue: null,
    maxDiscount: 3500,
    isPublic: true,
    badge: '10% BUNDLE',
    status: 'active'
  },
  {
    code: 'VIP100',
    title: 'VIP Street Cred ₹100 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (200 Points).',
    group: 'flat',
    type: 'flat',
    value: 100,
    minOrderValue: 999,
    maxOrderValue: null,
    maxDiscount: 100,
    isPublic: true,
    badge: 'VIP ₹100',
    status: 'active'
  },
  {
    code: 'VIP250',
    title: 'VIP Street Cred ₹250 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (450 Points).',
    group: 'flat',
    type: 'flat',
    value: 250,
    minOrderValue: 1499,
    maxOrderValue: null,
    maxDiscount: 250,
    isPublic: true,
    badge: 'VIP ₹250',
    status: 'active'
  },
  {
    code: 'VIP500',
    title: 'VIP Street Cred ₹500 Reward Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (850 Points).',
    group: 'flat',
    type: 'flat',
    value: 500,
    minOrderValue: 2499,
    maxOrderValue: null,
    maxDiscount: 500,
    isPublic: true,
    badge: 'VIP ₹500',
    status: 'active'
  },
  {
    code: 'VIP1000',
    title: 'VIP Street Cred ₹1,000 Obsidian Voucher',
    desc: 'Redeemed via Street Cred Loyalty Club (1,500 Points).',
    group: 'flat',
    type: 'flat',
    value: 1000,
    minOrderValue: 4999,
    maxOrderValue: null,
    maxDiscount: 1000,
    isPublic: true,
    badge: 'VIP ₹1,000',
    status: 'active'
  }
];

for (const sc of SUITE_COUPONS) {
  if (!inMemoryCoupons.some(c => c.code.toUpperCase() === sc.code)) {
    inMemoryCoupons.push(sc);
  }
}
saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);

// 1. Live Flash Drop Waitlist Vault Persistence
const DROP_WAITLIST_FILE = path.join(__dirname, 'drop_waitlist.json');
let inMemoryDropWaitlist = loadJsonCache(DROP_WAITLIST_FILE, []);
if (!Array.isArray(inMemoryDropWaitlist)) inMemoryDropWaitlist = [];

app.get('/api/drop-waitlist', (req, res) => {
  const counts = {
    'DROP-01': 142,
    'DROP-02': 98,
    'DROP-03': 214
  };
  for (const entry of inMemoryDropWaitlist) {
    if (entry && entry.dropId) {
      counts[entry.dropId] = (counts[entry.dropId] || 80) + 1;
    }
  }
  res.json({
    success: true,
    totalWaitlistEntries: inMemoryDropWaitlist.length,
    counts,
    recentEntries: inMemoryDropWaitlist.slice(-10)
  });
});

app.post('/api/drop-waitlist', async (req, res) => {
  try {
    const { dropId, dropTitle, email, phone, preferredSize, releaseDate } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({ success: false, error: 'Please provide an email address or mobile number.' });
    }

    const reservationCode = `VAULT-${Math.floor(100000 + Math.random() * 900000)}`;
    const record = {
      id: reservationCode,
      dropId: dropId || 'DROP-01',
      dropTitle: dropTitle || 'Limited Edition Capsule Drop',
      email: cleanEmail,
      phone: cleanPhone,
      preferredSize: preferredSize || 'L',
      releaseDate: releaseDate || 'Upcoming Drop',
      createdAt: new Date().toISOString()
    };

    inMemoryDropWaitlist.push(record);
    saveJsonCache(DROP_WAITLIST_FILE, inMemoryDropWaitlist);
    getCollection('drop_waitlist').then(col => {
      if (col) {
        col.insertOne({ ...record }).catch(() => {});
      }
    });

    // Non-blocking Email & SMS Waitlist Dispatch
    let emailDispatched = false;
    let smsDispatched = false;

    const transporter = getGmailTransporter();
    if (transporter && cleanEmail) {
      transporter.sendMail({
        from: `"${GMAIL_SENDER_NAME}" <${GMAIL_SMTP_USER}>`,
        to: cleanEmail,
        replyTo: GMAIL_REPLY_TO,
        subject: `Drop Vault Priority Access Confirmed — ${record.dropTitle} (${reservationCode})`,
        html: `
          <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#0e0e11;color:#f5f3ef;border-radius:8px;">
            <p style="font-size:11px;letter-spacing:0.18em;color:#c9a84c;margin:0 0 8px;">THE STREET CO · DROP VAULT PRIORITY PASS</p>
            <h2 style="font-size:22px;margin:0 0 12px;color:#ffffff;">You're on the Early Access List</h2>
            <p style="font-size:14px;line-height:1.6;color:#d4d4d8;">Your priority reservation for <strong>${record.dropTitle}</strong> (Preferred Size: <strong>${record.preferredSize}</strong>) has been locked in.</p>
            <div style="background:#18181c;border:1px solid rgba(255,255,255,0.1);padding:14px 18px;border-radius:6px;margin:18px 0;">
              <div style="font-size:11px;color:#a1a1aa;">PRIORITY RESERVATION ID</div>
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.08em;margin-top:4px;">${reservationCode}</div>
            </div>
            <p style="font-size:12px;color:#a1a1aa;margin-top:16px;">You will receive your private early-access checkout link 30 minutes before the public release.</p>
          </div>
        `
      }).catch(e => console.warn('[Drop Waitlist Email Notice]:', e.message));
      emailDispatched = true;
    }

    const twClient = getTwilioClient();
    if (twClient && cleanPhone) {
      const formattedPhone = formatToE164Phone(cleanPhone);
      twClient.messages.create({
        body: `THE STREET CO: Priority Drop Access confirmed for ${record.dropTitle} (Size ${record.preferredSize}). Pass ID: ${reservationCode}. Use code STREET10 for 10% off.`,
        from: TWILIO_PHONE_NUMBER,
        to: formattedPhone
      }).catch(e => console.warn('[Drop Waitlist SMS Notice]:', e.message));
      smsDispatched = true;
    }

    return res.json({
      success: true,
      reservationCode,
      record,
      notifications: { emailDispatched, smsDispatched },
      message: `Priority waitlist spot reserved (${reservationCode}).`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE STREET CASH — VIP LOYALTY & AI REWARDS SYSTEM
// Rules:
// 1. Math rate: 0.199 points per 1 Rs spent (Math.floor(total * 0.199))
// 2. Strict UI display constraint: NEVER show "0.199 points".
//    MUST strictly display: "Per 1,000 Rs spent will give you 199 The Street Cash"
// 3. Minimum redemption: 499 The Street Cash = ₹499 OFF coupon (strictly one-time use)
// 4. Coupons saved and managed in MongoDB Atlas 'coupons' collection
// 5. AI Concierge Stylist integration to pair outfits with the redeemed voucher
// ─────────────────────────────────────────────────────────────────────────────

function calculateStreetCashTier(balance = 0) {
  const pts = Math.max(0, Number(balance) || 0);
  if (pts >= 2500) {
    return { name: 'Obsidian Syndicate', level: 4, nextThreshold: null, badge: 'ELITE OBSIDIAN', perk: 'Double Street Cash Drops & VIP Safehouse Invitations' };
  }
  if (pts >= 1000) {
    return { name: 'Gold Vanguard', level: 3, nextThreshold: 2500, badge: 'GOLD VANGUARD', perk: 'Early Access to New Releases & Free Express Air Shipping' };
  }
  if (pts >= 499) {
    return { name: 'VIP Street Insider', level: 2, nextThreshold: 1000, badge: 'VIP INSIDER', perk: 'Redemption Eligible: ₹499 Instant Off Vouchers' };
  }
  return { name: 'Street Member', level: 1, nextThreshold: 499, badge: 'VIP MEMBER', perk: 'Earn 199 The Street Cash per ₹1,000 spent on all orders' };
}

// GET /api/loyalty & /api/loyalty/status
app.get(['/api/loyalty', '/api/loyalty/status', '/api/street-cash'], async (req, res) => {
  try {
    const rawPhone = req.query.phone || req.query.memberId || req.query.accountPhone || '';
    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      // Unauthenticated / Guest preview state
      const defaultBalance = 0;
      return res.json({
        success: true,
        isGuest: true,
        phone: '',
        streetCashBalance: defaultBalance,
        streetCashEarnedTotal: 0,
        streetCashSpentTotal: 0,
        canRedeem: false,
        minRedemptionPoints: 499,
        minRedemptionInr: 499,
        pointsNeededForNextReward: 499,
        progressPercent: 0,
        displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
        tier: calculateStreetCashTier(defaultBalance),
        streetCashHistory: [],
        streetCashCoupons: [],
        message: 'Sign in with your mobile number to view and redeem The Street Cash.'
      });
    }

    // Automatically check and award any qualifying onboarding bonuses (Account, Name, Email, First Order)
    const syncRes = await syncUserOnboardingBonuses(cleanPhone);
    if (syncRes && syncRes.awardedList && syncRes.awardedList.length > 0) {
      for (const item of syncRes.awardedList) {
        sendStreetCashSms(cleanPhone, item.points, item.reason, syncRes.currentBalance).catch(() => {});
      }
    }

    const wallet = await getUserStreetCash(cleanPhone);
    const tier = calculateStreetCashTier(wallet.streetCashBalance);
    const pointsNeeded = Math.max(0, 499 - (wallet.streetCashBalance % 499 === 0 && wallet.streetCashBalance > 0 ? 0 : (499 - (wallet.streetCashBalance % 499))));
    const progressPercent = Math.min(100, Math.round(((wallet.streetCashBalance % 499) / 499) * 100));

    return res.json({
      success: true,
      isGuest: false,
      phone: cleanPhone,
      streetCashBalance: wallet.streetCashBalance,
      streetCashEarnedTotal: wallet.streetCashEarnedTotal,
      streetCashSpentTotal: wallet.streetCashSpentTotal,
      canRedeem: wallet.streetCashBalance >= 499,
      minRedemptionPoints: 499,
      minRedemptionInr: 499,
      pointsNeededForNextReward: wallet.streetCashBalance >= 499 ? 0 : (499 - wallet.streetCashBalance),
      progressPercent: wallet.streetCashBalance >= 499 ? 100 : progressPercent,
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
      tier,
      streetCashHistory: wallet.streetCashHistory || [],
      streetCashCoupons: wallet.streetCashCoupons || [],
      streetCashBonuses: syncRes.bonuses || wallet.streetCashBonuses || {},
      newlyAwardedBonuses: syncRes.awardedList || []
    });
  } catch (err) {
    console.error('[The Street Cash error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/loyalty/sync-missions
app.post('/api/loyalty/sync-missions', async (req, res) => {
  try {
    const { phone } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number required.' });
    }
    const syncRes = await syncUserOnboardingBonuses(cleanPhone);
    if (syncRes && syncRes.awardedList && syncRes.awardedList.length > 0) {
      for (const item of syncRes.awardedList) {
        sendStreetCashSms(cleanPhone, item.points, item.reason, syncRes.currentBalance).catch(() => {});
      }
    }
    return res.json({
      success: true,
      bonuses: syncRes.bonuses,
      awardedList: syncRes.awardedList,
      totalAwarded: syncRes.totalAwarded,
      currentBalance: syncRes.currentBalance
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/loyalty/claim-mission (Real-time mission reward claim & point crediting)
app.post('/api/loyalty/claim-mission', async (req, res) => {
  try {
    const { phone, missionKey, data } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number required.' });
    }

    if (data && typeof data === 'object') {
      await upsertUserByPhone(cleanPhone, data);
    }

    const validKeys = ['account_creation', 'profile_name', 'profile_email', 'first_order'];
    if (!validKeys.includes(missionKey)) {
      return res.status(400).json({ success: false, error: `Invalid mission key: ${missionKey}` });
    }

    const awardRes = await awardStreetCashBonus(cleanPhone, missionKey);
    const wallet = await getUserStreetCash(cleanPhone);
    const tier = calculateStreetCashTier(wallet.streetCashBalance);

    if (awardRes && awardRes.awarded) {
      sendStreetCashSms(cleanPhone, awardRes.points, awardRes.reason, wallet.streetCashBalance).catch(() => {});
    }

    return res.json({
      success: true,
      awarded: awardRes ? awardRes.awarded : false,
      alreadyAwarded: awardRes ? awardRes.alreadyAwarded : false,
      points: awardRes ? awardRes.points : 0,
      missionKey,
      streetCashBalance: wallet.streetCashBalance,
      streetCashEarnedTotal: wallet.streetCashEarnedTotal,
      tier,
      message: awardRes && awardRes.awarded 
        ? `+${awardRes.points} The Street Cash credited to your vault!` 
        : 'Mission verified and points active.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/loyalty/redeem
app.post('/api/loyalty/redeem', async (req, res) => {
  try {
    const { phone, points } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Please sign in with your 10-digit mobile number to redeem The Street Cash.'
      });
    }

    const requestedPoints = Math.max(499, Math.floor(Number(points) || 499));

    const result = await redeemStreetCashCoupon(cleanPhone, requestedPoints);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Immediately sync the minted coupon into the runtime memory cache so it can be used at checkout without delay
    if (result.coupon) {
      const existingIdx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === result.coupon.code.toUpperCase());
      if (existingIdx >= 0) {
        inMemoryCoupons[existingIdx] = result.coupon;
      } else {
        inMemoryCoupons.push(result.coupon);
      }
      saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);
    }

    const tier = calculateStreetCashTier(result.remainingBalance);

    return res.json({
      success: true,
      coupon: result.coupon,
      pointsRedeemed: result.pointsRedeemed,
      discountInr: result.discountInr,
      remainingBalance: result.remainingBalance,
      tier,
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
      message: result.message
    });
  } catch (err) {
    console.error('[The Street Cash Redeem error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/loyalty/ai-concierge
// AI Concierge & Streetwear Stylist integration
// Suggests outfits and styling pairings tailored to the customer's ₹499 Street Cash discount voucher
app.post('/api/loyalty/ai-concierge', async (req, res) => {
  try {
    const { phone, couponCode, discountInr = 499, preference = 'streetwear' } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    const catalogHighlights = [
      { name: 'Minato Yellow Flash Heavyweight Oversized Tee', price: 1999, category: 'Oversized Tees', vibe: 'Bold Japanese Anime Graphic with 280 GSM French Terry' },
      { name: 'Tokyo Shadow Tactical Cargo Joggers', price: 2499, category: 'Tactical Bottoms', vibe: 'Modular utility pockets, tapered obsidian finish' },
      { name: 'Akatsuki Cloud Heavyweight Acid-Washed Hoodie', price: 2999, category: 'Hoodies', vibe: '400 GSM luxury fleece with crimson cloud embroidery' },
      { name: 'Uchiha Clan Crest Boxy Tee', price: 1899, category: 'Boxy Tees', vibe: 'Minimalist chest embroidery, signature drop-shoulder silhouette' },
      { name: 'Cyberpunk Cyber-Distressed Denim Jacket', price: 3499, category: 'Outerwear', vibe: 'Custom metallic hardware with weathered acid-wash wash' }
    ];

    let aiAdvice = null;

    // Attempt Gemini AI generation if API key is present (with 4s timeout protection)
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are the lead luxury fashion director and stylist for "The Street Co", a high-end streetwear brand.
A VIP client (Phone: +91 ${cleanPhone || 'VIP Member'}) has just redeemed their VIP loyalty points ("The Street Cash") and unlocked a ₹${discountInr} OFF voucher (Code: ${couponCode || 'STREETCASH-VIP'}).

Brand details:
- Rate notice: Per 1,000 Rs spent will give you 199 The Street Cash
- Aesthetic: Creamy White, Obsidian Black, Architectural Silhouettes, 280-400 GSM Heavyweight Cotton.
- Key items in stock:
${catalogHighlights.map(c => `- ${c.name} (₹${c.price}) [${c.category}]: ${c.vibe}`).join('\n')}

Task:
Write a captivating, ultra-stylish 3-part styling concierge note:
1. "The Stylist's Recommendation": Pick 2 items that look exceptional together, calculate the combined price after applying the ₹${discountInr} Street Cash discount.
2. "Color & Silhouette Guide": How to style the drape, footwear, and accessories.
3. "Street Cred Quote": An inspiring, punchy high-fashion quote about street style.

Return concise, structured JSON with keys:
{
  "headline": "string",
  "recommendedItems": [{"name": "string", "price": number, "priceAfterVoucher": number, "stylingTip": "string"}],
  "paletteGuide": "string",
  "quote": "string"
}`;

        const callPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timed out')), 4000)
        );

        const response = await Promise.race([callPromise, timeoutPromise]);
        const rawText = response.text || '';
        try {
          aiAdvice = JSON.parse(rawText);
        } catch (_) {
          aiAdvice = null;
        }
      } catch (geminiErr) {
        console.warn('[Gemini AI Concierge Notice]:', geminiErr.message);
      }
    }

    // High-fidelity fallback styling concierge if Gemini was offline or no key configured
    if (!aiAdvice) {
      aiAdvice = {
        headline: `Stylist Curation: Pair Your ₹${discountInr} Street Cash with Architectural Essentials`,
        recommendedItems: [
          {
            name: 'Minato Yellow Flash Heavyweight Oversized Tee',
            price: 1999,
            priceAfterVoucher: Math.max(0, 1999 - discountInr),
            stylingTip: 'Tuck loosely into high-waisted relaxed cargo bottoms. The 280 GSM cotton maintains a structured boxy drape that holds its shape all day.'
          },
          {
            name: 'Tokyo Shadow Tactical Cargo Joggers',
            price: 2499,
            priceAfterVoucher: Math.max(0, 2499 - discountInr),
            stylingTip: 'Pair with chunky low-profile obsidian sneakers or retro runners. The tapered ankle cuffs accentuate silhouette proportion.'
          }
        ],
        paletteGuide: 'Obsidian Black (#0E0E11) juxtaposed against Creamy Warm Ecru (#FAF8F5). Accentuate with muted chrome or oxidized silver jewelry.',
        quote: 'Luxury is not about excess—it is about intentional silhouettes and effortless presence.'
      };
    }

    return res.json({
      success: true,
      couponCode: couponCode || 'STREETCASH-499',
      discountInr,
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
      concierge: aiAdvice
    });
  } catch (err) {
    console.error('[AI Concierge error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/loyalty/earn (Instant bonus challenges)
app.post('/api/loyalty/earn', async (req, res) => {
  try {
    const { phone, actionId, label, points = 50 } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Valid phone required to claim The Street Cash bonus.' });
    }

    const col = await getCollection('users');
    if (!col) return res.status(500).json({ success: false, error: 'Database unavailable' });

    const existing = (await col.findOne({ phone: cleanPhone })) || {};
    const history = Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : [];

    if (actionId && history.some(h => h.id === actionId)) {
      return res.json({
        success: false,
        alreadyClaimed: true,
        message: 'Bonus points for this activity have already been claimed.',
        streetCashBalance: existing.streetCashBalance || 0
      });
    }

    const ptsToAdd = Math.max(10, Math.min(250, Number(points) || 50));
    const newBalance = (Number(existing.streetCashBalance) || 0) + ptsToAdd;
    const newEarned = (Number(existing.streetCashEarnedTotal) || 0) + ptsToAdd;

    const entry = {
      id: actionId || `bonus_${Date.now()}`,
      type: 'EARNED',
      points: ptsToAdd,
      date: new Date().toISOString(),
      label: label || 'VIP Community Street Cash Bonus'
    };

    await col.updateOne(
      { phone: cleanPhone },
      {
        $set: {
          streetCashBalance: newBalance,
          streetCashEarnedTotal: newEarned,
          streetCashHistory: [entry, ...history].slice(0, 100),
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return res.json({
      success: true,
      pointsAwarded: ptsToAdd,
      newBalance,
      tier: calculateStreetCashTier(newBalance),
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
      message: `+${ptsToAdd} The Street Cash credited to your VIP wallet!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Self-Service Order Lookup & 7-Day Size Exchange Portal
const SIZE_EXCHANGES_FILE = path.join(__dirname, 'size_exchanges.json');
let inMemoryExchanges = loadJsonCache(SIZE_EXCHANGES_FILE, []);
if (!Array.isArray(inMemoryExchanges)) inMemoryExchanges = [];

// Seed a sample verified order in memory so visitors can test Order Lookup & 7-Day Exchange immediately
const DEMO_ORDER_CODE = '784920';
if (!inMemoryOrders.has(DEMO_ORDER_CODE)) {
  const sampleOrder = {
    orderId: DEMO_ORDER_CODE,
    orderCode: DEMO_ORDER_CODE,
    status: 'DELIVERED',
    orderDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    orderDateFormatted: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    contactDetails: {
      fullName: 'Aarav Mehta',
      phone: '9876543210',
      email: 'aarav.mehta@example.com',
      pincode: '400001'
    },
    shippingAddress: {
      fullName: 'Aarav Mehta',
      phone: '9876543210',
      email: 'aarav.mehta@example.com',
      houseFlat: '402, Imperial Residency',
      streetRoad: 'Colaba Causeway',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      fullAddress: '402, Imperial Residency, Colaba Causeway, Mumbai, Maharashtra - 400001'
    },
    paymentMethod: 'COD',
    paymentStatus: 'PAID_ON_DELIVERY',
    subtotalInr: 4498,
    deliveryFeeInr: 0,
    discountInr: 450,
    grandTotalInr: 4048,
    invoiceUrl: `/invoice/${DEMO_ORDER_CODE}`,
    products: [
      {
        sku: 'TS-MIN-001',
        id: 'TS-MIN-001',
        name: 'Minato Yellow Flash Heavyweight Oversized Tee',
        title: 'Minato Yellow Flash Heavyweight Oversized Tee',
        category: 'Oversized T-Shirts',
        size: 'M',
        finish: 'Obsidian Black',
        qty: 1,
        priceInr: 1999,
        image: '/product-minato.jpg'
      },
      {
        sku: 'TS-STR-004',
        id: 'TS-STR-004',
        name: 'Tokyo Shadow Tactical Cargo Joggers',
        title: 'Tokyo Shadow Tactical Cargo Joggers',
        category: 'Cargo Pants & Joggers',
        size: 'L',
        finish: 'Charcoal Grey',
        qty: 1,
        priceInr: 2499,
        image: '/product-ts-min-001.jpg'
      }
    ],
    items: [
      {
        sku: 'TS-MIN-001',
        id: 'TS-MIN-001',
        name: 'Minato Yellow Flash Heavyweight Oversized Tee',
        title: 'Minato Yellow Flash Heavyweight Oversized Tee',
        category: 'Oversized T-Shirts',
        size: 'M',
        finish: 'Obsidian Black',
        qty: 1,
        priceInr: 1999,
        image: '/product-minato.jpg'
      },
      {
        sku: 'TS-STR-004',
        id: 'TS-STR-004',
        name: 'Tokyo Shadow Tactical Cargo Joggers',
        title: 'Tokyo Shadow Tactical Cargo Joggers',
        category: 'Cargo Pants & Joggers',
        size: 'L',
        finish: 'Charcoal Grey',
        qty: 1,
        priceInr: 2499,
        image: '/product-ts-min-001.jpg'
      }
    ]
  };
  inMemoryOrders.set(DEMO_ORDER_CODE, sampleOrder);
}

app.post('/api/orders/lookup', (req, res) => {
  const { query } = req.body || {};
  const rawQuery = (query || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ success: false, error: 'Please enter an Order ID, Phone Number, or Email Address.' });
  }

  const upperQ = rawQuery.toUpperCase().replace(/^#/, '');
  const cleanDigits = rawQuery.replace(/\D/g, '').slice(-10);
  const lowerQ = rawQuery.toLowerCase();

  const matchedMap = new Map();
  for (const ord of inMemoryOrders.values()) {
    if (!ord) continue;
    const code = String(ord.orderCode || ord.orderId || '').toUpperCase();
    const phone = String(ord.contactDetails?.phone || ord.shippingAddress?.phone || ord.user?.phone || '').replace(/\D/g, '').slice(-10);
    const email = String(ord.contactDetails?.email || ord.shippingAddress?.email || ord.user?.email || '').toLowerCase();

    if (
      code === upperQ ||
      code.includes(upperQ) ||
      (cleanDigits.length === 10 && phone === cleanDigits) ||
      (lowerQ.includes('@') && email === lowerQ)
    ) {
      matchedMap.set(code, {
        ...ord,
        exchanges: inMemoryExchanges.filter(ex => String(ex.orderCode).toUpperCase() === code)
      });
    }
  }

  const orders = Array.from(matchedMap.values());
  return res.json({
    success: true,
    count: orders.length,
    orders
  });
});

app.get('/api/exchanges', (req, res) => {
  res.json({
    success: true,
    count: inMemoryExchanges.length,
    exchanges: inMemoryExchanges.slice(-25).reverse()
  });
});

app.post('/api/exchanges/create', async (req, res) => {
  try {
    const {
      orderCode,
      itemSku,
      itemName,
      currentSize,
      requestedSize,
      resolutionType,
      reason,
      customerEmail,
      customerPhone,
      notes
    } = req.body || {};

    if (!orderCode || !itemName) {
      return res.status(400).json({ success: false, error: 'Order ID and item selection are required.' });
    }

    const exchangeId = `EXG-${Math.floor(100000 + Math.random() * 900000)}`;
    const pickupDate = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const exchangeRecord = {
      exchangeId,
      orderCode: String(orderCode).toUpperCase().replace(/^#/, ''),
      itemSku: itemSku || 'ITEM-SKU',
      itemName,
      currentSize: currentSize || 'M',
      requestedSize: requestedSize || 'L',
      resolutionType: resolutionType || 'Size Exchange (Free Reverse Pickup)',
      reason: reason || 'Fit adjustment needed',
      notes: notes || '',
      customerEmail: (customerEmail || '').trim(),
      customerPhone: (customerPhone || '').trim(),
      status: 'PICKUP_SCHEDULED',
      scheduledPickupDate: pickupDate,
      courierPartner: 'Delhivery Reverse Express',
      createdAt: new Date().toISOString()
    };

    inMemoryExchanges.push(exchangeRecord);
    saveJsonCache(SIZE_EXCHANGES_FILE, inMemoryExchanges);
    getCollection('size_exchanges').then(col => {
      if (col) {
        col.updateOne({ exchangeId: exchangeRecord.exchangeId }, { $set: exchangeRecord }, { upsert: true }).catch(() => {});
      }
    });

    // Send confirmation email if available
    const transporter = getGmailTransporter();
    if (transporter && exchangeRecord.customerEmail) {
      transporter.sendMail({
        from: `"${GMAIL_SENDER_NAME}" <${GMAIL_SMTP_USER}>`,
        to: exchangeRecord.customerEmail,
        replyTo: GMAIL_REPLY_TO,
        subject: `7-Day Size Exchange Confirmed (#${exchangeId}) for Order #${exchangeRecord.orderCode}`,
        html: `
          <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#18181b;border:1px solid #e4e4e7;border-radius:8px;">
            <p style="font-size:11px;letter-spacing:0.15em;color:#71717a;margin:0 0 6px;">THE STREET CO · 7-DAY EASY EXCHANGE</p>
            <h2 style="font-size:20px;margin:0 0 12px;">Exchange Request #${exchangeId} Approved</h2>
            <p style="font-size:14px;line-height:1.6;color:#3f3f46;">We have scheduled a free reverse pickup for <strong>${exchangeRecord.itemName}</strong> from Order <strong>#${exchangeRecord.orderCode}</strong>.</p>
            <div style="background:#f4f4f5;padding:14px;border-radius:6px;margin:16px 0;font-size:13px;line-height:1.7;">
              <div><strong>Resolution:</strong> ${exchangeRecord.resolutionType}</div>
              <div><strong>Size Change:</strong> Size ${exchangeRecord.currentSize} → Size ${exchangeRecord.requestedSize}</div>
              <div><strong>Reverse Pickup Date:</strong> ${exchangeRecord.scheduledPickupDate} via Delhivery Express</div>
            </div>
            <p style="font-size:12px;color:#71717a;">Please keep the original garment tags intact for doorstep verification.</p>
          </div>
        `
      }).catch(e => console.warn('[Exchange Email Notice]:', e.message));
    }

    return res.json({
      success: true,
      exchange: exchangeRecord,
      message: `Exchange request #${exchangeId} confirmed. Reverse pickup scheduled for ${pickupDate}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Smart Fit Profile Persistence
const FIT_PROFILES_FILE = path.join(__dirname, 'fit_profiles.json');
let inMemoryFitProfiles = loadJsonCache(FIT_PROFILES_FILE, []);
if (!Array.isArray(inMemoryFitProfiles)) inMemoryFitProfiles = [];

app.post('/api/fit-profile', (req, res) => {
  try {
    const profile = {
      id: 'FIT-' + Date.now(),
      ...(req.body || {}),
      savedAt: new Date().toISOString()
    };
    inMemoryFitProfiles.push(profile);
    if (inMemoryFitProfiles.length > 200) inMemoryFitProfiles.shift();
    saveJsonCache(FIT_PROFILES_FILE, inMemoryFitProfiles);
    getCollection('fit_profiles').then(col => {
      if (col) {
        col.insertOne({ ...profile }).catch(() => {});
      }
    });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. 6-DIGIT PHONE / EMAIL OTP VERIFICATION ROUTES (USER DETAILS SAVED IN FIREBASE)
// ═══════════════════════════════════════════════════════════════════════════
// Pending 6-digit Phone OTP store: Map<phone, { otp, expiresAt }>
const pendingPhoneOtps = new Map();

// Pending 6-digit Email OTP store: Map<email, { otp, expiresAt, phone, firstName, lastName }>
const pendingEmailOtps = new Map();

// Optional Master OTP for both email and phone verification
const MASTER_OTP = '123456';

// Send 6-Digit Login OTP to user's Mobile Number
app.post('/api/account/send-phone-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Generate a 6-digit numeric OTP (100000 to 999999)
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    pendingPhoneOtps.set(cleanPhone, {
      otp: otpCode,
      expiresAt
    });

    let smsDispatched = false;
    let smsNotice = null;
    const twilioClient = typeof getTwilioClient === 'function' ? getTwilioClient() : null;
    if (twilioClient) {
      try {
        const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER || '').trim();
        await twilioClient.messages.create({
          body: `${otpCode} is your 6-digit login verification OTP for The Street Co. Valid for 10 minutes.`,
          from: fromNumber,
          to: `+91${cleanPhone}`
        });
        smsDispatched = true;
        console.log(`[Account Phone OTP] Sent 6-digit SMS OTP to ${cleanPhone}`);
      } catch (smsErr) {
        smsNotice = smsErr.message;
        console.warn(`[Account Phone OTP] Twilio SMS note for ${cleanPhone}:`, smsErr.message);
      }
    }

    return res.json({
      success: true,
      phone: cleanPhone,
      smsDispatched,
      otpCode,
      message: smsDispatched
        ? `A 6-digit OTP has been sent to ${cleanPhone}.`
        : `6-digit verification OTP generated for ${cleanPhone}.`,
      ...(smsNotice ? { smsNotice } : {})
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send mobile OTP.' });
  }
});

// Verify 6-Digit Phone Login OTP
app.post('/api/account/verify-phone-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Please enter the 6-digit OTP.' });
    }

    const isMasterOtp = cleanOtp === MASTER_OTP;
    const record = pendingPhoneOtps.get(cleanPhone);
    if (!record && !isMasterOtp) {
      return res.status(400).json({ success: false, error: 'No active OTP found for this mobile number. Please request a new OTP.' });
    }
    if (record && !isMasterOtp && Date.now() > record.expiresAt) {
      pendingPhoneOtps.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'This 6-digit OTP has expired. Please request a new OTP.' });
    }
    if (!isMasterOtp && record && record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid 6-digit OTP. Please check and try again.' });
    }

    if (cleanPhone) pendingPhoneOtps.delete(cleanPhone);

    // Sync verified login phone to MongoDB Atlas 'users' collection
    const mongoAccount = await upsertUserByPhone(cleanPhone, {
      phone: cleanPhone,
      phoneVerified: true,
      lastLoginAt: new Date().toISOString()
    });

    // Award Account Creation Bonus (+75 The Street Cash) if not already claimed
    let streetCashBonusAwarded = null;
    try {
      const bonusRes = await awardStreetCashBonus(cleanPhone, 'account_creation');
      if (bonusRes && bonusRes.awarded) {
        streetCashBonusAwarded = bonusRes;
        sendStreetCashSms(cleanPhone, bonusRes.points, bonusRes.reason, bonusRes.newBalance).catch(() => {});
      }
    } catch (bErr) {
      console.warn('[Street Cash Account Creation Bonus Note]:', bErr.message);
    }

    return res.json({
      success: true,
      verified: true,
      phone: cleanPhone,
      account: mongoAccount || { phone: cleanPhone, phoneVerified: true },
      streetCashBonusAwarded,
      message: 'Mobile number verified! Welcome to your account.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Mobile OTP verification failed.' });
  }
});

// Send 6-Digit Verification OTP to user's Email via Gmail SMTP
app.post('/api/account/send-email-otp', async (req, res) => {
  try {
    const { email, firstName, lastName, phone } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    // Generate a 6-digit numeric OTP (100000 to 999999)
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    pendingEmailOtps.set(cleanEmail, {
      otp: otpCode,
      expiresAt,
      phone: String(phone || '').replace(/\D/g, '').slice(-10),
      firstName: String(firstName || '').trim(),
      lastName: String(lastName || '').trim()
    });

    const fullName = [String(firstName || '').trim(), String(lastName || '').trim()].filter(Boolean).join(' ') || 'Valued Member';
    const gmail = getGmailTransporter();
    let emailDispatched = false;
    let mailError = null;

    if (gmail) {
      try {
        const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
        await gmail.sendMail({
          from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
          to: cleanEmail,
          subject: `${otpCode} is your 6-Digit Email Verification OTP — The Street Co`,
          html: `
            <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;background:#faf8f5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;color:#0e0e11;">
              <div style="background:#0e0e11;color:#ffffff;padding:24px;text-align:center;">
                <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;letter-spacing:0.18em;font-weight:600;">THE STREET CO</div>
                <div style="font-size:11px;letter-spacing:0.14em;color:#c5a880;margin-top:6px;">EMAIL VERIFICATION · SECURITY CODE</div>
              </div>
              <div style="padding:32px 28px;background:#ffffff;">
                <p style="font-size:15px;margin:0 0 12px;color:#18181b;">Hello <strong>${fullName}</strong>,</p>
                <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 24px;">
                  Use the 6-digit verification code below to verify and save your email address (<strong>${cleanEmail}</strong>) on your The Street Co account:
                </p>
                <div style="background:#faf8f5;border:2px dashed #0e0e11;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                  <span style="font-size:11px;letter-spacing:0.14em;color:#71717a;display:block;margin-bottom:8px;font-weight:700;">YOUR 6-DIGIT VERIFICATION OTP</span>
                  <div style="font-size:34px;font-weight:800;letter-spacing:0.28em;color:#0e0e11;font-family:monospace;">${otpCode}</div>
                </div>
                <p style="font-size:12px;color:#71717a;line-height:1.5;margin:0;">
                  This code is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.
                </p>
              </div>
              <div style="padding:16px 28px;background:#f5efeb;border-top:1px solid #e8e2d8;text-align:center;font-size:11px;color:#78716c;">
                © ${new Date().getFullYear()} The Street Co · Elevated Style. Modern Essentials.
              </div>
            </div>
          `
        });
        emailDispatched = true;
        console.log(`[Account Email OTP] Sent 6-digit OTP to ${cleanEmail}`);
      } catch (err) {
        mailError = err.message;
        console.warn(`[Account Email OTP] Gmail send warning for ${cleanEmail}:`, err.message);
      }
    }

    return res.json({
      success: true,
      email: cleanEmail,
      emailDispatched,
      message: emailDispatched
        ? `A 6-digit verification OTP has been sent to ${cleanEmail}. Please check your inbox.`
        : `6-digit verification OTP generated for ${cleanEmail}.`,
      ...(mailError ? { mailNotice: mailError } : {})
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send verification OTP.' });
  }
});

// Verify 6-Digit Email OTP and save verified email to user's account
app.post('/api/account/verify-email-otp', async (req, res) => {
  try {
    const { email, otp, firstName, lastName, phone } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').replace(/\D/g, '').trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Please enter the 6-digit OTP sent to your email.' });
    }

    const isMasterOtp = cleanOtp === MASTER_OTP;
    const record = pendingEmailOtps.get(cleanEmail);
    if (!record && !isMasterOtp) {
      return res.status(400).json({ success: false, error: 'No active OTP found for this email. Please request a new OTP.' });
    }
    if (record && !isMasterOtp && Date.now() > record.expiresAt) {
      pendingEmailOtps.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'This 6-digit OTP has expired. Please request a new OTP.' });
    }
    if (!isMasterOtp && record && record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid 6-digit OTP. Please check your email and try again.' });
    }

    const targetPhone = cleanPhone || (record && record.phone) || '';
    const fName = String(firstName || (record && record.firstName) || '').trim();
    const lName = String(lastName || (record && record.lastName) || '').trim();

    if (cleanEmail) pendingEmailOtps.delete(cleanEmail);

    let mongoAccount = null;
    if (targetPhone && targetPhone.length === 10) {
      mongoAccount = await upsertUserByPhone(targetPhone, {
        phone: targetPhone,
        phoneVerified: true,
        ...(fName ? { firstName: fName } : {}),
        ...(lName ? { lastName: lName } : {}),
        email: cleanEmail,
        emailVerified: true
      });
    }

    return res.json({
      success: true,
      verified: true,
      email: cleanEmail,
      phone: targetPhone,
      account: mongoAccount,
      message: `Email ${cleanEmail} verified and saved!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'OTP verification failed.' });
  }
});

// Store for pending credential change authorization OTPs: Map<key, { otp, expiresAt, currentPhone, newPhone, newEmail, currentEmail, type }>
const pendingChangeCredentialOtps = new Map();

// 1. Dispatch 6-Digit Authorization OTP to change Phone Number (sent to PREVIOUS phone via SMS AND previous email if added)
app.post('/api/account/change-phone/send-otp', async (req, res) => {
  try {
    const { currentPhone, newPhone } = req.body || {};
    const cleanCurrent = String(currentPhone || '').replace(/\D/g, '').slice(-10);
    const cleanNew = String(newPhone || '').replace(/\D/g, '').slice(-10);

    if (cleanCurrent.length !== 10) {
      return res.status(400).json({ success: false, error: 'Current mobile number is required.' });
    }
    if (cleanNew.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit new mobile number.' });
    }
    if (cleanCurrent === cleanNew) {
      return res.status(400).json({ success: false, error: 'The new mobile number must be different from your current number.' });
    }

    const user = await findUserByPhone(cleanCurrent);
    const userEmail = String(user?.email || '').trim().toLowerCase();
    const hasEmail = Boolean(userEmail && userEmail.includes('@'));

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    pendingChangeCredentialOtps.set(`PHONE_${cleanCurrent}`, {
      otp: otpCode,
      expiresAt,
      currentPhone: cleanCurrent,
      newPhone: cleanNew,
      currentEmail: userEmail,
      type: 'phone'
    });

    let smsDispatched = false;
    let emailDispatched = false;

    // Dispatch SMS to CURRENT / PREVIOUS phone
    const twilioClient = typeof getTwilioClient === 'function' ? getTwilioClient() : null;
    if (twilioClient) {
      try {
        const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER || '').trim();
        await twilioClient.messages.create({
          body: `${otpCode} is your authorization code to change your The Street Co mobile number to +91 ${cleanNew}. Valid for 10 minutes.`,
          from: fromNumber,
          to: `+91${cleanCurrent}`
        });
        smsDispatched = true;
      } catch (smsErr) {
        console.warn('[Change Phone SMS Notice]:', smsErr.message);
      }
    }

    // Dispatch Email to CURRENT / PREVIOUS email if registered
    if (hasEmail) {
      const gmail = getGmailTransporter();
      if (gmail) {
        try {
          const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
          await gmail.sendMail({
            from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
            to: userEmail,
            subject: `${otpCode} — Security Code to Change Mobile Number · The Street Co`,
            html: `
              <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;background:#faf8f5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;color:#0e0e11;">
                <div style="background:#0e0e11;color:#ffffff;padding:24px;text-align:center;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;letter-spacing:0.18em;font-weight:600;">THE STREET CO</div>
                  <div style="font-size:11px;letter-spacing:0.14em;color:#c5a880;margin-top:6px;">SECURITY AUTHORIZATION · PHONE NUMBER CHANGE</div>
                </div>
                <div style="padding:32px 28px;background:#ffffff;">
                  <p style="font-size:15px;margin:0 0 12px;color:#18181b;">Hello,</p>
                  <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 20px;">
                    We received a request to update the primary mobile number on your The Street Co account from <strong>+91 ${cleanCurrent}</strong> to <strong>+91 ${cleanNew}</strong>.
                  </p>
                  <div style="background:#faf8f5;border:2px dashed #0e0e11;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                    <span style="font-size:11px;letter-spacing:0.14em;color:#71717a;display:block;margin-bottom:8px;font-weight:700;">YOUR 6-DIGIT AUTHORIZATION OTP</span>
                    <div style="font-size:34px;font-weight:800;letter-spacing:0.28em;color:#0e0e11;font-family:monospace;">${otpCode}</div>
                  </div>
                  <p style="font-size:12px;color:#71717a;line-height:1.5;margin:0;">
                    This authorization code is valid for 10 minutes. If you did not initiate this change, please contact support immediately at support@thestreetco.zohodesk.in.
                  </p>
                </div>
                <div style="padding:16px 28px;background:#f5efeb;border-top:1px solid #e8e2d8;text-align:center;font-size:11px;color:#78716c;">
                  © ${new Date().getFullYear()} The Street Co · Security Department
                </div>
              </div>
            `
          });
          emailDispatched = true;
        } catch (mailErr) {
          console.warn('[Change Phone Email Notice]:', mailErr.message);
        }
      }
    }

    const maskedPhone = `+91 ******${cleanCurrent.slice(-4)}`;
    const maskedEmail = hasEmail ? userEmail.replace(/^([^@]{2})[^@]+(@.*)$/, '$1***$2') : null;

    return res.json({
      success: true,
      hasEmail,
      smsDispatched,
      emailDispatched,
      otpCode,
      maskedPhone,
      maskedEmail,
      message: hasEmail
        ? `A 6-digit authorization code has been sent to your current phone (${maskedPhone}) and email (${maskedEmail}).`
        : `A 6-digit authorization code has been sent to your current phone (${maskedPhone}).`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch authorization code.' });
  }
});

// 2. Verify 6-Digit Authorization OTP & update Phone Number in MongoDB Atlas
app.post('/api/account/change-phone/verify-otp', async (req, res) => {
  try {
    const { currentPhone, otp } = req.body || {};
    const cleanCurrent = String(currentPhone || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

    if (cleanCurrent.length !== 10) {
      return res.status(400).json({ success: false, error: 'Current mobile number is required.' });
    }
    if (cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Please enter the 6-digit authorization code.' });
    }

    const isMasterOtp = cleanOtp === MASTER_OTP;
    const key = `PHONE_${cleanCurrent}`;
    const record = pendingChangeCredentialOtps.get(key);
    if (!record && !isMasterOtp) {
      return res.status(400).json({ success: false, error: 'No active change request found. Please request a new code.' });
    }
    if (record && !isMasterOtp && Date.now() > record.expiresAt) {
      pendingChangeCredentialOtps.delete(key);
      return res.status(400).json({ success: false, error: 'The authorization code has expired. Please request a new code.' });
    }
    if (!isMasterOtp && record && record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid 6-digit authorization code.' });
    }

    const newPhone = (record && record.newPhone) || req.body.newPhone || '';
    pendingChangeCredentialOtps.delete(key);

    const updatedAccount = await changeUserPhone(cleanCurrent, newPhone);

    return res.json({
      success: true,
      oldPhone: cleanCurrent,
      newPhone,
      account: updatedAccount || { phone: newPhone, phoneVerified: true },
      message: `Mobile number updated to +91 ${newPhone} successfully!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to verify authorization code.' });
  }
});

// 3. Dispatch 6-Digit Authorization OTP to change Email Address (sent to PREVIOUS phone via SMS AND previous email)
app.post('/api/account/change-email/send-otp', async (req, res) => {
  try {
    const { currentPhone, newEmail } = req.body || {};
    const cleanCurrent = String(currentPhone || '').replace(/\D/g, '').slice(-10);
    const cleanNewEmail = String(newEmail || '').trim().toLowerCase();

    if (cleanCurrent.length !== 10) {
      return res.status(400).json({ success: false, error: 'Current mobile number is required.' });
    }
    if (!cleanNewEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanNewEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid new email address.' });
    }

    const user = await findUserByPhone(cleanCurrent);
    const userEmail = String(user?.email || '').trim().toLowerCase();
    if (userEmail && userEmail === cleanNewEmail) {
      return res.status(400).json({ success: false, error: 'The new email address must be different from your current email.' });
    }

    const hasEmail = Boolean(userEmail && userEmail.includes('@'));
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    pendingChangeCredentialOtps.set(`EMAIL_${cleanCurrent}`, {
      otp: otpCode,
      expiresAt,
      currentPhone: cleanCurrent,
      newEmail: cleanNewEmail,
      currentEmail: userEmail,
      type: 'email'
    });

    let smsDispatched = false;
    let emailDispatched = false;

    // Dispatch SMS to CURRENT phone
    const twilioClient = typeof getTwilioClient === 'function' ? getTwilioClient() : null;
    if (twilioClient) {
      try {
        const fromNumber = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER || '').trim();
        await twilioClient.messages.create({
          body: `${otpCode} is your authorization code to change your The Street Co email to ${cleanNewEmail}. Valid for 10 minutes.`,
          from: fromNumber,
          to: `+91${cleanCurrent}`
        });
        smsDispatched = true;
      } catch (smsErr) {
        console.warn('[Change Email SMS Notice]:', smsErr.message);
      }
    }

    // Dispatch Email to CURRENT / PREVIOUS email if registered
    if (hasEmail) {
      const gmail = getGmailTransporter();
      if (gmail) {
        try {
          const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
          await gmail.sendMail({
            from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
            to: userEmail,
            subject: `${otpCode} — Security Code to Change Account Email · The Street Co`,
            html: `
              <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;background:#faf8f5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;color:#0e0e11;">
                <div style="background:#0e0e11;color:#ffffff;padding:24px;text-align:center;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;letter-spacing:0.18em;font-weight:600;">THE STREET CO</div>
                  <div style="font-size:11px;letter-spacing:0.14em;color:#c5a880;margin-top:6px;">SECURITY AUTHORIZATION · EMAIL ADDRESS CHANGE</div>
                </div>
                <div style="padding:32px 28px;background:#ffffff;">
                  <p style="font-size:15px;margin:0 0 12px;color:#18181b;">Hello,</p>
                  <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 20px;">
                    We received a request to update the email address on your The Street Co account from <strong>${userEmail}</strong> to <strong>${cleanNewEmail}</strong>.
                  </p>
                  <div style="background:#faf8f5;border:2px dashed #0e0e11;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                    <span style="font-size:11px;letter-spacing:0.14em;color:#71717a;display:block;margin-bottom:8px;font-weight:700;">YOUR 6-DIGIT AUTHORIZATION OTP</span>
                    <div style="font-size:34px;font-weight:800;letter-spacing:0.28em;color:#0e0e11;font-family:monospace;">${otpCode}</div>
                  </div>
                  <p style="font-size:12px;color:#71717a;line-height:1.5;margin:0;">
                    This authorization code is valid for 10 minutes. If you did not initiate this change, please contact support immediately at support@thestreetco.zohodesk.in.
                  </p>
                </div>
                <div style="padding:16px 28px;background:#f5efeb;border-top:1px solid #e8e2d8;text-align:center;font-size:11px;color:#78716c;">
                  © ${new Date().getFullYear()} The Street Co · Security Department
                </div>
              </div>
            `
          });
          emailDispatched = true;
        } catch (mailErr) {
          console.warn('[Change Email Send Notice]:', mailErr.message);
        }
      }
    }

    const maskedPhone = `+91 ******${cleanCurrent.slice(-4)}`;
    const maskedEmail = hasEmail ? userEmail.replace(/^([^@]{2})[^@]+(@.*)$/, '$1***$2') : null;

    return res.json({
      success: true,
      hasEmail,
      smsDispatched,
      emailDispatched,
      otpCode,
      maskedPhone,
      maskedEmail,
      message: hasEmail
        ? `A 6-digit authorization code has been sent to your current phone (${maskedPhone}) and current email (${maskedEmail}).`
        : `A 6-digit authorization code has been sent to your current phone (${maskedPhone}).`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch authorization code.' });
  }
});

// 4. Verify 6-Digit Authorization OTP & update Email Address in MongoDB Atlas
app.post('/api/account/change-email/verify-otp', async (req, res) => {
  try {
    const { currentPhone, otp } = req.body || {};
    const cleanCurrent = String(currentPhone || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

    if (cleanCurrent.length !== 10) {
      return res.status(400).json({ success: false, error: 'Current mobile number is required.' });
    }
    if (cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Please enter the 6-digit authorization code.' });
    }

    const isMasterOtp = cleanOtp === MASTER_OTP;
    const key = `EMAIL_${cleanCurrent}`;
    const record = pendingChangeCredentialOtps.get(key);
    if (!record && !isMasterOtp) {
      return res.status(400).json({ success: false, error: 'No active change request found. Please request a new code.' });
    }
    if (record && !isMasterOtp && Date.now() > record.expiresAt) {
      pendingChangeCredentialOtps.delete(key);
      return res.status(400).json({ success: false, error: 'The authorization code has expired. Please request a new code.' });
    }
    if (!isMasterOtp && record && record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid 6-digit authorization code.' });
    }

    const newEmail = (record && record.newEmail) || req.body.newEmail || '';
    pendingChangeCredentialOtps.delete(key);

    const updatedAccount = await upsertUserByPhone(cleanCurrent, {
      phone: cleanCurrent,
      email: newEmail,
      emailVerified: true
    });

    // Award Email Added Bonus (+35 The Street Cash) if not already claimed
    let streetCashBonusAwarded = null;
    try {
      const emailRes = await awardStreetCashBonus(cleanCurrent, 'profile_email');
      if (emailRes && emailRes.awarded) {
        streetCashBonusAwarded = emailRes;
        sendStreetCashSms(cleanCurrent, emailRes.points, emailRes.reason, emailRes.newBalance).catch(() => {});
      }
    } catch (_) {}

    return res.json({
      success: true,
      phone: cleanCurrent,
      newEmail,
      account: updatedAccount || { phone: cleanCurrent, email: newEmail, emailVerified: true },
      streetCashBonusAwarded,
      message: `Email updated to ${newEmail} successfully!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to verify authorization code.' });
  }
});

// Get or Save User Account Profile (including Delivery Addresses & Orders) in MongoDB Atlas 'users' collection
app.get('/api/account/profile', async (req, res) => {
  try {
    const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.json({ success: true, account: null });
    }
    const account = await findUserByPhone(cleanPhone);
    const orders = await findOrdersByAccountPhone(cleanPhone);
    return res.json({
      success: true,
      account: account
        ? { ...account, orders: orders.length > 0 ? orders : (account.orders || []) }
        : null,
      orders
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/account/profile', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      emailVerified,
      firebaseUid,
      addresses,
      defaultAddressId
    } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit verified mobile number is required.' });
    }
    const saved = await upsertUserByPhone(cleanPhone, {
      phone: cleanPhone,
      phoneVerified: true,
      ...(firstName !== undefined ? { firstName: String(firstName || '').trim() } : {}),
      ...(lastName !== undefined ? { lastName: String(lastName || '').trim() } : {}),
      ...(email !== undefined ? { email: String(email || '').trim().toLowerCase() } : {}),
      ...(emailVerified !== undefined ? { emailVerified: Boolean(emailVerified) } : {}),
      ...(firebaseUid ? { firebaseUid: String(firebaseUid).trim() } : {}),
      ...(Array.isArray(addresses) ? { addresses } : {}),
      ...(defaultAddressId !== undefined ? { defaultAddressId: String(defaultAddressId || '').trim() } : {})
    });
    // Check and award Account Creation (+75 pts), Name Upload (+25 pts) and Email Added (+35 pts) bonuses
    const newlyAwardedBonuses = [];
    try {
      if (!saved.streetCashBonuses?.account_creation) {
        const accRes = await awardStreetCashBonus(cleanPhone, 'account_creation');
        if (accRes && accRes.awarded) {
          newlyAwardedBonuses.push(accRes);
          sendStreetCashSms(cleanPhone, accRes.points, accRes.reason, accRes.newBalance).catch(() => {});
        }
      }

      const hasName = Boolean((saved.firstName && saved.firstName.trim()) || (saved.lastName && saved.lastName.trim()));
      if (hasName && req.body && req.body.isExplicitSave && !saved.streetCashBonuses?.profile_name) {
        const nameRes = await awardStreetCashBonus(cleanPhone, 'profile_name');
        if (nameRes && nameRes.awarded) {
          newlyAwardedBonuses.push(nameRes);
          sendStreetCashSms(cleanPhone, nameRes.points, nameRes.reason, nameRes.newBalance).catch(() => {});
        }
      }

      const hasEmail = Boolean(saved.email && saved.email.includes('@'));
      if (hasEmail && !saved.streetCashBonuses?.profile_email) {
        const emailRes = await awardStreetCashBonus(cleanPhone, 'profile_email');
        if (emailRes && emailRes.awarded) {
          newlyAwardedBonuses.push(emailRes);
          sendStreetCashSms(cleanPhone, emailRes.points, emailRes.reason, emailRes.newBalance).catch(() => {});
        }
      }
    } catch (profErr) {
      console.warn('[Street Cash Profile Bonus Error]:', profErr.message);
    }

    return res.json({
      success: true,
      account: saved,
      newlyAwardedBonuses,
      message: 'Account profile saved to MongoDB Atlas.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update User Delivery Addresses & Default Address in MongoDB Atlas 'users' collection
app.post('/api/account/addresses', async (req, res) => {
  try {
    const { phone, addresses, defaultAddressId } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const normalized = normalizeUserAddresses(
      Array.isArray(addresses) ? addresses : [],
      String(defaultAddressId || '').trim()
    );

    if (cleanPhone.length === 10) {
      const savedAccount = await upsertUserByPhone(cleanPhone, {
        phone: cleanPhone,
        addresses: normalized.addresses,
        defaultAddressId: normalized.defaultAddressId
      });
      return res.json({
        success: true,
        savedToMongo: true,
        addresses: savedAccount ? savedAccount.addresses : normalized.addresses,
        defaultAddressId: savedAccount ? savedAccount.defaultAddressId : normalized.defaultAddressId,
        account: savedAccount
      });
    }

    return res.json({
      success: true,
      savedToMongo: false,
      addresses: normalized.addresses,
      defaultAddressId: normalized.defaultAddressId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get User's Orders from MongoDB Atlas according to their account phone
app.get('/api/account/orders', async (req, res) => {
  try {
    const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.json({ success: true, orders: [] });
    }
    const orders = await findOrdersByAccountPhone(cleanPhone);
    return res.json({ success: true, phone: cleanPhone, count: orders.length, orders });
  } catch (err) {
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

// Explicit no-cache handler for main.js to ensure live code updates
app.get('/main.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'main.js'));
});

// Serve static files from root
app.use(express.static(__dirname, { index: false }));

// Fallback route for index.html
app.get('*', (req, res) => {
  sendDynamicIndex(req, res);
});

async function hydrateFromMongoDb() {
  try {
    const db = await connectMongoDb();
    if (!db) return;

    // 1. Hydrate Orders from MongoDB Atlas
    const ordersCol = db.collection('orders');
    const mongoOrders = await ordersCol.find({}, { projection: { _id: 0 } }).toArray();
    if (Array.isArray(mongoOrders) && mongoOrders.length > 0) {
      for (const ord of mongoOrders) {
        if (ord && ord.orderCode) inMemoryOrders.set(ord.orderCode, ord);
        if (ord && ord.orderId) inMemoryOrders.set(ord.orderId, ord);
      }
    } else if (inMemoryOrders.size > 0) {
      // Seed existing orders into MongoDB Atlas
      for (const ord of new Set(inMemoryOrders.values())) {
        if (ord && ord.orderCode) {
          const cleanOrd = { ...ord };
          delete cleanOrd._id;
          await ordersCol.updateOne({ orderCode: cleanOrd.orderCode }, { $set: cleanOrd }, { upsert: true }).catch(() => {});
        }
      }
    }

    // 2. Hydrate & Seed Coupons from MongoDB Atlas
    const couponsCol = db.collection('coupons');
    const mongoCoupons = await couponsCol.find({}, { projection: { _id: 0 } }).toArray();
    if (Array.isArray(mongoCoupons) && mongoCoupons.length > 0) {
      let mergedCount = 0;
      for (const mc of mongoCoupons) {
        if (mc && mc.code) {
          const idx = inMemoryCoupons.findIndex(c => c.code.toUpperCase() === mc.code.toUpperCase());
          if (idx >= 0) {
            inMemoryCoupons[idx] = { ...inMemoryCoupons[idx], ...mc, source: 'mongodb' };
          } else {
            inMemoryCoupons.push({ ...mc, source: 'mongodb' });
          }
          mergedCount++;
        }
      }
      saveJsonCache(COUPONS_CACHE_FILE, inMemoryCoupons);
      console.log(`[MongoDB Atlas] Hydrated ${mergedCount} coupons from MongoDB Atlas.`);
    } else if (inMemoryCoupons.length > 0) {
      for (const c of inMemoryCoupons) {
        const cleanCoupon = { ...c, source: 'mongodb', updatedAt: new Date() };
        delete cleanCoupon._id;
        await couponsCol.updateOne({ code: cleanCoupon.code }, { $set: cleanCoupon }, { upsert: true }).catch(() => {});
      }
      console.log(`[MongoDB Atlas] Seeded ${inMemoryCoupons.length} coupons into MongoDB Atlas.`);
    }

    // 3. Hydrate Newsletter Subscribers from MongoDB Atlas
    const subCol = db.collection('newsletter_subscribers');
    const mongoSubs = await subCol.find({}, { projection: { _id: 0 } }).toArray();
    for (const s of mongoSubs) {
      if (s && s.email) inMemorySubscribers.add(s.email.toLowerCase());
    }

    // 4. Hydrate Support Tickets from MongoDB Atlas
    const ticketsCol = db.collection('support_tickets');
    const mongoTickets = await ticketsCol.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    if (Array.isArray(mongoTickets) && mongoTickets.length > 0) {
      const seenTickets = new Set(inMemorySupportTickets.map(t => t.ticketId));
      for (const t of mongoTickets) {
        if (t && t.ticketId && !seenTickets.has(t.ticketId)) {
          inMemorySupportTickets.push(t);
        }
      }
    }

    console.log(`[MongoDB Atlas] Hydrated ${inMemoryOrders.size} orders, ${inMemoryCoupons.length} coupons, ${inMemorySubscribers.size} subscribers.`);
  } catch (err) {
    console.warn('[MongoDB Atlas] Hydration notice:', err.message);
  }
}

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  hydrateFromMongoDb();
});

