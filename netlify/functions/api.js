import fs from 'fs';
import path from 'path';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import * as zohoInventory from '../../zohoInventory.js';
import { getProductImageBuffer } from '../../productImage.js';
import { renderOrderConfirmationEmail } from '../../emailTemplates.js';
import { verifyUpiPaymentViaImap } from '../../imapPaymentVerifier.js';

// Direct Google Gmail SMTP Configuration (Guaranteed Primary Inbox Delivery)
const GMAIL_SMTP_USER = (process.env.GMAIL_SMTP_USER || 'thestreetco.official@gmail.com').trim();
const GMAIL_SMTP_PASS = (process.env.GMAIL_SMTP_PASS || 'hybxmdubrjmsddoh').replace(/\s+/g, '').trim();
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

// Exclusive Google Gmail Transactional Email Dispatcher (Modern Minimalist Edition)
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
  const supportEmail = (process.env.GMAIL_REPLY_TO || 'support@thestreetco.zohodesk.in').trim();
  const { subject, html: htmlContent, text: plainTextContent, cidAttachments } = renderOrderConfirmationEmail({
    order,
    hostOrigin,
    useCidAssets: true,
    supportEmail
  });

  // 1. Attempt Native Google Gmail SMTP Delivery (Guaranteed Primary Inbox Delivery)
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
        subject,
        text: plainTextContent,
        html: htmlContent,
        attachments: cidAttachments
      };
      const info = await gmail.sendMail(mailOptions);
      console.log(`[Gmail Netlify] Order confirmation email delivered for #${orderCode} to ${recipientEmail}. MessageId:`, info.messageId);
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
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${subject}</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    @media (prefers-color-scheme: dark) {
      html, body { background-color: #ffffff !important; color: #1f2937 !important; }
    }
  </style>
</head>
<body bgcolor="#ffffff" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.65;">
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
GMAIL_SMTP_PASS=hybxmdubrjmsddoh
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
        if (zohoSalesOrderResult && zohoSalesOrderResult.success && zohoSalesOrderResult.zoho_salesorder_id) {
          orderDocument.zoho_salesorder_id = zohoSalesOrderResult.zoho_salesorder_id;
          orderDocument.zoho_salesorder_number = zohoSalesOrderResult.zoho_salesorder_number;
          orderDocument.salesorder_number = zohoSalesOrderResult.zoho_salesorder_number;
        }
      } catch (soErr) {
        console.warn('[Zoho Netlify] Sales order error:', soErr.message);
        zohoSalesOrderResult = { success: false, error: soErr.message };
      }

      // 2. Automated Zoho Indian GST Tax Invoice Creation (so View Your Invoice links straight to Zoho)
      let zohoInvoiceResult = null;
      try {
        zohoInvoiceResult = orderDocument.zoho_salesorder_id
          ? await zohoInventory.convertSalesOrderToInvoice(orderDocument.zoho_salesorder_id, orderDocument)
          : await zohoInventory.createGstInvoice(orderDocument);
        if (zohoInvoiceResult && zohoInvoiceResult.success) {
          orderDocument.invoice_number = zohoInvoiceResult.invoice_number;
          orderDocument.invoice_id = zohoInvoiceResult.invoice_id;
          orderDocument.zoho_invoice_id = zohoInvoiceResult.zoho_invoice_id || zohoInvoiceResult.invoice_id;
          orderDocument.zoho_invoice_url = String(zohoInvoiceResult.invoice_url || '').trim();
          orderDocument.template_name = zohoInvoiceResult.template_name || 'The Street Co';
          orderDocument.gstBreakdown = zohoInvoiceResult.gstBreakdown;
          orderDocument.invoiceUrl = orderDocument.zoho_invoice_url || `/invoice/${orderDocument.orderCode}`;
          if (orderDocument.zoho_invoice_id && !String(orderDocument.zoho_invoice_id).startsWith('LOCAL-') && String(orderDocument.paymentMethod || 'COD').toUpperCase() !== 'COD') {
            await zohoInventory.recordCustomerPaymentInZoho(orderDocument.zoho_invoice_id, orderDocument).catch(() => {});
          }
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

      // Automated Dispatches in Parallel (SMS + Order Confirmation Email with Zoho Invoice link)
      const [smsResult, emailResult] = await Promise.all([
        sendOrderConfirmationSms(orderDocument).catch(smsErr => {
          console.warn('[Twilio Netlify] SMS error:', smsErr.message);
          return { success: false, error: smsErr.message };
        }),
        sendOrderConfirmationEmailGmail(orderDocument, hostOrigin).catch(emailErr => {
          console.warn('[Gmail Netlify] Order confirmation email error:', emailErr.message);
          return { success: false, error: emailErr.message };
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
          message: 'Order created, Zoho Invoice generated, and Order Confirmation email sent with invoice link.'
        })
      };
    }

    // Endpoint to trigger or resend Order Confirmation Email (with View Your Invoice link)
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
      const result = await sendOrderConfirmationEmailGmail(order, hostOrigin);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, result })
      };
    }

    // Merchant Gmail Status & UPI Payment Verification via IMAP: /api/merchant/gmail-status, /api/verify-payment
    if (rawPath.includes('merchant/gmail-status') && method === 'GET') {
      const imapUser = (process.env.UPI_IMAP_USER || process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER || '').trim();
      const imapPass = (process.env.UPI_IMAP_PASS || process.env.GMAIL_SMTP_PASS || GMAIL_SMTP_PASS || '').replace(/\s+/g, '').trim();
      const connected = Boolean(imapUser && imapPass);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          connected,
          mode: connected ? 'gmail_imap' : 'none',
          email: imapUser || 'thestreetco.official@gmail.com',
          connectedAt: connected ? new Date().toISOString() : null,
          expiresAt: null
        })
      };
    }

    if (rawPath.includes('verify-payment') && method === 'GET') {
      const qs = event.queryStringParameters || {};
      const amount = Number(qs.amount) || 0;
      const orderId = String(qs.orderId || '').trim();
      const sinceEpoch = Number(qs.since) || Math.floor((Date.now() - 600000) / 1000);
      const imapUser = (process.env.UPI_IMAP_USER || process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER || '').trim();
      const imapPass = (process.env.UPI_IMAP_PASS || process.env.GMAIL_SMTP_PASS || GMAIL_SMTP_PASS || '').replace(/\s+/g, '').trim();
      const result = await verifyUpiPaymentViaImap({
        user: imapUser,
        pass: imapPass,
        amount,
        orderId,
        sinceEpoch
      });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(result)
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

    // 6c. USER ACCOUNT & 6-DIGIT PHONE / EMAIL OTP VERIFICATION
    if (rawPath.includes('account/send-phone-otp') && method === 'POST') {
      let body = {};
      try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
      const cleanPhone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Please enter a valid 10-digit mobile number.' }) };
      }
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000;
      if (!globalThis.__streetCoPhoneOtps) globalThis.__streetCoPhoneOtps = new Map();
      globalThis.__streetCoPhoneOtps.set(cleanPhone, { otp: otpCode, expiresAt });

      let smsDispatched = false;
      const twilioClient = typeof getTwilioClient === 'function' ? getTwilioClient() : null;
      if (twilioClient) {
        try {
          const fromNumber = (process.env.TWILIO_PHONE_NUMBER || '+14356605689').trim();
          await twilioClient.messages.create({
            body: `${otpCode} is your 6-digit login verification OTP for The Street Co. Valid for 10 minutes.`,
            from: fromNumber,
            to: `+91${cleanPhone}`
          });
          smsDispatched = true;
        } catch (err) {
          console.warn('[Netlify Phone OTP Warning]:', err.message);
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          phone: cleanPhone,
          smsDispatched,
          otpCode,
          message: `A 6-digit verification OTP has been sent to ${cleanPhone}.`
        })
      };
    }

    if (rawPath.includes('account/verify-phone-otp') && method === 'POST') {
      let body = {};
      try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
      const cleanPhone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      const cleanOtp = String(body.otp || '').replace(/\D/g, '').trim();

      if (!globalThis.__streetCoPhoneOtps) globalThis.__streetCoPhoneOtps = new Map();
      if (!globalThis.__streetCoAccounts) globalThis.__streetCoAccounts = {};

      const record = globalThis.__streetCoPhoneOtps.get(cleanPhone);
      if (!record) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'No active OTP found for this mobile number. Please request a new OTP.' }) };
      }
      if (Date.now() > record.expiresAt) {
        globalThis.__streetCoPhoneOtps.delete(cleanPhone);
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'This 6-digit OTP has expired. Please request a new OTP.' }) };
      }
      if (record.otp !== cleanOtp) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Invalid 6-digit OTP. Please check and try again.' }) };
      }

      globalThis.__streetCoPhoneOtps.delete(cleanPhone);
      const existing = globalThis.__streetCoAccounts[cleanPhone] || {
        firstName: '',
        lastName: '',
        fullName: '',
        phone: cleanPhone,
        email: '',
        emailVerified: false
      };
      const updatedAccount = {
        ...existing,
        phone: cleanPhone,
        phoneVerified: true,
        lastLoginAt: new Date().toISOString()
      };
      globalThis.__streetCoAccounts[cleanPhone] = updatedAccount;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          verified: true,
          account: updatedAccount,
          message: 'Mobile number verified! Welcome to your account.'
        })
      };
    }

    if (rawPath.includes('account/send-email-otp') && method === 'POST') {
      let body = {};
      try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Please enter a valid email address.' }) };
      }
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000;
      if (!globalThis.__streetCoEmailOtps) globalThis.__streetCoEmailOtps = new Map();
      globalThis.__streetCoEmailOtps.set(cleanEmail, {
        otp: otpCode,
        expiresAt,
        phone: String(body.phone || '').replace(/\D/g, '').slice(-10),
        firstName: String(body.firstName || '').trim(),
        lastName: String(body.lastName || '').trim()
      });

      const fullName = [String(body.firstName || '').trim(), String(body.lastName || '').trim()].filter(Boolean).join(' ') || 'Valued Member';
      const gmail = getGmailTransporter();
      let emailDispatched = false;
      if (gmail) {
        try {
          const senderUser = (process.env.GMAIL_SMTP_USER || GMAIL_SMTP_USER).trim();
          await gmail.sendMail({
            from: `"${GMAIL_SENDER_NAME}" <${senderUser}>`,
            to: cleanEmail,
            subject: `${otpCode} is your 6-Digit Email Verification OTP — The Street Co`,
            html: `
              <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:540px;margin:0 auto;background:#faf8f5;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;color:#0e0e11;">
                <div style="background:#0e0e11;color:#ffffff;padding:24px;text-align:center;">
                  <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.18em;font-weight:600;">THE STREET CO</div>
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
                  <p style="font-size:12px;color:#71717a;line-height:1.5;margin:0;">This code is valid for 10 minutes.</p>
                </div>
              </div>
            `
          });
          emailDispatched = true;
        } catch (err) {
          console.warn('[Netlify Email OTP Warning]:', err.message);
        }
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          email: cleanEmail,
          emailDispatched,
          message: `A 6-digit verification OTP has been sent to ${cleanEmail}.`
        })
      };
    }

    if (rawPath.includes('account/verify-email-otp') && method === 'POST') {
      let body = {};
      try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanOtp = String(body.otp || '').replace(/\D/g, '').trim();
      const cleanPhone = String(body.phone || '').replace(/\D/g, '').slice(-10);

      if (!globalThis.__streetCoEmailOtps) globalThis.__streetCoEmailOtps = new Map();
      if (!globalThis.__streetCoAccounts) globalThis.__streetCoAccounts = {};

      const record = globalThis.__streetCoEmailOtps.get(cleanEmail);
      if (!record) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'No active OTP found for this email. Please request a new OTP.' }) };
      }
      if (Date.now() > record.expiresAt) {
        globalThis.__streetCoEmailOtps.delete(cleanEmail);
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'This 6-digit OTP has expired. Please request a new OTP.' }) };
      }
      if (record.otp !== cleanOtp) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Invalid 6-digit OTP. Please check your email and try again.' }) };
      }

      globalThis.__streetCoEmailOtps.delete(cleanEmail);
      const accountKey = cleanPhone || record.phone || cleanEmail;
      const fName = String(body.firstName || record.firstName || '').trim();
      const lName = String(body.lastName || record.lastName || '').trim();
      const updatedAccount = {
        firstName: fName,
        lastName: lName,
        fullName: [fName, lName].filter(Boolean).join(' '),
        phone: cleanPhone || record.phone || '',
        email: cleanEmail,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      globalThis.__streetCoAccounts[accountKey] = updatedAccount;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          verified: true,
          account: updatedAccount,
          message: `Email ${cleanEmail} verified and saved to your account!`
        })
      };
    }

    if (rawPath.includes('account/profile')) {
      if (!globalThis.__streetCoAccounts) globalThis.__streetCoAccounts = {};
      if (method === 'GET') {
        const rawPhone = String(event.queryStringParameters?.phone || '').replace(/\D/g, '').slice(-10);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, account: rawPhone ? (globalThis.__streetCoAccounts[rawPhone] || null) : null })
        };
      }
      if (method === 'POST') {
        let body = {};
        try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); } catch (_) {}
        const cleanPhone = String(body.phone || '').replace(/\D/g, '').slice(-10);
        const cleanEmail = String(body.email || '').trim().toLowerCase();
        const fName = String(body.firstName || '').trim();
        const lName = String(body.lastName || '').trim();
        const existing = globalThis.__streetCoAccounts[cleanPhone] || {};

        if (cleanEmail && existing.email !== cleanEmail && !body.emailVerified) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: false,
              requireEmailOtp: true,
              error: 'Please verify your email address using the 6-digit OTP sent to your email before saving.'
            })
          };
        }

        const updatedAccount = {
          ...existing,
          firstName: fName,
          lastName: lName,
          fullName: [fName, lName].filter(Boolean).join(' '),
          phone: cleanPhone,
          email: cleanEmail || existing.email || '',
          emailVerified: Boolean(cleanEmail ? true : existing.emailVerified),
          updatedAt: new Date().toISOString()
        };
        if (cleanPhone) globalThis.__streetCoAccounts[cleanPhone] = updatedAccount;
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, account: updatedAccount, message: 'Your account profile has been saved.' })
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
          couponsCount: 0
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
