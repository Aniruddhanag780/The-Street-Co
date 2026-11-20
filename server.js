import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import * as zohoInventory from './zohoInventory.js';
import { doesZohoSalesOrderBelongToCustomer, mapZohoSalesOrderToAccountOrder } from './zohoOrderHelper.js';
import { renderOrderConfirmationEmail, renderReturnConfirmationEmail, renderShipmentFulfilledEmail, renderEmailOtpEmail } from './emailTemplates.js';
import { verifyUpiPaymentViaImap } from './imapPaymentVerifier.js';
import { classifyStaticRequest } from './staticSecurityHelper.js';
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
  earnCustomStreetCashBonus,
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
const PORT = Number(process.env.PORT) || 3000;
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
const GMAIL_SMTP_PASS = (process.env.GMAIL_SMTP_PASS || 'hybxmdubrjmsddoh').replace(/\s+/g, '').trim();
const GMAIL_SENDER_NAME = (process.env.GMAIL_SENDER_NAME || 'The Street Co').trim();
const GMAIL_REPLY_TO = (process.env.GMAIL_REPLY_TO || process.env.ZOHO_DESK_SUPPORT_EMAIL || 'support@thestreetco.zohodesk.in').trim();
const ZOHO_DESK_SUPPORT_EMAIL = (process.env.ZOHO_DESK_SUPPORT_EMAIL || process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
const ZOHO_DESK_PORTAL_NAME = (process.env.ZOHO_DESK_PORTAL_NAME || 'thestreetco').trim();

// Live Gmail transactional email delivery (active for confirmation & verification emails; can be paused via DISABLE_LIVE_EMAILS=true)
const LIVE_EMAILS_ENABLED = process.env.DISABLE_LIVE_EMAILS !== 'true';
// SMS notifications remain gated unless ENABLE_LIVE_NOTIFICATIONS=true
const LIVE_NOTIFICATIONS_ENABLED = process.env.ENABLE_LIVE_NOTIFICATIONS === 'true';

let gmailTransporter = null;
function getGmailTransporter() {
  if (!LIVE_EMAILS_ENABLED) {
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

  if (!LIVE_EMAILS_ENABLED) {
    console.log(`[Gmail - Dev Paused] Order confirmation email for #${orderCode} to ${recipientEmail} simulated.`);
    return { success: true, simulated: true, pausedInDev: true };
  }

  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const { subject, html: htmlContent, text: plainTextContent, cleanOrderNumber, cidAttachments } = renderOrderConfirmationEmail({
    order,
    hostOrigin,
    useCidAssets: true,
    supportEmail
  });

  // Attach inline CID assets only (do not attach Zoho Invoice PDF to customer emails)
  const mailAttachments = [...cidAttachments];

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
      subject,
      text: plainTextContent,
      html: htmlContent,
      attachments: mailAttachments
    };
    const info = await gmail.sendMail(mailOptions);
    console.log(`[Gmail SMTP] Order confirmation email delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
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

  const orderCode = String(order.orderCode || order.orderId || 'ORDER').replace(/^#/, '').trim();
  const referenceNo = String(order.reference_number || orderCode).replace(/^#/, '').trim();
  const customerName = order?.shippingAddress?.fullName || order?.contactDetails?.fullName || order?.userDetails?.name || 'Valued Customer';
  const storeName = 'The Street Co';
  const supportEmail = 'support@thestreetco.zohodesk.in';

  // Subject: Your Invoice Is Ready – Reference #[referenceNo]
  const subject = `Your Invoice Is Ready – Reference #${referenceNo}`;

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
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${subject}</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    @media (prefers-color-scheme: dark) {
      html, body { background-color: #FAF8F5 !important; color: #1f2937 !important; }
    }
  </style>
</head>
<body bgcolor="#FAF8F5" style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.65;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FAF8F5" style="width: 100%; margin: 0; padding: 0; background-color: #FAF8F5; border: none;">
    
    <!-- Top Full-Width Brand Bar -->
    <tr>
      <td align="center" bgcolor="#FAF8F5" style="background-color: #FAF8F5; border-bottom: 1px solid #e5dfd5; padding: 22px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: 0.12em; text-transform: uppercase;">THE STREET CO</h1>
              <span style="font-size: 11px; color: #6b7280; letter-spacing: 0.1em; text-transform: uppercase;">Official GST Tax Invoice Dispatch</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Message Body (Full Page, clean and crisp) -->
    <tr>
      <td align="center" bgcolor="#FAF8F5" style="padding: 32px 20px 24px; background-color: #FAF8F5;">
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
      <td align="center" bgcolor="#FAF8F5" style="padding: 24px 20px; background-color: #FAF8F5; border-top: 1px solid #e5dfd5; font-size: 11px; color: #9ca3af; text-align: center;">
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

  // 1. Attempt Native Google Gmail SMTP Delivery (without attaching any Zoho PDF)
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
      const info = await gmail.sendMail(mailOptions);
      console.log(`[Gmail SMTP] Dedicated invoice email delivered for Reference #${referenceNo} to ${recipientEmail}. MessageId:`, info.messageId);
      return {
        success: true,
        provider: 'gmail_smtp',
        invoiceNo: referenceNo,
        messageId: info.messageId,
        recipient: recipientEmail,
        hasPdfAttachment: false
      };
    } catch (gmailErr) {
      console.error('[Gmail SMTP] Invoice email delivery failed:', gmailErr.message);
      return {
        success: false,
        provider: 'gmail_smtp',
        invoiceNo: referenceNo,
        error: gmailErr.message,
        recipient: recipientEmail
      };
    }
  }

  return {
    success: false,
    provider: 'gmail_smtp',
    invoiceNo: referenceNo,
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
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const { subject, html: htmlContent, text: plainTextContent, cleanOrderNumber, cidAttachments } = renderShipmentFulfilledEmail({
    order,
    hostOrigin,
    useCidAssets: true,
    supportEmail
  });

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
      html: htmlContent,
      attachments: cidAttachments
    });

    console.log(`[Gmail SMTP] Shipment fulfilled email delivered for #${cleanOrderNumber} (order ${orderCode}) to ${recipientEmail}. MessageId:`, info.messageId);
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
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#18181b !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
      @media (prefers-color-scheme: dark) {
        html, body { background-color:#FAF8F5 !important;color:#18181b !important; }
      }
    </style>
  </head>
  <body bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#FAF8F5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#FAF8F5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Creamy Brand Header -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#FAF8F5;border-bottom:1px solid #e8e2d8;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#0e0e11;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#8a7b6e;text-transform:uppercase;margin-top:6px;">REVERSE LOGISTICS · PICKUP CONFIRMED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Approval Banner -->
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
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
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
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
              <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#3f3f46;">
                Requested Replacement Size: <strong style="color:#0e0e11;background:#FAF8F5;border:1px solid #e8e2d8;padding:2px 8px;border-radius:4px;margin-left:6px;">${returnRecord.requestedSize}</strong>
              </div>
            ` : `
              <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#3f3f46;">
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
          <div style="background:#FAF8F5;color:#18181b;border:1px solid #e8e2d8;border-radius:10px;padding:24px 22px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;color:#8a7b6e;text-transform:uppercase;margin-bottom:8px;">DOORSTEP PICKUP GUIDELINES</div>
            <ol style="font-size:13px;line-height:1.65;color:#52525b;margin:0 0 16px 0;padding-left:18px;">
              <li style="margin-bottom:6px;"><strong style="color:#0e0e11;">Keep Tags Intact:</strong> Please ensure garments remain unworn with original brand tags attached.</li>
              <li style="margin-bottom:6px;"><strong style="color:#0e0e11;">Pack in Bag:</strong> Place the items in any sealed courier bag or the original packaging.</li>
              <li style="margin-bottom:6px;"><strong style="color:#0e0e11;">Zero Reverse Fee:</strong> Hand the parcel to the Delhivery courier agent. Do <em>not</em> pay any courier fee — reverse logistics is 100% free under our 7-Day Guarantee.</li>
              <li><strong style="color:#0e0e11;">${isExchange ? 'Replacement Dispatch:' : 'Fast Refund Credit:'}</strong> ${isExchange ? 'Your replacement size will be dispatched immediately once the return pickup is scanned.' : 'Full amount will be credited to your original payment method or UPI within 24 hours of doorstep scan.'}</li>
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
        <div style="background-color:#FAF8F5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
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
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#18181b !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
      @media (prefers-color-scheme: dark) {
        html, body { background-color:#FAF8F5 !important;color:#18181b !important; }
      }
    </style>
  </head>
  <body bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#FAF8F5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#FAF8F5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Creamy Brand Header -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#FAF8F5;border-bottom:1px solid #e8e2d8;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#0e0e11;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#8a7b6e;text-transform:uppercase;margin-top:6px;">DELHIVERY EXPRESS · PACKED &amp; MANIFESTED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Packed Status Banner -->
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
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
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
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
        <div style="background-color:#FAF8F5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
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
async function sendExchangeRequestSubmittedEmail(returnRecord, hostOrigin = '', linkedOrder = null) {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    linkedOrder?.contactDetails?.email ||
    linkedOrder?.shippingAddress?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for exchange confirmation.' };

  const orderCode = String(returnRecord?.orderCode || '').replace(/^#/, '').trim();
  const order = linkedOrder || inMemoryOrders.get(orderCode) || inMemoryOrders.get(`UCHIHA-${orderCode}`) || {};
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const { subject, html: htmlContent, text: plainTextContent, returnId, cidAttachments } = renderReturnConfirmationEmail({
    returnRecord: { ...returnRecord, type: 'exchange' },
    order,
    hostOrigin,
    useCidAssets: true,
    supportEmail
  });

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
      html: htmlContent,
      attachments: cidAttachments
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
async function sendReturnRequestSubmittedEmail(returnRecord, hostOrigin = '', linkedOrder = null) {
  const recipientEmail = (
    returnRecord?.customerEmail ||
    returnRecord?.email ||
    returnRecord?.shippingAddress?.email ||
    returnRecord?.contactDetails?.email ||
    linkedOrder?.contactDetails?.email ||
    linkedOrder?.shippingAddress?.email ||
    ''
  ).trim();

  if (!recipientEmail) return { success: false, error: 'No recipient email found for return confirmation.' };

  const orderCode = String(returnRecord?.orderCode || '').replace(/^#/, '').trim();
  const order = linkedOrder || inMemoryOrders.get(orderCode) || inMemoryOrders.get(`UCHIHA-${orderCode}`) || {};
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();

  const { subject, html: htmlContent, text: plainTextContent, returnId, cidAttachments } = renderReturnConfirmationEmail({
    returnRecord: { ...returnRecord, type: returnRecord?.type === 'exchange' ? 'exchange' : 'return' },
    order,
    hostOrigin,
    useCidAssets: true,
    supportEmail
  });

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
      html: htmlContent,
      attachments: cidAttachments
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
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#18181b !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
      @media (prefers-color-scheme: dark) {
        html, body { background-color:#FAF8F5 !important;color:#18181b !important; }
      }
    </style>
  </head>
  <body bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#FAF8F5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#FAF8F5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Creamy Brand Header -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#FAF8F5;border-bottom:1px solid #e8e2d8;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#0e0e11;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#8a7b6e;text-transform:uppercase;margin-top:6px;">FINANCIAL CONCIERGE · REFUND SETTLEMENT</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
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
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:20px;margin-bottom:24px;">
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
        <div style="background-color:#FAF8F5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
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
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#18181b !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      p { display:block;margin:12px 0; }
      @media (prefers-color-scheme: dark) {
        html, body { background-color:#FAF8F5 !important;color:#18181b !important; }
      }
    </style>
  </head>
  <body bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;">
    <!-- Outer Creamy Canvas -->
    <div style="width:100%;background-color:#FAF8F5;padding:32px 12px;box-sizing:border-box;">
      
      <!-- Center Luxury Card -->
      <div style="max-width:600px;margin:0 auto;background-color:#FAF8F5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
        
        <!-- Top Creamy Brand Header -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#FAF8F5;border-bottom:1px solid #e8e2d8;">
          <tbody>
            <tr>
              <td style="padding:26px 20px;text-align:center;">
                <a href="${storeUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.2em;color:#0e0e11;text-transform:uppercase;">THE STREET CO</div>
                  <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#8a7b6e;text-transform:uppercase;margin-top:6px;">DELHIVERY EXPRESS · REPLACEMENT DELIVERED</div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Content Area -->
        <div style="padding:32px 28px;">
          
          <!-- Banner -->
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:22px 20px;margin-bottom:26px;text-align:center;">
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
          <div style="background:#FAF8F5;border:1px solid #e8e2d8;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b6e;margin-bottom:8px;">EXCHANGE RECORD SUMMARY</div>
            <div style="font-size:14px;font-weight:700;color:#0e0e11;">${itemName}</div>
            <div style="font-size:13px;color:#3f3f46;margin-top:4px;">
              Delivered Size: <strong style="color:#065f46;background:#FAF8F5;border:1px solid #bbf7d0;padding:2px 8px;border-radius:4px;">${replacementSize}</strong>
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
        <div style="background-color:#FAF8F5;border-top:1px solid #e8e2d8;padding:26px 20px;text-align:center;">
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

  const rawCat = (p.category_name || p.category || 'Oversized T-Shirts').trim();
  const rawColName = (p.collectionName || p.collection || '').trim();
  const itemName = (p.name || p.title || '').trim();
  const cleanColName = (rawColName && rawColName.toLowerCase() !== itemName.toLowerCase())
    ? rawColName
    : ((itemName.toLowerCase().includes('minato')) ? 'Minato Namikaze' : 'Official Collection');

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
    unit: p.unit || 'pcs',
    category_name: rawCat,
    category: rawCat.toLowerCase(),
    collectionName: cleanColName,
    collection: cleanColName.toLowerCase(),
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

// In-memory coupons store hydrated from MongoDB Atlas 'coupons' collection (with DEFAULT_COUPONS fallback)
let inMemoryCoupons = [...DEFAULT_COUPONS];

// ──────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────

// Admin-only download endpoint for zoho_inventory_cache.json
app.get(['/api/download-zoho-cache', '/api/download-cache', '/api/zoho-cache-file'], (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.query.key;
  const expectedKey = process.env.ADMIN_SECRET || 'itachi-admin-secret-2026';
  if (adminKey !== expectedKey) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }
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
    engine: 'Zoho Inventory (Orders & Customers) + MongoDB Atlas (Newsletter & Coupons)',
    mongodb: mongoStatus,
    mongodbCollections: ['newsletter_subscribers', 'coupons'],
    zohoConfigured: zohoStatus.configured,
    zohoCachedItems: zohoStatus.cachedItemsCount,
    ordersCount: inMemoryOrders.size,
    couponsCount: inMemoryCoupons.length,
    currency: 'INR',
    message: mongoStatus.connected
      ? `Connected to Zoho Inventory and MongoDB Atlas (${mongoStatus.cluster} / ${mongoStatus.dbName} — Newsletter & Coupons).`
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
    email: GMAIL_SMTP_USER || 'thestreetco.official@gmail.com',
    connectedAt: null,
    expiresAt: null,
    imapDisabled: false
  };
}

let merchantGmailConfig = loadMerchantGmailConfig();

function getImapCredentials() {
  const user = (process.env.UPI_IMAP_USER || process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER || '').trim();
  const pass = (process.env.UPI_IMAP_PASS || process.env.GMAIL_SMTP_PASS || GMAIL_SMTP_PASS || '').replace(/\s+/g, '').trim();
  return { user, pass, configured: Boolean(user && pass) };
}

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
  merchantGmailConfig.imapDisabled = false;
  merchantGmailConfig.email = email || merchantGmailConfig.email || GMAIL_SMTP_USER || 'thestreetco.official@gmail.com';
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

// GET /api/merchant/gmail-status - Check if IMAP or OAuth token is connected
app.get('/api/merchant/gmail-status', (req, res) => {
  const imap = getImapCredentials();
  const hasOAuth = Boolean(merchantGmailConfig.accessToken);
  const imapActive = imap.configured && !merchantGmailConfig.imapDisabled;
  const connected = hasOAuth || imapActive;
  res.json({
    connected,
    mode: hasOAuth ? 'google_oauth' : (imapActive ? 'gmail_imap' : 'none'),
    email: hasOAuth ? (merchantGmailConfig.email || imap.user) : (imap.user || merchantGmailConfig.email),
    connectedAt: merchantGmailConfig.connectedAt || (imapActive ? new Date().toISOString() : null),
    expiresAt: hasOAuth ? merchantGmailConfig.expiresAt : null
  });
});

// POST /api/merchant/disconnect-gmail - Disconnect token / pause IMAP auto-check
app.post('/api/merchant/disconnect-gmail', (req, res) => {
  merchantGmailConfig.accessToken = null;
  merchantGmailConfig.connectedAt = null;
  merchantGmailConfig.imapDisabled = true;
  saveMerchantGmailConfig(merchantGmailConfig);
  res.json({ success: true, connected: false });
});

// GET /api/verify-payment - Checks Gmail IMAP (or OAuth Gmail API) for FamPay/UPI receipt within checkout window
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
      const imap = getImapCredentials();
      if (!imap.configured || merchantGmailConfig.imapDisabled) {
        return res.json({
          verified: false,
          reason: 'no_token',
          message: 'Merchant Gmail not connected yet. Waiting or use UTR manual submission.'
        });
      }
      const imapResult = await verifyUpiPaymentViaImap({
        user: imap.user,
        pass: imap.pass,
        amount,
        orderId,
        sinceEpoch
      });
      if (imapResult.verified) {
        console.log(`[FamPay Verified via IMAP] Amount: ₹${amount}, MsgId: ${imapResult.messageId}, Subject: ${imapResult.subject}`);
      }
      return res.json(imapResult);
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

// GET /api/coupons (strictly from MongoDB database)
app.get('/api/coupons', async (req, res) => {
  const subtotal = req.query.subtotal ? Math.max(0, Number(req.query.subtotal) || 0) : null;
  const showAll = req.query.all === 'true';

  let list = [];
  try {
    const col = await getCollection('coupons');
    const query = showAll
      ? {}
      : { isPublic: { $ne: false }, status: 'active', isOneTimeUse: { $ne: true }, code: { $not: { $regex: '^STREETCASH' } } };
    list = await col.find(query, { projection: { _id: 0 } }).toArray();
  } catch (err) {
    list = showAll
      ? inMemoryCoupons
      : inMemoryCoupons.filter(c => c.isPublic && c.status === 'active' && !c.isOneTimeUse && !c.code.startsWith('STREETCASH-'));
  }

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
      }
    } catch (_) {}
  }

  if (!matchedCoupon) {
    return res.json({
      valid: false,
      reason: 'not_found',
      message: `❌ Coupon code "${rawCode}" is invalid. Please check the code and enter an exact match.`
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
  let zohoSource = '';
  let zohoCats = { categories: [], collections: [] };

  if (zohoInventory.isZohoConfigured()) {
    try {
      const zohoResult = await zohoInventory.fetchZohoItems(false).catch(() => null);

      if (zohoResult && Array.isArray(zohoResult.items)) {
        zohoItems = zohoResult.items;
        zohoSource = zohoResult.source || '';
      } else if (zohoInventory.tokenState && Array.isArray(zohoInventory.tokenState.cachedItems)) {
        zohoItems = zohoInventory.tokenState.cachedItems;
      }
    } catch (zohoErr) {
      console.warn('[Zoho Inventory] Real-time sync notice:', zohoErr.message);
    }
  }

  // Strictly serve only the active products present in Zoho Inventory
  const cachedZohoItems = zohoInventory.tokenState && Array.isArray(zohoInventory.tokenState.cachedItems)
    ? zohoInventory.tokenState.cachedItems
    : [];
  const hasLiveZohoCatalog = zohoSource === 'zoho_inventory';
  const catalogItems = hasLiveZohoCatalog || zohoItems.length > 0 ? zohoItems : cachedZohoItems;
  const normalized = catalogItems.map(normalizeProduct);

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
    source: hasLiveZohoCatalog ? 'zoho_inventory' : 'zoho_cache',
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

// Runtime session orders buffer in OS tmpdir (Zoho Inventory is authoritative)
const ORDERS_CACHE_FILE = path.join(os.tmpdir(), 'thestreetco_orders_cache.json');
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

// Runtime session returns/exchanges buffer in OS tmpdir (Zoho Inventory is authoritative)
const RETURNS_CACHE_FILE = path.join(os.tmpdir(), 'thestreetco_returns_cache.json');
const savedReturnsList = loadJsonCache(RETURNS_CACHE_FILE, []);
const inMemoryReturns = new Map();
if (Array.isArray(savedReturnsList)) {
  for (const ret of savedReturnsList) {
    if (ret && ret.id) inMemoryReturns.set(ret.id, ret);
    if (ret && ret.orderCode) inMemoryReturns.set(`ORD_${ret.orderCode}`, ret);
  }
}
function persistReturn() {
  saveJsonCache(RETURNS_CACHE_FILE, Array.from(new Set(inMemoryReturns.values())));
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

    const rawPhoneInput = (rawUser.phone || rawUser.phoneNumber || raw.accountPhone || raw.userAccountPhone || '').trim();
    const accountPhone = String(raw.accountPhone || raw.userAccountPhone || rawPhoneInput || '').replace(/\D/g, '').slice(-10);
    const mongoUser = accountPhone.length === 10 ? await findUserByPhone(accountPhone).catch(() => null) : null;
    const accountEmail = String(raw.accountEmail || raw.userAccountEmail || raw.customerEmail || mongoUser?.email || rawUser.email || '').trim().toLowerCase();

    const fullName = (rawUser.fullName || rawUser.name || [mongoUser?.firstName, mongoUser?.lastName].filter(Boolean).join(' ') || 'Valued Customer').trim();
    const phone = (rawUser.phone || rawUser.phoneNumber || accountPhone || '').trim();
    const email = (rawUser.email || accountEmail || '').trim().toLowerCase();
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

    // 4. Full Payment Details (Cash on Delivery only)
    const paymentMethod = 'COD';
    const paymentMethodLabel = 'Cash on Delivery (COD)';
    const paymentStatus = 'PENDING_ON_DELIVERY';

    const transactionId = raw.payment?.transactionId || raw.transactionId || `COD_${Date.now()}`;
    const paymentDetails = {
      method: paymentMethod,
      methodLabel: paymentMethodLabel,
      detail: 'Cash on Delivery (COD) · Pay with cash upon doorstep arrival',
      bank: '',
      status: paymentStatus,
      transactionId: transactionId,
      currency: 'INR (₹)',
      paidAt: now.toISOString()
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

    // 5. Clean Order Document (Initial status: AWAITING_ZOHO_CONFIRMATION)
    // Communications (SMS + email + invoice) are strictly deferred until merchant confirms in Zoho Inventory
    const orderDocument = {
      orderId,
      orderCode,
      accountPhone,
      accountEmail,
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

    // Cache in runtime memory & local file fallback (authoritative storage is Zoho Inventory)
    inMemoryOrders.set(orderCode, orderDocument);
    inMemoryOrders.set(orderId, orderDocument);
    persistOrders(orderDocument);

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

    // Automated Zoho Inventory Sales Order Push upon checkout (auto-confirmed, kept Confirmed — NOT Closed — until fulfilled/shipped)
    let zohoSalesOrderResult = null;
    try {
      zohoSalesOrderResult = await zohoInventory.createSalesOrder(orderDocument);
      if (zohoSalesOrderResult && zohoSalesOrderResult.success) {
        orderDocument.zoho_salesorder_id = zohoSalesOrderResult.zoho_salesorder_id;
        orderDocument.zoho_salesorder_number = zohoSalesOrderResult.zoho_salesorder_number;
        orderDocument.zoho_status = 'confirmed';
        orderDocument.zoho_order_status = 'confirmed';
        orderDocument.invoiceUrl = `/invoice/${orderDocument.orderCode}`;
        delete orderDocument.zoho_sync_error;
        persistOrders(orderDocument);
      } else if (zohoSalesOrderResult && zohoSalesOrderResult.error) {
        orderDocument.zoho_sync_error = zohoSalesOrderResult.error;
        orderDocument.invoiceUrl = `/invoice/${orderDocument.orderCode}`;
        persistOrders(orderDocument);
      }
    } catch (zohoOrderErr) {
      console.warn('[Zoho Inventory] Sales order sync notice:', zohoOrderErr.message);
      zohoSalesOrderResult = { success: false, error: zohoOrderErr.message };
      orderDocument.zoho_sync_error = zohoOrderErr.message;
      orderDocument.invoiceUrl = `/invoice/${orderDocument.orderCode}`;
      persistOrders(orderDocument);
    }

    // Dispatch Order Confirmation Email (View Your Invoice links to storefront GST Tax Invoice until Zoho fulfillment invoice is issued)
    const reqHostOrigin = `${req.protocol}://${req.get('host')}`;
    let confirmationEmailResult = null;
    try {
      confirmationEmailResult = await sendOrderConfirmationEmailGmail(orderDocument, reqHostOrigin);
      if (confirmationEmailResult && confirmationEmailResult.success && !confirmationEmailResult.simulated) {
        orderDocument.confirmationEmailSent = true;
        persistOrders(orderDocument);
      }
    } catch (emailErr) {
      console.warn('[Order Confirmation Email Notice]:', emailErr.message);
      confirmationEmailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      orderCode: orderDocument.orderCode,
      orderId: orderDocument.orderId,
      order: orderDocument,
      zohoSalesOrder: zohoSalesOrderResult,
      zohoInvoice: null,
      invoiceUrl: orderDocument.invoiceUrl || `/invoice/${orderDocument.orderCode}`,
      email: confirmationEmailResult,
      status: orderDocument.status,
      awaitingZohoConfirmation: false,
      message: zohoSalesOrderResult?.success
        ? 'Order placed, confirmed in Zoho Inventory, and order confirmation email sent.'
        : `Order saved locally; Zoho sync notice: ${zohoSalesOrderResult?.error || 'Pending retry'}`
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

  // 0. Ensure Sales Order exists in Zoho Inventory if previously unsynced
  if (!order.zoho_salesorder_id) {
    try {
      const createdSo = await zohoInventory.createSalesOrder(order);
      if (createdSo && createdSo.success && createdSo.zoho_salesorder_id) {
        order.zoho_salesorder_id = createdSo.zoho_salesorder_id;
        order.zoho_salesorder_number = createdSo.zoho_salesorder_number;
        delete order.zoho_sync_error;
      }
    } catch (_) {}
  }

  // 1. Mark confirmed in Zoho Inventory if salesorder_id exists (do NOT convert to Invoice yet so SO stays Confirmed, not Closed)
  if (order.zoho_salesorder_id) {
    await zohoInventory.confirmSalesOrderInZoho(order.zoho_salesorder_id).catch(() => {});
  }
  order.invoiceUrl = `/invoice/${order.orderCode}`;
  let zohoInvoiceResult = order.zoho_invoice_id
    ? {
        success: true,
        alreadyCreated: true,
        invoice_id: order.zoho_invoice_id,
        zoho_invoice_id: order.zoho_invoice_id,
        invoice_number: order.reference_number || order.orderCode,
        invoice_url: `/invoice/${order.orderCode}`
      }
    : null;

  // 3. Update order state to CONFIRMED
  order.status = 'CONFIRMED';
  order.zoho_status = 'confirmed';
  order.confirmedAt = new Date().toISOString();
  persistOrders(order);

  // 4. Dispatch Confirmation SMS and Confirmation Email only (no separate legacy GST invoice email)
  const resolvedHostOrigin = hostOrigin || 'https://thestreetco.com';
  const [smsResult, emailResult] = await Promise.all([
    sendOrderConfirmationSms(order, resolvedHostOrigin).catch(smsErr => {
      console.warn('[Twilio SMS Notice]:', smsErr.message);
      return { success: false, error: smsErr.message };
    }),
    order.confirmationEmailSent
      ? Promise.resolve({ success: true, alreadySentOnPlacement: true })
      : sendOrderConfirmationEmailGmail(order, resolvedHostOrigin).catch(emailErr => {
          console.warn('[Order Email Notice]:', emailErr.message);
          return { success: false, error: emailErr.message };
        })
  ]);

  return {
    success: true,
    orderCode: order.orderCode,
    order,
    zohoInvoice: zohoInvoiceResult,
    sms: smsResult,
    email: emailResult,
    message: `Order Reference #${order.orderCode} confirmed in Zoho Inventory with confirmation email.`
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

  // 1. Mark delivered in Zoho if salesorder_id exists and generate final Zoho Invoice upon fulfillment
  let zohoFulfilledResult = null;
  if (order.zoho_salesorder_id) {
    try {
      zohoFulfilledResult = await zohoInventory.markShipmentFulfilledInZoho(order.zoho_salesorder_id);
      if (!order.zoho_invoice_id || String(order.zoho_invoice_id).startsWith('LOCAL-')) {
        const invRes = await zohoInventory.convertSalesOrderToInvoice(order.zoho_salesorder_id, order).catch(() => null);
        if (invRes && invRes.success) {
          order.invoice_number = order.reference_number || order.orderCode;
          order.invoice_id = invRes.invoice_id;
          order.zoho_invoice_id = invRes.zoho_invoice_id || invRes.invoice_id;
          order.zoho_invoice_url = String(invRes.invoice_url || '').trim();
          order.invoiceUrl = `/invoice/${order.orderCode}`;
          if (order.zoho_invoice_id && !String(order.zoho_invoice_id).startsWith('LOCAL-') && String(order.paymentMethod || 'COD').toUpperCase() !== 'COD') {
            await zohoInventory.recordCustomerPaymentInZoho(order.zoho_invoice_id, order).catch(() => {});
          }
        }
      }
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
    // Attempt to sync any pending unsynced orders into Zoho Inventory (60090378434)
    const seenPending = new Set();
    for (const ord of inMemoryOrders.values()) {
      if (!ord || !ord.orderCode || seenPending.has(ord.orderCode)) continue;
      seenPending.add(ord.orderCode);
      if (!ord.zoho_salesorder_id) {
        const soRes = await zohoInventory.createSalesOrder(ord);
        if (soRes && soRes.success && soRes.zoho_salesorder_id) {
          ord.zoho_salesorder_id = soRes.zoho_salesorder_id;
          ord.zoho_salesorder_number = soRes.zoho_salesorder_number;
          ord.zoho_status = 'confirmed';
          delete ord.zoho_sync_error;
          persistOrders(ord);
        } else {
          break; // Wait for next window if Zoho rate limit is still active
        }
      }
    }

    const seenCodes = new Set();
    const candidateOrders = Array.from(inMemoryOrders.values()).filter(o => {
      if (!o || !o.orderCode || seenCodes.has(o.orderCode)) return false;
      seenCodes.add(o.orderCode);
      return o.zoho_salesorder_id && o.status !== 'DELIVERED' && o.deliveryStatus !== 'DELIVERY_DONE';
    });

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
        const rawInvoiced = String(so.invoiced_status || '').toLowerCase();

        // Keep zoho_status synced without converting unshipped Sales Order to Invoice (prevents premature Closed status)
        const isConfirmedInZoho =
          rawStatus === 'confirmed' ||
          rawStatus === 'open' ||
          rawOrderStat === 'confirmed';

        if (isConfirmedInZoho && order.zoho_status !== 'confirmed') {
          order.zoho_status = 'confirmed';
          order.status = order.status === 'AWAITING_ZOHO_CONFIRMATION' ? 'CONFIRMED' : order.status;
          persistOrders(order);
        }

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

// Start automated background monitoring loop (runs every 10 minutes to conserve Zoho API rate limits; real-time updates also arrive via webhook)
setInterval(() => {
  checkZohoShipmentFulfillments().catch(() => {});
}, 600000);

// Endpoint to inspect automated fulfillment monitor status
app.get('/api/zoho/fulfillment-monitor-status', (req, res) => {
  const isConfigured = zohoInventory.isZohoConfigured();
  const seenCodes = new Set();
  const pendingCount = Array.from(inMemoryOrders.values()).filter(o => {
    if (!o || !o.orderCode || seenCodes.has(o.orderCode)) return false;
    seenCodes.add(o.orderCode);
    return o.zoho_salesorder_id && o.status !== 'DELIVERED' && o.deliveryStatus !== 'DELIVERY_DONE';
  }).length;

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

// Endpoint to trigger or resend Confirmation Email (containing View Your Invoice link) for an order
app.post('/api/orders/:code/send-invoice-email', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const order = inMemoryOrders.get(code);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const hostOrigin = `${req.protocol}://${req.get('host')}`;
  const result = await sendOrderConfirmationEmailGmail(order, hostOrigin);
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

    const orderItemsList = Array.isArray(order?.items) && order.items.length > 0
      ? order.items
      : (Array.isArray(order?.products) ? order.products : []);
    const normalizedReturnItems = (Array.isArray(raw.items) ? raw.items : []).map((it, idx) => {
      const skuKey = String(it?.sku || it?.id || '').trim().toUpperCase();
      const nameKey = String(it?.name || it?.title || '').trim().toLowerCase();
      const matched = orderItemsList.find(oi =>
        (skuKey && String(oi?.sku || oi?.id || '').trim().toUpperCase() === skuKey) ||
        (nameKey && String(oi?.title || oi?.name || '').trim().toLowerCase() === nameKey)
      ) || orderItemsList[idx] || orderItemsList[0] || {};
      const qty = Math.max(1, parseInt(it?.qty || it?.quantity || matched?.qty || matched?.quantity || 1, 10) || 1);
      const unitPrice = Number(it?.priceInr || it?.price || matched?.priceInr || matched?.price || 1599);
      return {
        ...it,
        sku: it?.sku || matched?.sku || matched?.id || 'TS-MIN-001',
        name: it?.name || it?.title || matched?.title || matched?.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt',
        size: it?.size || matched?.size || 'M',
        finish: it?.finish || it?.color || matched?.finish || matched?.color || 'Obsidian Black',
        qty,
        priceInr: unitPrice,
        totalItemPriceInr: Number(it?.totalItemPriceInr || (unitPrice * qty)),
        image: it?.image || it?.imageUrl || matched?.image || matched?.imageUrl || '/api/product-image'
      };
    });

    const returnRecord = {
      id: returnId,
      orderCode,
      type,
      items: normalizedReturnItems,
      itemNames: raw.itemNames || (normalizedReturnItems.length > 0 ? normalizedReturnItems.map(i => i.name).join(', ') : 'Streetwear Garment'),
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
        if (zohoSalesReturnResult.zoho_salesreturn_id) {
          returnRecord.zoho_salesreturn_id = zohoSalesReturnResult.zoho_salesreturn_id;
        }
        if (zohoSalesReturnResult.salesreturn_number) {
          returnRecord.salesreturn_number = zohoSalesReturnResult.salesreturn_number;
        }
        if (zohoSalesReturnResult.zoho_salesorder_id) {
          returnRecord.zoho_salesorder_id = zohoSalesReturnResult.zoho_salesorder_id;
          if (order) {
            order.zoho_salesorder_id = zohoSalesReturnResult.zoho_salesorder_id;
            if (zohoSalesReturnResult.zoho_salesorder_number) {
              order.zoho_salesorder_number = zohoSalesReturnResult.zoho_salesorder_number;
            }
          }
        }
        returnRecord.zoho_synced = Boolean(zohoSalesReturnResult.zohoSynced && zohoSalesReturnResult.zoho_salesreturn_id);
        returnRecord.zoho_sync_error = zohoSalesReturnResult.zohoError || null;
      }
    } catch (zErr) {
      console.warn('[Zoho createSalesReturnInZoho Notice]:', zErr.message);
      returnRecord.zoho_synced = false;
      returnRecord.zoho_sync_error = zErr.message;
    }

    inMemoryReturns.set(returnId, returnRecord);
    inMemoryReturns.set(`ORD_${orderCode}`, returnRecord);
    persistReturn(returnRecord);

    if (!order && orderCode) {
      const cleanAccPhone = String(customerPhone || '').replace(/\D/g, '').slice(-10);
      order = {
        orderCode,
        orderId: orderCode,
        accountPhone: cleanAccPhone,
        orderDate: new Date().toISOString(),
        status: 'DELIVERED',
        items: normalizedReturnItems,
        products: normalizedReturnItems,
        subtotalInr: normalizedReturnItems.reduce((s, it) => s + Number(it.totalItemPriceInr || 1599), 0),
        grandTotalInr: normalizedReturnItems.reduce((s, it) => s + Number(it.totalItemPriceInr || 1599), 0),
        shippingAddress: {
          fullName: customerName,
          phone: cleanAccPhone,
          email: customerEmail,
          fullAddress: pickupAddress
        },
        contactDetails: {
          fullName: customerName,
          phone: cleanAccPhone,
          email: customerEmail
        },
        zoho_salesorder_id: returnRecord.zoho_salesorder_id || null,
        zoho_salesorder_number: zohoSalesReturnResult?.zoho_salesorder_number || ''
      };
      inMemoryOrders.set(orderCode, order);
    }

    if (order) {
      order.returnStatus = type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED';
      order.returnRequest = returnRecord;
      persistOrders(order);
    }

    // 5 & 6. Dispatch Confirmation of Exchange or Confirmation of Return email to customer
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    let submissionEmailResult = null;
    if (type === 'exchange') {
      submissionEmailResult = await sendExchangeRequestSubmittedEmail(returnRecord, hostOrigin, order).catch(e => {
        console.warn('[Exchange Submission Email Notice]:', e.message);
        return { success: false, error: e.message };
      });
    } else {
      submissionEmailResult = await sendReturnRequestSubmittedEmail(returnRecord, hostOrigin, order).catch(e => {
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
      message: returnRecord.zoho_synced
        ? `${type === 'exchange' ? 'Size exchange' : 'Return'} saved and registered in Zoho Inventory as Sales Return (${returnRecord.salesreturn_number}). Confirmation email dispatched to customer.`
        : `${type === 'exchange' ? 'Size exchange' : 'Return'} saved locally (${returnRecord.id}). Zoho sync note: ${returnRecord.zoho_sync_error || 'Pending Zoho sync'}`
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

    // 1. Collect any Zoho Sales Return IDs to delete from Zoho Inventory & remove from inMemoryReturns map
    const zohoReturnIdsToDelete = new Set();
    if (returnId && inMemoryReturns.get(returnId)?.zoho_salesreturn_id) {
      zohoReturnIdsToDelete.add(inMemoryReturns.get(returnId).zoho_salesreturn_id);
    }
    if (returnId) inMemoryReturns.delete(returnId);
    if (orderCode) {
      if (inMemoryReturns.get(`ORD_${orderCode}`)?.zoho_salesreturn_id) {
        zohoReturnIdsToDelete.add(inMemoryReturns.get(`ORD_${orderCode}`).zoho_salesreturn_id);
      }
      inMemoryReturns.delete(`ORD_${orderCode}`);
      for (const [key, val] of inMemoryReturns.entries()) {
        if (!val) continue;
        const c = String(val.orderCode || '').trim().toUpperCase().replace(/^#/, '');
        const rid = String(val.id || '').trim().toUpperCase();
        if (c === orderCode || (returnId && rid === returnId)) {
          if (val.zoho_salesreturn_id) zohoReturnIdsToDelete.add(val.zoho_salesreturn_id);
          inMemoryReturns.delete(key);
        }
      }
    }
    for (const srId of zohoReturnIdsToDelete) {
      await zohoInventory.deleteSalesReturnInZoho(srId).catch(() => {});
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
      ? `Subscribed ${cleanEmail} to limited drop & restock alerts.`
      : `${cleanEmail} is already subscribed to drop alerts.`
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
          <div style="background-color:#FAF8F5;padding:24px 12px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#18181B;">
            <div style="background:#FAF8F5;color:#18181B;padding:24px;border:1px solid #E8E2D8;border-radius:12px;max-width:560px;margin:0 auto;">
              <div style="font-size:11px;color:#8A7B6E;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">THE STREET CO · CLIENT CONCIERGE</div>
              <h2 style="margin:0 0 16px;color:#0E0E11;font-size:20px;font-family:'Playfair Display',Georgia,serif;">NEW SUPPORT TICKET #${ticketId}</h2>
              <div style="background:#FAF8F5;padding:16px;border-radius:8px;border:1px solid #E8E2D8;margin-bottom:16px;font-size:13px;line-height:22px;">
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Customer Name:</strong> ${cleanName}</p>
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Email:</strong> <a href="mailto:${cleanEmail}" style="color:#0E0E11;">${cleanEmail}</a></p>
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Phone:</strong> ${cleanPhone || 'Not provided'}</p>
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Category:</strong> ${cleanCategory}</p>
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Order Reference:</strong> ${cleanOrderNumber || 'N/A'}</p>
                <p style="margin:3px 0;"><strong style="color:#0E0E11;">Logged At:</strong> ${istTime.istDateTime}</p>
              </div>
              <div style="background:#FAF8F5;padding:16px;border-radius:8px;border:1px solid #E8E2D8;font-size:13px;">
                <strong style="display:block;margin-bottom:8px;color:#8A7B6E;letter-spacing:0.06em;font-size:11px;text-transform:uppercase;">CUSTOMER INQUIRY MESSAGE:</strong>
                <p style="white-space:pre-wrap;line-height:1.6;color:#3F3F46;margin:0;">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
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
          <div style="background:#FAF8F5;padding:28px 12px;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#171717;">
            <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#FAF8F5;color:#171717;border:1px solid #e8e2d8;border-radius:10px;">
              <p style="font-size:11px;letter-spacing:0.18em;color:#8a7b6e;font-weight:700;margin:0 0 8px;">THE STREET CO · DROP VAULT PRIORITY PASS</p>
              <h2 style="font-size:22px;margin:0 0 12px;color:#111111;">You're on the Early Access List</h2>
              <p style="font-size:14px;line-height:1.6;color:#52525b;">Your priority reservation for <strong style="color:#111111;">${record.dropTitle}</strong> (Preferred Size: <strong style="color:#111111;">${record.preferredSize}</strong>) has been locked in.</p>
              <div style="background:#FAF8F5;border:1px solid #e5dfd5;padding:14px 18px;border-radius:6px;margin:18px 0;">
                <div style="font-size:11px;color:#78716c;font-weight:700;letter-spacing:0.08em;">PRIORITY RESERVATION ID</div>
                <div style="font-size:18px;font-weight:700;color:#111111;letter-spacing:0.08em;margin-top:4px;">${reservationCode}</div>
              </div>
              <p style="font-size:12px;color:#78716c;margin-top:16px;">You will receive your private early-access checkout link 30 minutes before the public release.</p>
            </div>
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
// LOYALTY / STREET CASH ROUTES (Permanently Disabled)
// ─────────────────────────────────────────────────────────────────────────────
app.all(['/api/loyalty', '/api/loyalty/status', '/api/street-cash', '/api/loyalty/sync-missions', '/api/loyalty/claim-mission', '/api/loyalty/redeem', '/api/loyalty/ai-concierge', '/api/loyalty/earn'], (req, res) => {
  return res.status(410).json({
    success: false,
    disabled: true,
    error: 'The points / Street Cash system has been permanently removed.'
  });
});

// 3. Self-Service Order Lookup & 7-Day Size Exchange Portal
const SIZE_EXCHANGES_FILE = path.join(__dirname, 'size_exchanges.json');
let inMemoryExchanges = loadJsonCache(SIZE_EXCHANGES_FILE, []);
if (!Array.isArray(inMemoryExchanges)) inMemoryExchanges = [];

// No demo/test orders seeded in memory

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

    // Send confirmation email if available
    const transporter = getGmailTransporter();
    if (transporter && exchangeRecord.customerEmail) {
      transporter.sendMail({
        from: `"${GMAIL_SENDER_NAME}" <${GMAIL_SMTP_USER}>`,
        to: exchangeRecord.customerEmail,
        replyTo: GMAIL_REPLY_TO,
        subject: `7-Day Size Exchange Confirmed (#${exchangeId}) for Order #${exchangeRecord.orderCode}`,
        html: `
          <div style="background:#FAF8F5;padding:28px 12px;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#18181b;">
            <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF8F5;color:#18181b;border:1px solid #e8e2d8;border-radius:8px;">
              <p style="font-size:11px;letter-spacing:0.15em;color:#78716c;margin:0 0 6px;">THE STREET CO · 7-DAY EASY EXCHANGE</p>
              <h2 style="font-size:20px;margin:0 0 12px;color:#111111;">Exchange Request #${exchangeId} Approved</h2>
              <p style="font-size:14px;line-height:1.6;color:#3f3f46;">We have scheduled a free reverse pickup for <strong>${exchangeRecord.itemName}</strong> from Order <strong>#${exchangeRecord.orderCode}</strong>.</p>
              <div style="background:#FAF8F5;border:1px solid #e5dfd5;padding:14px;border-radius:6px;margin:16px 0;font-size:13px;line-height:1.7;">
                <div><strong>Resolution:</strong> ${exchangeRecord.resolutionType}</div>
                <div><strong>Size Change:</strong> Size ${exchangeRecord.currentSize} → Size ${exchangeRecord.requestedSize}</div>
                <div><strong>Reverse Pickup Date:</strong> ${exchangeRecord.scheduledPickupDate} via Delhivery Express</div>
              </div>
              <p style="font-size:12px;color:#78716c;">Please keep the original garment tags intact for doorstep verification.</p>
            </div>
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
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. 6-DIGIT PHONE / EMAIL OTP VERIFICATION ROUTES (CUSTOMERS SYNCED TO ZOHO INVENTORY)
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

    return res.json({
      success: true,
      verified: true,
      phone: cleanPhone,
      account: mongoAccount || { phone: cleanPhone, phoneVerified: true },
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
        const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
        const { subject, html, text, cidAttachments } = renderEmailOtpEmail({
          otpCode,
          recipientName: fullName,
          recipientEmail: cleanEmail,
          heading: 'Email Verification',
          codeLabel: 'Verification OTP',
          useCidAssets: true,
          supportEmail
        });
        await gmail.sendMail({
          from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
          to: cleanEmail,
          subject,
          text,
          html,
          attachments: cidAttachments
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
          const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
          const { subject, html, text, cidAttachments } = renderEmailOtpEmail({
            otpCode,
            recipientName: user?.firstName || 'Customer',
            heading: 'Phone Number Change',
            bodyLineHtml: `We received a request to update the primary mobile number on your The Street Co account from <strong style="color:#171717 !important;font-weight:600;">+91 ${cleanCurrent}</strong> to <strong style="color:#171717 !important;font-weight:600;">+91 ${cleanNew}</strong>.`,
            codeLabel: 'Authorization OTP',
            validityNote: 'This authorization code is valid for 10 minutes. If you did not initiate this change, please contact support immediately.',
            subject: `${otpCode} — Security Code to Change Mobile Number · The Street Co`,
            useCidAssets: true,
            supportEmail
          });
          await gmail.sendMail({
            from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
            to: userEmail,
            subject,
            text,
            html,
            attachments: cidAttachments
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
      message: `A 6-digit authorization code has been sent to your old registered mobile number (${maskedPhone}).`
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
          const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
          const { subject, html, text, cidAttachments } = renderEmailOtpEmail({
            otpCode,
            recipientName: user?.firstName || 'Customer',
            heading: 'Email Address Change',
            bodyLineHtml: `We received a request to update the email address on your The Street Co account from <strong style="color:#171717 !important;font-weight:600;"><a href="#" style="color:#171717 !important;text-decoration:none !important;pointer-events:none;cursor:text;"><span style="color:#171717 !important;">${userEmail}</span></a></strong> to <strong style="color:#171717 !important;font-weight:600;"><a href="#" style="color:#171717 !important;text-decoration:none !important;pointer-events:none;cursor:text;"><span style="color:#171717 !important;">${cleanNewEmail}</span></a></strong>.`,
            codeLabel: 'Authorization OTP',
            validityNote: 'This authorization code is valid for 10 minutes. If you did not initiate this change, please contact support immediately.',
            subject: `${otpCode} — Security Code to Change Account Email · The Street Co`,
            useCidAssets: true,
            supportEmail
          });
          await gmail.sendMail({
            from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
            to: userEmail,
            subject,
            text,
            html,
            attachments: cidAttachments
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
        ? `A 6-digit authorization code has been sent to your old registered email (${maskedEmail}).`
        : `A 6-digit authorization code has been sent to your old registered mobile number (${maskedPhone}).`
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

    return res.json({
      success: true,
      phone: cleanCurrent,
      newEmail,
      account: updatedAccount || { phone: cleanCurrent, email: newEmail, emailVerified: true },
      message: `Email updated to ${newEmail} successfully!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to verify authorization code.' });
  }
});

// Get Customer Orders strictly from live Zoho Inventory Customer Orders
async function getAuthoritativeAccountOrders(cleanPhone = '', cleanEmail = '') {
  const localEnriched = enrichOrdersWithInMemoryState([], cleanPhone);

  // Build lookup maps for enriching Zoho Sales Orders with storefront item photos & local return state
  const localByZohoId = new Map();
  const localByCode = new Map();
  for (const memOrd of inMemoryOrders.values()) {
    if (!memOrd) continue;
    if (memOrd.zoho_salesorder_id && !localByZohoId.has(String(memOrd.zoho_salesorder_id).trim())) {
      localByZohoId.set(String(memOrd.zoho_salesorder_id).trim(), memOrd);
    }
    const codeKey = String(memOrd.orderCode || memOrd.orderId || '').replace(/^#/, '').trim().toUpperCase();
    if (codeKey && !localByCode.has(codeKey)) localByCode.set(codeKey, memOrd);
  }

  const zohoResult = await zohoInventory.fetchCustomerSalesOrders(cleanPhone, cleanEmail);
  if (zohoResult && zohoResult.zohoSynced) {
    const cachedItems = zohoInventory.tokenState?.cachedItems || [];
    const matchedOrders = [];
    for (const so of (zohoResult.salesorders || [])) {
      const refCode = String(so.reference_number || '').replace(/^#/, '').trim().toUpperCase();
      const baseLocal = localByZohoId.get(String(so.salesorder_id || '').trim()) || (refCode ? localByCode.get(refCode) : null) || null;
      const belongs = doesZohoSalesOrderBelongToCustomer(so, {
        cleanPhone,
        cleanEmail,
        matchedCustomerIds: zohoResult.matchedCustomerIds || [],
        knownLocalOrder: baseLocal
      });
      if (!belongs) continue;

      const resolvedCode = refCode || String(baseLocal?.orderCode || so.salesorder_number || '').replace(/^#/, '').trim().toUpperCase();
      const memRet = (resolvedCode && inMemoryReturns.get(`ORD_${resolvedCode}`)) || null;
      matchedOrders.push(
        mapZohoSalesOrderToAccountOrder(so, {
          baseLocal,
          cachedItems,
          inMemoryReturn: memRet,
          cleanPhone
        })
      );
    }
    return { zohoSynced: true, orders: matchedOrders };
  }

  return { zohoSynced: false, orders: localEnriched };
}

app.get('/api/account/profile', async (req, res) => {
  try {
    const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.json({ success: true, account: null, orders: [], zohoSynced: false });
    }
    let account = await findUserByPhone(cleanPhone);
    if (!account || (!account.email && (!account.addresses || account.addresses.length === 0))) {
      const zohoProfile = await zohoInventory.fetchCustomerProfileFromZoho(cleanPhone).catch(() => null);
      if (zohoProfile) {
        account = await upsertUserByPhone(cleanPhone, {
          firstName: account?.firstName || zohoProfile.firstName,
          lastName: account?.lastName || zohoProfile.lastName,
          email: account?.email || zohoProfile.email,
          emailVerified: account?.emailVerified || Boolean(zohoProfile.email),
          addresses: (account?.addresses && account.addresses.length > 0) ? account.addresses : zohoProfile.addresses,
          defaultAddressId: account?.defaultAddressId || zohoProfile.defaultAddressId
        });
      }
    }
    const { zohoSynced, orders } = await getAuthoritativeAccountOrders(cleanPhone, account?.email || '');
    return res.json({
      success: true,
      zohoSynced,
      account: account
        ? { ...account, orders }
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
      ...(Array.isArray(addresses) ? { addresses } : {}),
      ...(defaultAddressId !== undefined ? { defaultAddressId: String(defaultAddressId || '').trim() } : {})
    });

    // Sync customer profile details to Zoho Inventory Customer Contact in background
    if (saved) {
      const defAddr = saved.addresses?.find(a => a.isDefault) || saved.addresses?.[0] || {};
      zohoInventory.findOrCreateContact({
        fullName: saved.fullName || defAddr.fullName || 'Storefront Customer',
        phone: cleanPhone,
        email: saved.email || defAddr.email || '',
        address: defAddr.fullAddress || defAddr.address1 || '',
        city: defAddr.city || '',
        state: defAddr.state || '',
        pincode: defAddr.pincode || ''
      }).catch(() => {});
    }

    return res.json({
      success: true,
      account: saved,
      message: 'Account profile saved and synced with Zoho Inventory.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update User Delivery Addresses & Default Address (synced to Zoho Customer Contact)
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
      if (savedAccount) {
        const defAddr = savedAccount.addresses?.find(a => a.isDefault) || savedAccount.addresses?.[0] || {};
        zohoInventory.findOrCreateContact({
          fullName: savedAccount.fullName || defAddr.fullName || 'Storefront Customer',
          phone: cleanPhone,
          email: savedAccount.email || defAddr.email || '',
          address: defAddr.fullAddress || defAddr.address1 || '',
          city: defAddr.city || '',
          state: defAddr.state || '',
          pincode: defAddr.pincode || ''
        }).catch(() => {});
      }
      return res.json({
        success: true,
        addresses: savedAccount ? savedAccount.addresses : normalized.addresses,
        defaultAddressId: savedAccount ? savedAccount.defaultAddressId : normalized.defaultAddressId,
        account: savedAccount
      });
    }

    return res.json({
      success: true,
      addresses: normalized.addresses,
      defaultAddressId: normalized.defaultAddressId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function enrichOrdersWithInMemoryState(baseOrders = [], cleanPhone = '') {
  const seen = new Map();
  for (const ord of (Array.isArray(baseOrders) ? baseOrders : [])) {
    if (!ord) continue;
    const code = String(ord.orderCode || ord.orderId || '').replace(/^#/, '').trim().toUpperCase();
    if (!code) continue;
    const memOrd = inMemoryOrders.get(code) || inMemoryOrders.get(`UCHIHA-${code}`);
    const memRet = inMemoryReturns.get(`ORD_${code}`) || memOrd?.returnRequest || ord.returnRequest || null;
    const activeRet = (memRet && memRet.status !== 'CANCELLED') ? memRet : null;
    seen.set(code, {
      ...ord,
      ...(memOrd ? {
        status: memOrd.status || ord.status,
        zoho_salesorder_id: memOrd.zoho_salesorder_id || ord.zoho_salesorder_id,
        zoho_salesorder_number: memOrd.zoho_salesorder_number || ord.zoho_salesorder_number,
        zoho_invoice_url: memOrd.zoho_invoice_url || ord.zoho_invoice_url
      } : {}),
      ...(activeRet ? {
        returnRequest: activeRet,
        returnStatus: activeRet.type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED'
      } : {})
    });
  }

  // Also include any inMemoryOrders for this phone that weren't in baseOrders yet
  if (cleanPhone && cleanPhone.length === 10) {
    for (const memOrd of inMemoryOrders.values()) {
      if (!memOrd) continue;
      const code = String(memOrd.orderCode || memOrd.orderId || '').replace(/^#/, '').trim().toUpperCase();
      if (!code || seen.has(code)) continue;
      const ordPhone = String(memOrd.accountPhone || memOrd.shippingAddress?.phone || memOrd.contactDetails?.phone || '').replace(/\D/g, '').slice(-10);
      if (ordPhone === cleanPhone) {
        const memRet = inMemoryReturns.get(`ORD_${code}`) || memOrd.returnRequest || null;
        const activeRet = (memRet && memRet.status !== 'CANCELLED') ? memRet : null;
        seen.set(code, {
          ...memOrd,
          ...(activeRet ? {
            returnRequest: activeRet,
            returnStatus: activeRet.type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED'
          } : {})
        });
      }
    }
  }

  return Array.from(seen.values());
}

// Get User's Orders strictly from live Zoho Inventory Customer Orders (not stale/deleted local orders)
app.get('/api/account/orders', async (req, res) => {
  try {
    const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.json({ success: true, zohoSynced: false, orders: [] });
    }
    const account = await findUserByPhone(cleanPhone).catch(() => null);
    const { zohoSynced, orders } = await getAuthoritativeAccountOrders(cleanPhone, account?.email || '');
    return res.json({ success: true, zohoSynced, phone: cleanPhone, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ZOHO INVENTORY MANAGEMENT & SYNC ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Status & diagnostic check
app.get('/api/zoho-inventory/status', async (req, res) => {
  const organizations = await zohoInventory.listOrganizations().catch(() => []);
  res.json({
    success: true,
    zoho: zohoInventory.getStatus(),
    organizations,
    timestamp: new Date().toISOString()
  });
});

// Sync unsynced local orders, sales/invoices, and returns to Zoho Inventory
app.post('/api/zoho/sync-pending', async (req, res) => {
  if (!zohoInventory.isZohoConfigured()) {
    return res.status(400).json({ success: false, error: 'Zoho Inventory is not configured.' });
  }
  const forceResync = Boolean(req.body && req.body.forceResync);
  const results = { ordersSynced: 0, invoicesSynced: 0, returnsSynced: 0, errors: [] };
  try {
    const seenOrderCodes = new Set();
    const uniqueOrders = [];
    for (const ord of inMemoryOrders.values()) {
      if (ord && ord.orderCode && !seenOrderCodes.has(ord.orderCode)) {
        seenOrderCodes.add(ord.orderCode);
        uniqueOrders.push(ord);
      }
    }
    for (const order of uniqueOrders) {
      if (!order || !order.orderCode) continue;
      const needsSync = forceResync || !order.zoho_salesorder_id;
      if (needsSync) {
        const soRes = await zohoInventory.createSalesOrder(order);
        if (soRes && soRes.success && soRes.zoho_salesorder_id) {
          order.zoho_salesorder_id = soRes.zoho_salesorder_id;
          order.zoho_salesorder_number = soRes.zoho_salesorder_number;
          order.zoho_status = 'confirmed';
          await zohoInventory.confirmSalesOrderInZoho(soRes.zoho_salesorder_id).catch(() => {});
          if (order.status === 'DELIVERED' || order.fulfillment_status === 'fulfilled') {
            const invRes = await zohoInventory.convertSalesOrderToInvoice(soRes.zoho_salesorder_id, order).catch(() => null);
            if (invRes && (invRes.zoho_invoice_id || invRes.invoice_id)) {
              order.zoho_invoice_id = invRes.zoho_invoice_id || invRes.invoice_id;
              order.zoho_invoice_number = invRes.invoice_number;
              order.zoho_invoice_url = invRes.invoice_url || `/invoice/${order.orderCode}`;
              results.invoicesSynced++;
            }
          }
          delete order.zoho_sync_error;
          persistOrders(order);
          results.ordersSynced++;
        } else if (soRes && soRes.error) {
          order.zoho_sync_error = soRes.error;
          results.errors.push(`Order ${order.orderCode}: ${soRes.error}`);
        }
      }
    }

    const uniqueReturns = Array.from(new Set(inMemoryReturns.values()));
    for (const ret of uniqueReturns) {
      if (!ret || !ret.id) continue;
      if (!ret.zoho_salesreturn_id) {
        const ord = inMemoryOrders.get(ret.orderCode) || inMemoryOrders.get(`UCHIHA-${ret.orderCode}`) || {};
        const srRes = await zohoInventory.createSalesReturnInZoho(ret, ord);
        if (srRes && srRes.zohoSynced && srRes.zoho_salesreturn_id) {
          ret.zoho_salesreturn_id = srRes.zoho_salesreturn_id;
          ret.salesreturn_number = srRes.salesreturn_number;
          ret.zoho_salesorder_id = srRes.zoho_salesorder_id || ret.zoho_salesorder_id;
          ret.zoho_synced = true;
          ret.zoho_sync_error = null;
          persistReturn(ret);
          results.returnsSynced++;
        } else if (srRes && srRes.zohoError) {
          ret.zoho_sync_error = srRes.zohoError;
          results.errors.push(`Return ${ret.id}: ${srRes.zohoError}`);
        }
      }
    }

    res.json({
      success: true,
      ...results,
      organization_id: zohoInventory.config.orgId,
      message: `Synced ${results.ordersSynced} order(s), ${results.invoicesSynced} invoice(s), and ${results.returnsSynced} return(s) to Zoho Inventory.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, ...results });
  }
});

// Trigger full catalog sync from Zoho Inventory
app.post('/api/zoho-inventory/sync', async (req, res) => {
  try {
    const result = await zohoInventory.fetchZohoItems(true);
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

const zohoImageBufferCache = new Map();

async function getCachedZohoProductImageUrl() {
  let cachedItems = Array.isArray(zohoInventory.tokenState?.cachedItems) ? zohoInventory.tokenState.cachedItems : [];
  if (!cachedItems.length && zohoInventory.isZohoConfigured()) {
    const result = await zohoInventory.fetchZohoItems(false);
    cachedItems = Array.isArray(result.items) ? result.items : [];
  }
  const product = cachedItems.find(item => String(item.sku || '').toUpperCase() === 'TS-MIN-001')
    || cachedItems.find(item => item.imageUrl || (Array.isArray(item.images) && item.images.length));
  return [product?.imageUrl, ...(Array.isArray(product?.images) ? product.images : [])]
    .find(url => typeof url === 'string' && url && !/(?:^|\/)(?:api\/product-image|product-minato\.jpg)(?:[?#]|$)/i.test(url)) || '';
}

app.get(['/api/product-image', '/product-minato.jpg'], async (req, res) => {
  const imageUrl = await getCachedZohoProductImageUrl();
  if (!imageUrl) return res.status(404).send('No Zoho product image is available.');
  return res.redirect(imageUrl);
});

// Proxy Zoho Inventory Item Images with OAuth Token & Memory Cache
app.get('/api/zoho-inventory/items/:itemId/image', async (req, res) => {
  try {
    const { itemId } = req.params;
    const cacheKey = `item_${itemId}`;
    if (zohoImageBufferCache.has(cacheKey)) {
      const cached = zohoImageBufferCache.get(cacheKey);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }
    if (zohoInventory.isZohoConfigured()) {
      const token = await zohoInventory.getAccessToken();
      const url = `${zohoInventory.getApiBaseUrl()}/items/${itemId}/image?organization_id=${zohoInventory.config.orgId}`;
      const zohoRes = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      if (zohoRes.ok) {
        const contentType = zohoRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await zohoRes.arrayBuffer());
        zohoImageBufferCache.set(cacheKey, { contentType, buffer });
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }
  } catch (err) {
    console.warn('[Server Zoho Item Image Proxy Note]:', err.message);
  }

  res.status(404).json({ error: 'Zoho item image not found.' });
});

// Proxy Zoho Inventory Document Images
app.get('/api/zoho-inventory/documents/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const cacheKey = `doc_${docId}`;
    if (docId && zohoImageBufferCache.has(cacheKey)) {
      const cached = zohoImageBufferCache.get(cacheKey);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }
    if (docId && zohoInventory.isZohoConfigured()) {
      const token = await zohoInventory.getAccessToken();
      const url = `${zohoInventory.getApiBaseUrl()}/documents/${docId}?organization_id=${zohoInventory.config.orgId}`;
      const zohoRes = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      if (zohoRes.ok) {
        const contentType = zohoRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await zohoRes.arrayBuffer());
        zohoImageBufferCache.set(cacheKey, { contentType, buffer });
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }
  } catch (err) {
    console.warn('[Server Zoho Document Proxy Note]:', err.message);
  }

  res.status(404).json({ error: 'Zoho document image not found.' });
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

// View printable GST Tax Invoice HTML using Reference# (Zoho Inventory live lookup)
app.get(['/api/orders/:code/invoice', '/invoice/:code'], async (req, res) => {
  const code = String(req.params.code || '').replace(/^#/, '').trim().toUpperCase();
  let order = inMemoryOrders.get(code) || inMemoryOrders.get(`UCHIHA-${code}`) || null;

  if (!order) {
    for (const ord of inMemoryOrders.values()) {
      if (ord && (
        String(ord.orderCode || '').replace(/^#/, '').trim().toUpperCase() === code ||
        String(ord.reference_number || '').replace(/^#/, '').trim().toUpperCase() === code ||
        String(ord.orderId || '').replace(/^#/, '').trim().toUpperCase() === code
      )) {
        order = ord;
        break;
      }
    }
  }

  if (!order && zohoInventory.isZohoConfigured()) {
    try {
      const existingSo = await zohoInventory.findSalesOrderByReference(code);
      if (existingSo && existingSo.salesorder_id) {
        const detailedSo = await zohoInventory.getSalesOrderFromZoho(existingSo.salesorder_id).catch(() => null);
        order = mapZohoSalesOrderToAccountOrder(detailedSo || existingSo, {
          cachedItems: zohoInventory.tokenState?.cachedItems || []
        });
      }
    } catch (_) {}
  }

  if (!order) {
    return res.status(404).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2>Reference #${code} Not Found</h2>
        <p>The requested invoice could not be located. Please verify your reference number.</p>
        <a href="/" style="color:#c0121f; font-weight:bold;">Return to Storefront</a>
      </div>
    `);
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

// Ensure unmatched /api/* routes always return JSON (never HTML fallback)
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Serve only explicitly allowlisted public assets (block .env, env/evn, backend code, JSON data, and hidden files)
const publicAssetsMiddleware = express.static(path.join(__dirname, 'public'), {
  dotfiles: 'deny',
  index: false
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const decision = classifyStaticRequest(req.path);
  if (decision.action === 'block') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).type('text/plain').send('Not Found');
  }
  if (decision.action === 'allow_file') {
    if (decision.file === 'style.css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    return res.sendFile(path.join(__dirname, decision.file));
  }
  if (decision.action === 'allow_public_dir') {
    const originalUrl = req.url;
    req.url = req.url.replace(/^\/public(?=\/|$)/i, '') || '/';
    return publicAssetsMiddleware(req, res, (err) => {
      req.url = originalUrl;
      if (err) return next(err);
      return res.status(404).type('text/plain').send('Not Found');
    });
  }
  return next();
});

// Fallback route for index.html
app.get('*', (req, res) => {
  sendDynamicIndex(req, res);
});

// Route-level fallback for offline database errors
app.use((err, req, res, next) => {
  if (err && (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError' || (err.message && err.message.includes('buffering timed out')))) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

async function hydrateFromMongoDb() {
  try {
    const db = await connectMongoDb();
    if (!db) return;

    // 1. Hydrate & Seed Coupons from MongoDB Atlas
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
      console.log(`[MongoDB Atlas] Hydrated ${mergedCount} coupons from MongoDB Atlas.`);
    } else if (inMemoryCoupons.length > 0) {
      for (const c of inMemoryCoupons) {
        const cleanCoupon = { ...c, source: 'mongodb', updatedAt: new Date() };
        delete cleanCoupon._id;
        await couponsCol.updateOne({ code: cleanCoupon.code }, { $set: cleanCoupon }, { upsert: true }).catch(() => {});
      }
      console.log(`[MongoDB Atlas] Seeded ${inMemoryCoupons.length} coupons into MongoDB Atlas.`);
    }

    // 2. Hydrate Newsletter Subscribers from MongoDB Atlas
    const subCol = db.collection('newsletter_subscribers');
    const mongoSubs = await subCol.find({}, { projection: { _id: 0 } }).toArray();
    for (const s of mongoSubs) {
      if (s && s.email) inMemorySubscribers.add(s.email.toLowerCase());
    }

    console.log(`[MongoDB Atlas] Hydrated ${inMemoryCoupons.length} coupons and ${inMemorySubscribers.size} newsletter subscribers.`);
  } catch (err) {
    console.warn('[MongoDB Atlas] Hydration notice:', err.message);
  }
}

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  hydrateFromMongoDb();
});

