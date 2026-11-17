/**
 * Minimalist Transactional Email Templates for The Street Co
 * Matches the storefront's warm cream background (#FAF8F5), clean typography,
 * ₹ (INR) currency formatting, English copy, and thestreetco.com branding.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WEBSITE_URL = 'https://thestreetco.com';
const DEFAULT_WEBSITE_LABEL = 'thestreetco.com';
const DEFAULT_SUPPORT_EMAIL = 'support@thestreetco.zohodesk.in';
const DEFAULT_PUBLIC_ASSET_ORIGIN = 'https://thestreetco.netlify.app';
const DEFAULT_PRODUCT_IMAGE = '/product-minato.jpg';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatInrCurrency(amount) {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  const abs = Math.abs(safe);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return safe < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatDateDdMmYyyy(dateInput) {
  let d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) d = new Date();
  try {
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (_) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

export function extractCustomerFirstName(record) {
  const fullName = (
    record?.shippingAddress?.fullName ||
    record?.contactDetails?.fullName ||
    record?.userDetails?.name ||
    record?.customerName ||
    record?.fullName ||
    record?.user?.fullName ||
    ''
  ).trim();
  if (!fullName) return 'Customer';
  return fullName.split(/\s+/)[0] || 'Customer';
}

function findLocalAssetPath(normalizedPath) {
  const cleanRel = String(normalizedPath || '').replace(/^\/+/, '').split('?')[0];
  if (!cleanRel) return '';
  const candidates = [
    path.resolve(__dirname, cleanRel),
    path.resolve(__dirname, 'public', cleanRel)
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(__dirname)) continue;
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_) {}
  }
  return '';
}

function resolveEmailAssetUrl(assetPath, {
  hostOrigin = '',
  useRelativeAssets = false,
  useCidAssets = false,
  cidName = '',
  cidList = null
} = {}) {
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  if (useCidAssets && Array.isArray(cidList)) {
    const localPath = findLocalAssetPath(normalizedPath);
    if (localPath) {
      const cid = (cidName || path.basename(localPath, path.extname(localPath))).replace(/[^a-zA-Z0-9._-]/g, '-');
      if (!cidList.some(att => att.cid === cid)) {
        cidList.push({
          filename: path.basename(localPath),
          path: localPath,
          cid,
          contentDisposition: 'inline'
        });
      }
      return `cid:${cid}`;
    }
  }

  if (useRelativeAssets) {
    return normalizedPath;
  }

  const isLocalHost = !hostOrigin || /localhost|127\.0\.0\.1/i.test(hostOrigin);
  const publicBase = !isLocalHost ? hostOrigin.replace(/\/$/, '') : DEFAULT_PUBLIC_ASSET_ORIGIN;
  return `${publicBase}${normalizedPath}`;
}

export function resolveItemImageUrl(item, {
  hostOrigin = '',
  useRelativeAssets = false,
  useCidAssets = false,
  cidList = null
} = {}) {
  const raw = String(
    item?.image ||
    item?.imageUrl ||
    item?.img ||
    (Array.isArray(item?.images) && item.images[0]) ||
    ''
  ).trim();

  const isLocalHost = !hostOrigin || /localhost|127\.0\.0\.1/i.test(hostOrigin);
  const publicBase = !isLocalHost ? hostOrigin.replace(/\/$/, '') : DEFAULT_PUBLIC_ASSET_ORIGIN;

  if (!raw) {
    return resolveEmailAssetUrl(DEFAULT_PRODUCT_IMAGE, { hostOrigin, useRelativeAssets, useCidAssets, cidList });
  }

  if (/^https?:\/\//i.test(raw)) {
    if (useCidAssets && Array.isArray(cidList)) {
      try {
        const parsed = new URL(raw);
        if (findLocalAssetPath(parsed.pathname)) {
          return resolveEmailAssetUrl(parsed.pathname, { hostOrigin, useRelativeAssets, useCidAssets, cidList });
        }
      } catch (_) {}
    }
    if (!useRelativeAssets && /localhost|127\.0\.0\.1/i.test(raw)) {
      return raw.replace(/^https?:\/\/[^/]+/i, DEFAULT_PUBLIC_ASSET_ORIGIN);
    }
    return raw;
  }

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  if (useCidAssets && Array.isArray(cidList)) {
    if (findLocalAssetPath(normalizedPath)) {
      return resolveEmailAssetUrl(normalizedPath, { hostOrigin, useRelativeAssets, useCidAssets, cidList });
    }
    return resolveEmailAssetUrl(DEFAULT_PRODUCT_IMAGE, { hostOrigin, useRelativeAssets, useCidAssets, cidList });
  }

  if (useRelativeAssets) {
    return normalizedPath;
  }

  // External email clients cannot reach local/private proxy paths when hostOrigin is localhost
  if (isLocalHost && normalizedPath.startsWith('/api/')) {
    return `${DEFAULT_PUBLIC_ASSET_ORIGIN}${DEFAULT_PRODUCT_IMAGE}`;
  }

  return `${publicBase}${normalizedPath}`;
}

function normalizeItemsForDisplay(rawItems, orderFallback = {}) {
  const source = (Array.isArray(rawItems) && rawItems.length > 0)
    ? rawItems
    : [];

  if (source.length === 0) {
    const fallbackTotal = Number(orderFallback.grandTotalInr || orderFallback.subtotalInr || 1599);
    return [{
      title: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
      variant: 'Obsidian Black · Size M',
      sku: 'TS-MIN-001',
      qty: 1,
      totalInr: fallbackTotal,
      image: DEFAULT_PRODUCT_IMAGE
    }];
  }

  const orderItems = Array.isArray(orderFallback.items) && orderFallback.items.length > 0
    ? orderFallback.items
    : (Array.isArray(orderFallback.products) ? orderFallback.products : []);

  return source.map((item, idx) => {
    const skuKey = String(item?.sku || item?.id || '').trim().toUpperCase();
    const nameKey = String(item?.title || item?.name || '').trim().toLowerCase();
    const matchedOrderItem = orderItems.find(oi =>
      (skuKey && String(oi?.sku || oi?.id || '').trim().toUpperCase() === skuKey) ||
      (nameKey && String(oi?.title || oi?.name || '').trim().toLowerCase() === nameKey)
    ) || orderItems[idx] || orderItems[0] || {};

    const title = item?.title || item?.name || matchedOrderItem?.title || matchedOrderItem?.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt';
    const size = item?.size || matchedOrderItem?.size || 'M';
    const color = item?.color || item?.finish || matchedOrderItem?.color || matchedOrderItem?.finish || '';
    const variantParts = [];
    if (color) variantParts.push(color);
    if (size) variantParts.push(`Size ${size}`);
    const variant = variantParts.join(' · ') || 'Standard Edition';
    const sku = item?.sku || item?.id || matchedOrderItem?.sku || matchedOrderItem?.id || 'TS-MIN-001';
    const qty = Math.max(1, parseInt(item?.quantity || item?.qty || matchedOrderItem?.quantity || matchedOrderItem?.qty || 1, 10) || 1);
    const unitPrice = Number(
      item?.priceInr || item?.price ||
      matchedOrderItem?.priceInr || matchedOrderItem?.price ||
      (matchedOrderItem?.totalItemPriceInr ? matchedOrderItem.totalItemPriceInr / qty : 0) ||
      orderFallback.grandTotalInr || 1599
    );
    const totalInr = Number(item?.totalItemPriceInr || (unitPrice * qty));
    const image = item?.image || item?.imageUrl || item?.img || (Array.isArray(item?.images) && item.images[0]) ||
      matchedOrderItem?.image || matchedOrderItem?.imageUrl || (Array.isArray(matchedOrderItem?.images) && matchedOrderItem.images[0]) ||
      DEFAULT_PRODUCT_IMAGE;

    return { title, variant, size, sku, qty, unitPrice, totalInr, image };
  });
}

function renderItemRowsHtml(items, assetOpts) {
  return items.map((item, idx) => {
    const imgSrc = resolveItemImageUrl(item, assetOpts);
    const borderBottom = idx < items.length - 1 ? 'border-bottom:1px solid #e8e2d8;' : '';
    return `
      <tr>
        <td style="padding:18px 0;${borderBottom}">
          <table cellpadding="0" cellspacing="0" width="100%" border="0" role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td width="112" style="width:96px;vertical-align:top;padding-right:16px;">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.title)}" width="96" height="96" style="width:96px;height:96px;min-width:96px;max-width:96px;object-fit:cover;display:block;border-radius:6px;background-color:#ffffff;border:1px solid #e8e2d8;" />
              </td>
              <td style="vertical-align:top;width:auto;">
                <div style="font-size:15px;font-weight:600;color:#171717;line-height:1.4;margin:0;">${escapeHtml(item.title)}</div>
                <div style="font-size:13px;color:#78716c;line-height:1.45;margin-top:4px;">${escapeHtml(item.variant)} <span style="color:#c4bdb2;">&middot;</span> <span style="color:#a8a29e;white-space:nowrap;">${escapeHtml(item.sku)}</span></div>
                <table cellpadding="0" cellspacing="0" width="100%" border="0" role="presentation" style="width:100%;border-collapse:collapse;margin-top:10px;">
                  <tr>
                    <td align="left" style="vertical-align:middle;font-size:13px;color:#52525b;white-space:nowrap;">Qty: ${item.qty}</td>
                    <td align="right" style="vertical-align:middle;font-size:14px;font-weight:600;color:#171717;white-space:nowrap;">${escapeHtml(formatInrCurrency(item.totalInr))}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');
}

function renderMinimalEmailShell({
  pageTitle,
  heading,
  firstName,
  introHtml,
  ctaLabel,
  ctaHref,
  referenceTitle,
  referenceSubtitle,
  sectionLabel,
  itemsHtml,
  summaryRowsHtml,
  supportEmail,
  websiteHref,
  websiteLabel,
  schemaJsonLd = '',
  assetOpts = {}
}) {
  const asset = (file, cidName) => escapeHtml(
    resolveEmailAssetUrl(`/public/assets/email/${file}`, { ...assetOpts, cidName })
  );

  const socialHtml = [
    { href: 'https://instagram.com', label: 'Instagram', file: 'social-instagram.png', cid: 'social-instagram', w: 32, h: 32 },
    { href: 'https://twitter.com', label: 'Twitter', file: 'social-twitter.png', cid: 'social-twitter', w: 32, h: 32 },
    { href: 'https://reddit.com', label: 'Reddit', file: 'social-reddit.png', cid: 'social-reddit', w: 32, h: 32 }
  ].map(s => `
                    <td style="padding:0 5px;">
                      <a href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}" style="display:inline-block;width:${s.w}px;height:${s.h}px;text-decoration:none;border-radius:50%;vertical-align:middle;">
                        <img src="${asset(s.file, s.cid)}" alt="${escapeHtml(s.label)}" width="${s.w}" height="${s.h}" style="width:${s.w}px;height:${s.h}px;display:block;border:0;border-radius:50%;" />
                      </a>
                    </td>`).join('');

  const paymentHtml = [
    { label: 'Visa', file: 'pay-visa.png', cid: 'pay-visa', w: 52, h: 30 },
    { label: 'Mastercard', file: 'pay-mastercard.png', cid: 'pay-mastercard', w: 52, h: 30 },
    { label: 'PayPal', file: 'pay-paypal.png', cid: 'pay-paypal', w: 58, h: 30 },
    { label: 'Apple Pay', file: 'pay-applepay.png', cid: 'pay-applepay', w: 52, h: 30 },
    { label: 'Stripe', file: 'pay-stripe.png', cid: 'pay-stripe', w: 52, h: 30 },
    { label: 'Google Pay', file: 'pay-gpay.png', cid: 'pay-gpay', w: 55, h: 30 },
    { label: 'Amazon Pay', file: 'pay-amazonpay.png', cid: 'pay-amazonpay', w: 64, h: 30 }
  ].map(p => `
                  <span title="${escapeHtml(p.label)}" style="display:inline-block;margin:3px 3px;vertical-align:middle;line-height:0;">
                    <img src="${asset(p.file, p.cid)}" alt="${escapeHtml(p.label)}" title="${escapeHtml(p.label)}" width="${p.w}" height="${p.h}" style="width:${p.w}px;height:${p.h}px;display:block;border:0;" />
                  </span>`).join('');

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${escapeHtml(pageTitle)}</title>
    ${schemaJsonLd ? `<script type="application/ld+json">\n${schemaJsonLd}\n</script>` : ''}
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      html, body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#171717 !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:light only; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%;outline:none;text-decoration:none; }
      @media (prefers-color-scheme: dark) {
        html, body, .email-light-bg, .email-light-table { background-color:#FAF8F5 !important;background-image:linear-gradient(#FAF8F5,#FAF8F5) !important;color:#171717 !important; }
        .email-dark-text, h1, h2, h3, strong { color:#171717 !important; }
        .email-muted-text { color:#52525b !important; }
        .email-subtle-text { color:#78716c !important; }
        .email-link { color:#2563eb !important; }
        .email-cta { background-color:#1e1e1e !important;background-image:linear-gradient(#1e1e1e,#1e1e1e) !important;color:#ffffff !important; }
      }
      [data-ogsb] .email-light-bg, [data-ogsb] body { background-color:#FAF8F5 !important; }
      [data-ogsc] .email-dark-text, [data-ogsc] body { color:#171717 !important; }
      [data-ogsc] .email-link { color:#2563eb !important; }
      [data-ogsc] .email-cta { background-color:#1e1e1e !important;color:#ffffff !important; }
      u + .body .email-light-bg { background-color:#FAF8F5 !important;background-image:linear-gradient(#FAF8F5,#FAF8F5) !important;color:#171717 !important; }
    </style>
  </head>
  <body class="body email-light-bg" bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);color:#171717;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF8F5" class="email-light-bg" style="width:100%;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
      <tr>
        <td align="center" bgcolor="#FAF8F5" class="email-light-bg" style="padding:40px 16px 48px 16px;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF8F5" class="email-light-table" style="width:100%;max-width:560px;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
            <!-- Centered Brand Wordmark -->
            <tr>
              <td align="center" style="padding:0 0 28px 0;">
                <a href="${escapeHtml(websiteHref)}" target="_blank" class="email-dark-text" style="text-decoration:none;color:#000000;font-size:20px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                  THE STREET CO
                </a>
              </td>
            </tr>

            <!-- Main Heading -->
            <tr>
              <td align="center" style="padding:0 0 20px 0;">
                <h1 class="email-dark-text" style="margin:0;font-size:28px;font-weight:500;line-height:1.25;letter-spacing:-0.02em;color:#111111;">
                  ${escapeHtml(heading)}
                </h1>
              </td>
            </tr>

            <!-- Greeting & Body Copy -->
            <tr>
              <td align="center" class="email-muted-text" style="padding:0 12px 26px 12px;font-size:14px;line-height:1.65;color:#52525b;">
                <div class="email-dark-text" style="margin:0 0 16px 0;color:#404040;">Hey ${escapeHtml(firstName)},</div>
                ${introHtml}
              </td>
            </tr>

            <!-- Centered Primary Button -->
            <tr>
              <td align="center" style="padding:0 0 34px 0;">
                <a href="${escapeHtml(ctaHref)}" target="_blank" class="email-cta" style="display:inline-block;background-color:#1e1e1e;background-image:linear-gradient(#1e1e1e,#1e1e1e);color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:1;padding:15px 38px;border-radius:6px;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="border-top:1px solid #e5dfd5;padding:0;font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <!-- Order / Return Reference & Date -->
            <tr>
              <td align="center" style="padding:28px 0 26px 0;">
                <div style="font-size:15px;font-weight:500;color:#171717;line-height:1.4;">
                  ${escapeHtml(referenceTitle)}
                </div>
                <div style="font-size:12px;color:#8a8279;line-height:1.5;margin-top:4px;">
                  ${escapeHtml(referenceSubtitle)}
                </div>
              </td>
            </tr>

            <!-- Items Section Header -->
            <tr>
              <td align="left" style="padding:0 0 10px 0;font-size:14px;font-weight:500;color:#171717;border-bottom:1px solid #e5dfd5;">
                ${escapeHtml(sectionLabel)}
              </td>
            </tr>

            <!-- Items Rows -->
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                  ${itemsHtml}
                </table>
              </td>
            </tr>

            <!-- Financial Summary -->
            <tr>
              <td style="border-top:1px solid #e5dfd5;padding:14px 0 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:14px;line-height:1.8;">
                  ${summaryRowsHtml}
                </table>
              </td>
            </tr>

            <!-- Subtle Brand & Storefront Footer -->
            <tr>
              <td align="center" style="padding:32px 0 0 0;border-top:1px solid #e5dfd5;">
                <div class="email-subtle-text" style="font-size:12px;color:#78716c;line-height:1.7;padding-top:22px;">
                  Questions? Contact us at
                  <a href="mailto:${escapeHtml(supportEmail)}" class="email-dark-text" style="color:#171717;text-decoration:underline;">${escapeHtml(supportEmail)}</a>
                  <br>
                  <a href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer" class="email-link" style="color:#2563eb;text-decoration:underline;">${escapeHtml(websiteLabel)}</a> &middot; The Street Co
                </div>

                <!-- Social Icons: Instagram, Twitter, Reddit -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0 auto;">
                  <tr>
                    ${socialHtml}
                  </tr>
                </table>

                <!-- Brand Heritage Tagline -->
                <div class="email-subtle-text" style="margin-top:20px;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#78716c;line-height:1.6;">
                  TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
                </div>
                <div class="email-subtle-text" style="margin-top:8px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#78716c;line-height:1.5;">
                  &copy; 2026 THE STREET CO ALL RIGHTS RESERVED.
                </div>
                <div class="email-subtle-text" style="margin-top:2px;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#78716c;line-height:1.5;">
                  ELEVATED STYLE &middot; MODERN ESSENTIALS
                </div>

                <!-- Original Payment Method Badges -->
                <div style="margin-top:18px;text-align:center;line-height:0;">
                  ${paymentHtml}
                </div>

                <!-- Legal Footer Links -->
                <div class="email-subtle-text" style="margin-top:16px;font-size:11px;color:#78716c;letter-spacing:0.04em;line-height:1.6;">
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#terms" target="_blank" rel="noopener noreferrer" class="email-link" style="color:#2563eb;text-decoration:underline;">Terms</a>
                  <span style="margin:0 6px;color:#c4bdb2;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#privacy" target="_blank" rel="noopener noreferrer" class="email-link" style="color:#2563eb;text-decoration:underline;">Privacy</a>
                  <span style="margin:0 6px;color:#c4bdb2;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#refund" target="_blank" rel="noopener noreferrer" class="email-link" style="color:#2563eb;text-decoration:underline;">Refunds</a>
                  <span style="margin:0 6px;color:#c4bdb2;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#shipping" target="_blank" rel="noopener noreferrer" class="email-link" style="color:#2563eb;text-decoration:underline;">Shipping</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderOrderConfirmationEmail({
  order = {},
  hostOrigin = '',
  useRelativeAssets = false,
  useCidAssets = false,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  websiteHref = DEFAULT_WEBSITE_URL,
  websiteLabel = DEFAULT_WEBSITE_LABEL
} = {}) {
  const cidAttachments = [];
  const assetOpts = { hostOrigin, useRelativeAssets, useCidAssets, cidList: cidAttachments };
  const rawOrderCode = order.orderCode || order.orderId || 'ORDER';
  const cleanOrderNumber = String(rawOrderCode).replace(/^#/, '').trim();
  const firstName = extractCustomerFirstName(order);
  const fullName = (
    order?.shippingAddress?.fullName ||
    order?.contactDetails?.fullName ||
    order?.userDetails?.name ||
    firstName
  ).trim();
  const formattedDate = formatDateDdMmYyyy(order.orderDate || order.createdAt);

  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : ((Array.isArray(order.products) && order.products.length > 0)
      ? order.products
      : (Array.isArray(order.productDetails) ? order.productDetails : []));
  const items = normalizeItemsForDisplay(rawItems, order);

  const discountVal = Math.max(0, Number(order.discountInr ?? order.discount ?? order.pricing?.discountInr ?? 0) || 0);
  const couponCode = String(order.appliedPromoCode || order.promoCode || order.pricing?.promoCode || '').trim();
  const deliveryFeeVal = Math.max(0, Number(order.deliveryFeeInr ?? order.delivery?.cost ?? order.pricing?.deliveryCost ?? 0) || 0);
  const rawSubtotalVal = Number(order.subtotalInr ?? order.pricing?.subtotalInr ?? items.reduce((s, it) => s + Number(it.totalInr || 0), 0)) || 0;
  const netSubtotalVal = Math.max(0, rawSubtotalVal - discountVal);
  const grandTotalVal = Number(order.grandTotalInr ?? order.totalInr ?? order.pricing?.totalInr ?? (netSubtotalVal + deliveryFeeVal)) || 0;

  // 12% GST included in the original item price
  const gstBasePriceVal = rawSubtotalVal > 0 ? rawSubtotalVal : grandTotalVal;
  const gstIncludedVal = Math.round((gstBasePriceVal * 0.12) * 100) / 100;

  const isExpressCourier = (order?.deliveryDetails?.courierTitle || order?.delivery?.courierTitle || '').toLowerCase().includes('express')
    || String(order?.delivery?.speed || order?.deliveryDetails?.speed || '').toLowerCase() === 'express';
  const shippingLabel = isExpressCourier ? 'Delhivery Express' : 'Delhivery';

  const accountStatusUrl = `${websiteHref.replace(/\/$/, '')}/#account`;
  const fallbackInvoiceBase = (!useRelativeAssets && hostOrigin && !/localhost|127\.0\.0\.1/i.test(hostOrigin))
    ? hostOrigin.replace(/\/$/, '')
    : websiteHref.replace(/\/$/, '');
  const invoiceUrl = `${fallbackInvoiceBase}/invoice/${encodeURIComponent(cleanOrderNumber)}`;

  const introHtml = `
    <div style="margin:0 0 18px 0;">
      You made our day, hope we will make yours soon!<br>
      Thank you for your purchase &mdash; this email confirms your order.
    </div>
    <div style="margin:0;">
      You can follow your order status by logging into your account at<br>
      <a href="${escapeHtml(websiteHref)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(websiteLabel)}</a>.<br>
      You can see the invoice using the button below.
    </div>
  `;

  const itemsHtml = renderItemRowsHtml(items, assetOpts);

  const summaryRows = [];
  if (discountVal > 0) {
    summaryRows.push(`
      <tr>
        <td style="text-align:left;color:#52525b;padding:4px 0;">Discount${couponCode ? ` (${escapeHtml(couponCode)})` : ''}</td>
        <td style="text-align:right;color:#52525b;padding:4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(-discountVal))}</td>
      </tr>
    `);
  }
  summaryRows.push(`
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Subtotal</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(netSubtotalVal))}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">${escapeHtml(shippingLabel)}</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${deliveryFeeVal > 0 ? escapeHtml(formatInrCurrency(deliveryFeeVal)) : 'Free'}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">GST (12% Included)</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(gstIncludedVal))}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#111111;font-weight:600;padding:8px 0 4px 0;">Total</td>
      <td style="text-align:right;color:#111111;font-weight:600;padding:8px 0 4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(grandTotalVal))}</td>
    </tr>
  `);

  const shippingAddr = order.shippingAddress || {};
  const streetAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.houseFlat, shippingAddr.streetRoad].filter(Boolean).join(', ') || 'Standard Shipping Address';
  const trackingUrl = invoiceUrl || accountStatusUrl;

  const schemaJsonLd = JSON.stringify({
    '@context': 'http://schema.org',
    '@type': 'Order',
    merchant: {
      '@type': 'Organization',
      name: 'The Street Co',
      url: websiteHref
    },
    orderNumber: cleanOrderNumber,
    orderStatus: 'http://schema.org/OrderProcessing',
    priceCurrency: 'INR',
    price: String(Math.round(grandTotalVal)),
    customer: {
      '@type': 'Person',
      name: fullName
    },
    acceptedOffer: items.map(item => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Product',
        name: item.title,
        sku: item.sku
      },
      price: String(Math.round(item.unitPrice || item.totalInr)),
      priceCurrency: 'INR',
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        value: item.qty
      }
    })),
    potentialAction: {
      '@type': 'ViewAction',
      target: trackingUrl,
      name: 'View Your Invoice'
    },
    deliveryAddress: {
      '@type': 'PostalAddress',
      streetAddress: streetAddr,
      addressLocality: shippingAddr.city || 'Kolkata',
      addressRegion: shippingAddr.state || 'West Bengal',
      postalCode: shippingAddr.pincode || '743287',
      addressCountry: 'IN'
    }
  }, null, 2);

  const subject = `Order Confirmation #${cleanOrderNumber} - The Street Co`;
  const html = renderMinimalEmailShell({
    pageTitle: subject,
    heading: 'Order Confirmation',
    firstName,
    introHtml,
    ctaLabel: 'View Your Invoice',
    ctaHref: invoiceUrl,
    referenceTitle: `Reference #${cleanOrderNumber}`,
    referenceSubtitle: formattedDate,
    sectionLabel: 'Items ordered',
    itemsHtml,
    summaryRowsHtml: summaryRows.join(''),
    supportEmail,
    websiteHref,
    websiteLabel,
    schemaJsonLd,
    assetOpts
  });

  const plainItems = items.map(it =>
    `• ${it.title} (${it.variant}, ${it.sku}) x ${it.qty} — ${formatInrCurrency(it.totalInr)}`
  ).join('\n');

  const text = `Order Confirmation

Hey ${firstName},

You made our day, hope we will make yours soon!
Thank you for your purchase — this email confirms your order.

You can follow your order status by logging into your account at ${websiteLabel}.
You can see the invoice here: ${invoiceUrl}

Reference #${cleanOrderNumber}
${formattedDate}

Items ordered:
${plainItems}

${discountVal > 0 ? `Discount${couponCode ? ` (${couponCode})` : ''}: ${formatInrCurrency(-discountVal)}\n` : ''}Subtotal: ${formatInrCurrency(netSubtotalVal)}
${shippingLabel}: ${deliveryFeeVal > 0 ? formatInrCurrency(deliveryFeeVal) : 'Free'}
GST (12% Included): ${formatInrCurrency(gstIncludedVal)}
Total: ${formatInrCurrency(grandTotalVal)}

Questions? Contact us at ${supportEmail}
${websiteLabel}
TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
© 2026 THE STREET CO ALL RIGHTS RESERVED.
ELEVATED STYLE · MODERN ESSENTIALS
VISA · Mastercard · PayPal · Apple Pay · Stripe · Google Pay · Amazon Pay
Terms · Privacy · Refunds · Shipping`;

  return { subject, html, text, cleanOrderNumber, cidAttachments };
}

export function renderReturnConfirmationEmail({
  returnRecord = {},
  order = {},
  hostOrigin = '',
  useRelativeAssets = false,
  useCidAssets = false,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  websiteHref = DEFAULT_WEBSITE_URL,
  websiteLabel = DEFAULT_WEBSITE_LABEL
} = {}) {
  const cidAttachments = [];
  const assetOpts = { hostOrigin, useRelativeAssets, useCidAssets, cidList: cidAttachments };
  const isExchange = returnRecord.type === 'exchange';
  const returnId = String(returnRecord.id || `RET-${Date.now()}`).replace(/^#/, '').trim();
  const cleanOrderNumber = String(returnRecord.orderCode || order.orderCode || order.orderId || 'ORDER').replace(/^#/, '').trim();
  const firstName = extractCustomerFirstName({ ...order, ...returnRecord });
  const formattedDate = formatDateDdMmYyyy(returnRecord.createdAt);
  const requestedSize = returnRecord.requestedSize || 'Selected Size';

  const rawItems = (Array.isArray(returnRecord.items) && returnRecord.items.length > 0)
    ? returnRecord.items
    : [{ name: returnRecord.itemNames || 'Fourth Hokage Minato Inspired Oversized T-Shirt', size: returnRecord.size || 'M' }];
  const items = normalizeItemsForDisplay(rawItems, order);

  const itemsTotal = items.reduce((sum, it) => sum + Number(it.totalInr || 0), 0);
  const subtotalVal = Number(returnRecord.refundAmountInr || itemsTotal || order.grandTotalInr || 1599);
  const gstBasePriceVal = itemsTotal > 0 ? itemsTotal : subtotalVal;
  const gstIncludedVal = Math.round((gstBasePriceVal * 0.12) * 100) / 100;
  const accountStatusUrl = `${websiteHref.replace(/\/$/, '')}/#account`;

  const heading = isExchange ? 'Exchange Request Confirmation' : 'Return Request Confirmation';
  const ctaLabel = isExchange ? 'View Exchange Status' : 'View Return Status';
  const sectionLabel = isExchange ? 'Items to exchange' : 'Items to return';

  const introHtml = isExchange
    ? `
      <div style="margin:0 0 18px 0;">
        Thank you for reaching out &mdash; this email confirms your exchange request for size <strong>${escapeHtml(requestedSize)}</strong>.<br>
        We will send reverse pickup updates shortly.
      </div>
      <div style="margin:0;">
        You can follow your exchange status by logging into your account at<br>
        <a href="${escapeHtml(websiteHref)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(websiteLabel)}</a> or by using the button below.
      </div>
    `
    : `
      <div style="margin:0 0 18px 0;">
        Thank you for reaching out &mdash; this email confirms your return request.<br>
        We have received your request and will share reverse pickup details shortly.
      </div>
      <div style="margin:0;">
        You can follow your return status by logging into your account at<br>
        <a href="${escapeHtml(websiteHref)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(websiteLabel)}</a> or by using the button below.
      </div>
    `;

  const itemsHtml = renderItemRowsHtml(items, assetOpts);

  const summaryRowsHtml = `
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Request Type</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${isExchange ? `Size Exchange (${escapeHtml(requestedSize)})` : 'Return (Full Refund)'}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Subtotal</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(subtotalVal))}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Reverse Pickup</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">Free</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">GST (12% Included)</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(gstIncludedVal))}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#111111;font-weight:600;padding:8px 0 4px 0;">${isExchange ? 'Total Payable' : 'Estimated Refund'}</td>
      <td style="text-align:right;color:#111111;font-weight:600;padding:8px 0 4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(isExchange ? 0 : subtotalVal))}</td>
    </tr>
  `;

  const subject = isExchange
    ? `Exchange Request Confirmation #${returnId} - The Street Co`
    : `Return Request Confirmation #${returnId} - The Street Co`;

  const html = renderMinimalEmailShell({
    pageTitle: subject,
    heading,
    firstName,
    introHtml,
    ctaLabel,
    ctaHref: accountStatusUrl,
    referenceTitle: `Return No. #${returnId}`,
    referenceSubtitle: `Reference #${cleanOrderNumber} · ${formattedDate}`,
    sectionLabel,
    itemsHtml,
    summaryRowsHtml,
    supportEmail,
    websiteHref,
    websiteLabel,
    assetOpts
  });

  const plainItems = items.map(it =>
    `• ${it.title} (${it.variant}, ${it.sku}) x ${it.qty} — ${formatInrCurrency(it.totalInr)}`
  ).join('\n');

  const text = `${heading}

Hey ${firstName},

Thank you for reaching out — this email confirms your ${isExchange ? `size exchange request (to ${requestedSize})` : 'return request'}.
You can follow your status by logging into your account at ${websiteLabel} (${accountStatusUrl}).

Return No. #${returnId}
Reference #${cleanOrderNumber} · ${formattedDate}

${sectionLabel}:
${plainItems}

Request Type: ${isExchange ? `Size Exchange (${requestedSize})` : 'Return (Full Refund)'}
Subtotal: ${formatInrCurrency(subtotalVal)}
Reverse Pickup: Free
GST (12% Included): ${formatInrCurrency(gstIncludedVal)}
${isExchange ? 'Total Payable' : 'Estimated Refund'}: ${formatInrCurrency(isExchange ? 0 : subtotalVal)}

Questions? Contact us at ${supportEmail}
${websiteLabel}
TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
© 2026 THE STREET CO ALL RIGHTS RESERVED.
ELEVATED STYLE · MODERN ESSENTIALS
VISA · Mastercard · PayPal · Apple Pay · Stripe · Google Pay · Amazon Pay
Terms · Privacy · Refunds · Shipping`;

  return { subject, html, text, returnId, cleanOrderNumber, isExchange, cidAttachments };
}

export function renderShipmentFulfilledEmail({
  order = {},
  hostOrigin = '',
  useRelativeAssets = false,
  useCidAssets = false,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  websiteHref = DEFAULT_WEBSITE_URL,
  websiteLabel = DEFAULT_WEBSITE_LABEL
} = {}) {
  const cidAttachments = [];
  const assetOpts = { hostOrigin, useRelativeAssets, useCidAssets, cidList: cidAttachments };
  const rawOrderCode = order.orderCode || order.orderId || 'ORDER';
  const cleanOrderNumber = String(rawOrderCode).replace(/^#/, '').trim();
  const firstName = extractCustomerFirstName(order);
  const fullName = (
    order?.shippingAddress?.fullName ||
    order?.contactDetails?.fullName ||
    order?.userDetails?.name ||
    firstName
  ).trim();
  const formattedDate = formatDateDdMmYyyy(order.deliveredAt || order.orderDate || order.createdAt);
  const deliveredAt = order.deliveredAtFormatted || formattedDate;

  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : ((Array.isArray(order.products) && order.products.length > 0)
      ? order.products
      : (Array.isArray(order.productDetails) ? order.productDetails : []));
  const items = normalizeItemsForDisplay(rawItems, order);

  const rawSubtotalVal = Number(order.subtotalInr ?? order.pricing?.subtotalInr ?? items.reduce((s, it) => s + Number(it.totalInr || 0), 0)) || 0;
  const discountVal = Math.max(0, Number(order.discountInr ?? order.discount ?? 0) || 0);
  const deliveryFeeVal = Math.max(0, Number(order.deliveryFeeInr ?? order.delivery?.cost ?? 0) || 0);
  const grandTotalVal = Number(order.grandTotalInr ?? order.totalInr ?? Math.max(0, rawSubtotalVal - discountVal) + deliveryFeeVal) || 0;

  const shippingAddr = order.shippingAddress || {};
  const streetAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.houseFlat, shippingAddr.streetRoad].filter(Boolean).join(', ');
  const cityStateZip = [shippingAddr.city, shippingAddr.state, shippingAddr.pincode].filter(Boolean).join(' - ');
  const fullAddress = [streetAddr, cityStateZip].filter(Boolean).join(', ') || 'Your delivery address on file';

  const accountStatusUrl = `${websiteHref.replace(/\/$/, '')}/#account`;
  const trackingUrl = `https://www.delhivery.com/tracking?awb=${encodeURIComponent(cleanOrderNumber)}`;

  const introHtml = `
    <div style="margin:0 0 18px 0;">
      Your shipment for order <strong style="color:#171717;">#${escapeHtml(cleanOrderNumber)}</strong> has been fulfilled and delivered to your doorstep.<br>
      Delivered on <strong style="color:#171717;">${escapeHtml(deliveredAt)}</strong>.
    </div>
    <div style="margin:0;">
      Need a different size or easy return? Our 7-day reverse pickup portal is open anytime at
      <a href="${escapeHtml(accountStatusUrl)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(websiteLabel)}</a> or using the button below.
    </div>
  `;

  const itemsHtml = renderItemRowsHtml(items, assetOpts);

  const summaryRowsHtml = `
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Status</td>
      <td style="text-align:right;color:#15803d;font-weight:600;padding:4px 0;white-space:nowrap;">Fulfilled &amp; Delivered</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;">Courier</td>
      <td style="text-align:right;color:#171717;padding:4px 0;white-space:nowrap;">
        <a href="${escapeHtml(trackingUrl)}" target="_blank" style="color:#2563eb;text-decoration:underline;">Delhivery Express (#${escapeHtml(cleanOrderNumber)})</a>
      </td>
    </tr>
    <tr>
      <td style="text-align:left;color:#52525b;padding:4px 0;vertical-align:top;">Delivered To</td>
      <td style="text-align:right;color:#171717;padding:4px 0;max-width:300px;line-height:1.45;">${escapeHtml(fullName)} &mdash; ${escapeHtml(fullAddress)}</td>
    </tr>
    <tr>
      <td style="text-align:left;color:#111111;font-weight:600;padding:8px 0 4px 0;">Order Total</td>
      <td style="text-align:right;color:#111111;font-weight:600;padding:8px 0 4px 0;white-space:nowrap;">${escapeHtml(formatInrCurrency(grandTotalVal))}</td>
    </tr>
  `;

  const subject = `Shipment Fulfilled & Delivered #${cleanOrderNumber} - The Street Co`;
  const html = renderMinimalEmailShell({
    pageTitle: subject,
    heading: 'Shipment Fulfilled',
    firstName,
    introHtml,
    ctaLabel: 'Request Exchange / Return',
    ctaHref: accountStatusUrl,
    referenceTitle: `Reference #${cleanOrderNumber}`,
    referenceSubtitle: `Delivered · ${deliveredAt}`,
    sectionLabel: 'Items delivered',
    itemsHtml,
    summaryRowsHtml,
    supportEmail,
    websiteHref,
    websiteLabel,
    assetOpts
  });

  const plainItems = items.map(it =>
    `• ${it.title} (${it.variant}, ${it.sku}) x ${it.qty} — ${formatInrCurrency(it.totalInr)}`
  ).join('\n');

  const text = `Shipment Fulfilled

Hey ${firstName},

Your shipment for order #${cleanOrderNumber} has been fulfilled and delivered to your doorstep on ${deliveredAt}.
Courier: Delhivery Express (${trackingUrl})
Delivered To: ${fullName} — ${fullAddress}

Need a different size or easy return? Visit ${accountStatusUrl} within 7 days.

Reference #${cleanOrderNumber}
Delivered · ${deliveredAt}

Items delivered:
${plainItems}

Status: Fulfilled & Delivered
Order Total: ${formatInrCurrency(grandTotalVal)}

Questions? Contact us at ${supportEmail}
${websiteLabel}
TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
© 2026 THE STREET CO ALL RIGHTS RESERVED.`;

  return { subject, html, text, cleanOrderNumber, cidAttachments };
}

export function renderEmailOtpEmail({
  otpCode = '849201',
  recipientName = 'Customer',
  recipientEmail = '',
  heading = 'Email Verification',
  bodyLineHtml = '',
  codeLabel = 'Verification OTP',
  validityNote = 'This verification code is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.',
  subject = '',
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  websiteHref = DEFAULT_WEBSITE_URL,
  websiteLabel = DEFAULT_WEBSITE_LABEL
} = {}) {
  const firstName = String(recipientName || 'Customer').trim().split(/\s+/)[0] || 'Customer';
  const cleanCode = String(otpCode || '849201').trim();
  const resolvedSubject = subject || `${cleanCode} is your 6-Digit Email Verification OTP — The Street Co`;
  const defaultBodyHtml = recipientEmail
    ? `Use the 6-digit verification code below to verify and save your email address (<strong style="color:#171717;font-weight:600;">${escapeHtml(recipientEmail)}</strong>) on your The Street Co account.`
    : `Use the 6-digit verification code below to verify your email address on your The Street Co account.`;
  const messageHtml = bodyLineHtml || defaultBodyHtml;

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${escapeHtml(resolvedSubject)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style type="text/css">
      :root { color-scheme: light only; supported-color-schemes: light only; }
      html, body { margin:0;padding:0;background-color:#FAF8F5 !important;color:#171717 !important;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:light only; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      @media (prefers-color-scheme: dark) {
        html, body, .email-light-bg, .email-light-table { background-color:#FAF8F5 !important;background-image:linear-gradient(#FAF8F5,#FAF8F5) !important;color:#171717 !important; }
        .email-dark-text, h1, h2, h3, strong { color:#171717 !important; }
        .email-muted-text { color:#52525b !important; }
        .email-subtle-text, .email-subtle-link { color:#78716c !important; }
      }
      [data-ogsb] .email-light-bg, [data-ogsb] body { background-color:#FAF8F5 !important; }
      [data-ogsc] .email-dark-text, [data-ogsc] body { color:#171717 !important; }
      [data-ogsc] .email-subtle-text, [data-ogsc] .email-subtle-link { color:#78716c !important; }
      u + .body .email-light-bg { background-color:#FAF8F5 !important;background-image:linear-gradient(#FAF8F5,#FAF8F5) !important;color:#171717 !important; }
    </style>
  </head>
  <body class="body email-light-bg" bgcolor="#FAF8F5" style="margin:0;padding:0;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);color:#171717;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF8F5" class="email-light-bg" style="width:100%;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
      <tr>
        <td align="center" bgcolor="#FAF8F5" class="email-light-bg" style="padding:40px 16px 48px 16px;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF8F5" class="email-light-table" style="width:100%;max-width:560px;background-color:#FAF8F5;background-image:linear-gradient(#FAF8F5,#FAF8F5);">
            <!-- Centered Brand Wordmark -->
            <tr>
              <td align="center" style="padding:0 0 28px 0;">
                <a href="${escapeHtml(websiteHref)}" target="_blank" class="email-dark-text" style="text-decoration:none;color:#000000;font-size:20px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                  THE STREET CO
                </a>
              </td>
            </tr>

            <!-- Main Heading -->
            <tr>
              <td align="center" style="padding:0 0 20px 0;">
                <h1 class="email-dark-text" style="margin:0;font-size:28px;font-weight:500;line-height:1.25;letter-spacing:-0.02em;color:#111111;">
                  ${escapeHtml(heading)}
                </h1>
              </td>
            </tr>

            <!-- Greeting & Body Copy (Text Only) -->
            <tr>
              <td align="center" class="email-muted-text" style="padding:0 12px 28px 12px;font-size:14px;line-height:1.65;color:#52525b;">
                <div class="email-dark-text" style="margin:0 0 16px 0;color:#404040;">Hey ${escapeHtml(firstName)},</div>
                <div style="margin:0 0 26px 0;">
                  ${messageHtml}
                </div>
                <div style="font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#78716c;margin:0 0 8px 0;">
                  ${escapeHtml(codeLabel)}
                </div>
                <div class="email-dark-text" style="font-size:34px;font-weight:600;letter-spacing:0.26em;color:#111111;line-height:1.2;margin:0 0 26px 0;">
                  ${escapeHtml(cleanCode)}
                </div>
                <div style="margin:0;font-size:13px;line-height:1.6;color:#52525b;">
                  ${escapeHtml(validityNote)}
                </div>
              </td>
            </tr>

            <!-- Subtle Brand & Storefront Footer (Text Only, Uniform Bottom Colour #78716c) -->
            <tr>
              <td align="center" style="padding:28px 0 0 0;border-top:1px solid #e5dfd5;">
                <div class="email-subtle-text" style="font-size:12px;color:#78716c;line-height:1.7;padding-top:6px;">
                  Questions? Contact us at
                  <a href="mailto:${escapeHtml(supportEmail)}" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">${escapeHtml(supportEmail)}</a>
                  <br>
                  <a href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">${escapeHtml(websiteLabel)}</a> &middot; The Street Co
                </div>

                <!-- Brand Heritage Tagline (Uniform Colour #78716c) -->
                <div class="email-subtle-text" style="margin-top:20px;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#78716c;line-height:1.6;">
                  TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
                </div>
                <div class="email-subtle-text" style="margin-top:8px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#78716c;line-height:1.5;">
                  &copy; 2026 THE STREET CO ALL RIGHTS RESERVED.
                </div>
                <div class="email-subtle-text" style="margin-top:2px;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#78716c;line-height:1.5;">
                  ELEVATED STYLE &middot; MODERN ESSENTIALS
                </div>

                <!-- Legal Footer Links (Uniform Colour #78716c) -->
                <div class="email-subtle-text" style="margin-top:16px;font-size:11px;color:#78716c;letter-spacing:0.04em;line-height:1.6;">
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#terms" target="_blank" rel="noopener noreferrer" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">Terms</a>
                  <span style="margin:0 6px;color:#78716c;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#privacy" target="_blank" rel="noopener noreferrer" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">Privacy</a>
                  <span style="margin:0 6px;color:#78716c;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#refund" target="_blank" rel="noopener noreferrer" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">Refunds</a>
                  <span style="margin:0 6px;color:#78716c;">&middot;</span>
                  <a href="${escapeHtml(websiteHref.replace(/\/$/, ''))}/#shipping" target="_blank" rel="noopener noreferrer" class="email-subtle-link" style="color:#78716c;text-decoration:underline;">Shipping</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${heading}

Hey ${firstName},

${recipientEmail ? `Use the 6-digit verification code below to verify and save your email address (${recipientEmail}) on your The Street Co account.` : 'Use the 6-digit verification code below on your The Street Co account.'}

${codeLabel}: ${cleanCode}

${validityNote}

Questions? Contact us at ${supportEmail}
${websiteLabel} · The Street Co
TIMELESS STREETWEAR CULTURE // ARCHIVE COLLECTION
© 2026 THE STREET CO ALL RIGHTS RESERVED.
ELEVATED STYLE · MODERN ESSENTIALS
Terms · Privacy · Refunds · Shipping`;

  return { subject: resolvedSubject, html, text, otpCode: cleanCode };
}

