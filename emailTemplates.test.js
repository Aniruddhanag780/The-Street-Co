import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInrCurrency,
  formatDateDdMmYyyy,
  extractCustomerFirstName,
  resolveItemImageUrl,
  renderOrderConfirmationEmail,
  renderReturnConfirmationEmail,
  renderShipmentFulfilledEmail,
  renderEmailOtpEmail
} from './emailTemplates.js';
import { renderGstInvoiceHtml } from './zohoInventory.js';

test('formatInrCurrency formats Indian Rupees with ₹ symbol and commas', () => {
  assert.equal(formatInrCurrency(1599), '₹1,599.00');
  assert.equal(formatInrCurrency(-200), '-₹200.00');
  assert.equal(formatInrCurrency(0), '₹0.00');
});

test('formatDateDdMmYyyy formats ISO timestamps in DD/MM/YYYY', () => {
  assert.equal(formatDateDdMmYyyy('2026-01-10T06:30:00.000Z'), '10/01/2026');
});

test('extractCustomerFirstName extracts first name cleanly', () => {
  assert.equal(extractCustomerFirstName({ shippingAddress: { fullName: 'Aniruddha Nag' } }), 'Aniruddha');
  assert.equal(extractCustomerFirstName({}), 'Customer');
});

test('resolveItemImageUrl handles relative preview vs external SMTP assets', () => {
  assert.equal(resolveItemImageUrl({ image: '/product-minato.jpg' }, { useRelativeAssets: true }), '/product-minato.jpg');
  assert.equal(
    resolveItemImageUrl({ image: '/product-minato.jpg' }, { hostOrigin: 'http://localhost:3000', useRelativeAssets: false }),
    'https://thestreetco.netlify.app/product-minato.jpg'
  );
  assert.equal(
    resolveItemImageUrl({ image: '/product-minato.jpg' }, { hostOrigin: 'https://thestreetco.com', useRelativeAssets: false }),
    'https://thestreetco.com/product-minato.jpg'
  );
});

test('renderOrderConfirmationEmail renders clean #FAF8F5 layout with ₹, English text, product image, and thestreetco.com link', () => {
  const result = renderOrderConfirmationEmail({
    order: {
      orderCode: '214822',
      orderDate: '2026-11-13T10:00:00.000Z',
      shippingAddress: { fullName: 'Aniruddha Nag', city: 'Bongaon', state: 'West Bengal' },
      subtotalInr: 1599,
      discountInr: 200,
      appliedPromoCode: 'STREET200',
      deliveryFeeInr: 0,
      grandTotalInr: 1399,
      items: [
        {
          title: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
          finish: 'Obsidian Black',
          size: 'L',
          sku: 'TS-MIN-001',
          qty: 1,
          priceInr: 1599,
          totalItemPriceInr: 1599,
          image: '/product-minato.jpg'
        }
      ]
    },
    useRelativeAssets: true
  });

  assert.match(result.subject, /Order Confirmation #214822 - The Street Co/);
  assert.match(result.html, /background-color:#FAF8F5/);
  assert.match(result.html, /Order Confirmation/);
  assert.match(result.html, /Hey Aniruddha,/);
  assert.match(result.html, /https:\/\/thestreetco\.com/);
  assert.match(result.html, /thestreetco\.com/);
  assert.match(result.html, /support@thestreetco\.zohodesk\.in/);
  assert.match(result.html, /You can see the invoice using the button below\./);
  assert.doesNotMatch(result.html, /or by using the button below\./);
  assert.match(result.html, /View Your Invoice/);
  assert.match(result.html, /https:\/\/thestreetco\.com\/invoice\/214822/);
  assert.match(result.html, /Reference #214822/);
  assert.match(result.html, /src="\/product-minato\.jpg"/);
  assert.match(result.html, /width="96" height="96"/);
  assert.match(result.html, /Obsidian Black · Size L/);
  assert.match(result.html, /TS-MIN-001/);
  assert.match(result.html, /Qty: 1/);
  assert.match(result.html, /₹1,599\.00/);
  assert.match(result.html, /-₹200\.00/);
  assert.match(result.html, /Delhivery/);
  assert.doesNotMatch(result.html, />Standard</);
  assert.match(result.html, /GST \(12% Included\)/);
  assert.match(result.html, /₹191\.88/);
  assert.match(result.html, /₹1,399\.00/);
  assert.match(result.html, /TIMELESS STREETWEAR CULTURE \/\/ ARCHIVE COLLECTION/);
  assert.match(result.html, /2026 THE STREET CO ALL RIGHTS RESERVED\./);
  assert.match(result.html, /ELEVATED STYLE/);
  assert.match(result.html, /MODERN ESSENTIALS/);
  assert.match(result.html, /alt="Instagram"/);
  assert.match(result.html, /alt="Twitter"/);
  assert.match(result.html, /alt="Reddit"/);
  assert.match(result.html, /alt="Visa"/);
  assert.match(result.html, /alt="Mastercard"/);
  assert.match(result.html, /alt="PayPal"/);
  assert.match(result.html, /alt="Apple Pay"/);
  assert.match(result.html, /alt="Stripe"/);
  assert.match(result.html, /alt="Google Pay"/);
  assert.match(result.html, /alt="Amazon Pay"/);
  assert.match(result.html, /\/public\/assets\/email\/pay-visa\.png/);
  assert.match(result.html, /\/public\/assets\/email\/social-instagram\.png/);
  assert.doesNotMatch(result.html, /<svg\b/i);
  assert.match(result.html, /thestreetco\.com(?:<\/span>)?<\/a>\s*(?:<span[^>]*>)?&middot;\s*The Street Co/);
  assert.match(result.html, /<a href="https:\/\/thestreetco\.com\/#terms"[^>]*text-decoration:underline[^>]*>(?:<span[^>]*>)?Terms(?:<\/span>)?<\/a>[\s\S]*<a href="https:\/\/thestreetco\.com\/#privacy"[^>]*text-decoration:underline[^>]*>(?:<span[^>]*>)?Privacy(?:<\/span>)?<\/a>[\s\S]*<a href="https:\/\/thestreetco\.com\/#refund"[^>]*text-decoration:underline[^>]*>(?:<span[^>]*>)?Refunds(?:<\/span>)?<\/a>[\s\S]*<a href="https:\/\/thestreetco\.com\/#shipping"[^>]*text-decoration:underline[^>]*>(?:<span[^>]*>)?Shipping(?:<\/span>)?<\/a>/);
  assert.doesNotMatch(result.html, /€|EUR/);
});

test('renderReturnConfirmationEmail uses matching minimal format and enriches item image and pricing from linked order', () => {
  const result = renderReturnConfirmationEmail({
    returnRecord: {
      id: 'RET-23665',
      orderCode: '214822',
      type: 'return',
      customerName: 'Aniruddha Nag',
      createdAt: '2026-11-13T11:00:00.000Z',
      items: [{ name: 'Fourth Hokage Minato Inspired Oversized T-Shirt', sku: 'TS-MIN-001', size: 'L' }]
    },
    order: {
      orderCode: '214822',
      grandTotalInr: 1599,
      items: [
        {
          title: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
          finish: 'Obsidian Black',
          size: 'L',
          sku: 'TS-MIN-001',
          qty: 1,
          priceInr: 1599,
          totalItemPriceInr: 1599,
          image: '/product-minato.jpg'
        }
      ]
    },
    useRelativeAssets: true
  });

  assert.match(result.subject, /Return Request Confirmation #RET-23665 - The Street Co/);
  assert.match(result.html, /background-color:#FAF8F5/);
  assert.match(result.html, /Return Request Confirmation/);
  assert.match(result.html, /Return No\. #RET-23665/);
  assert.match(result.html, /Reference #214822/);
  assert.match(result.html, /View Return Status/);
  assert.match(result.html, /src="\/product-ts-min-001\.jpg"/);
  assert.match(result.html, /₹1,599\.00/);
  assert.match(result.html, /GST \(12% Included\)/);
  assert.match(result.html, /₹191\.88/);
  assert.match(result.html, /thestreetco\.com/);
  assert.match(result.html, /support@thestreetco\.zohodesk\.in/);
  assert.match(result.html, /TIMELESS STREETWEAR CULTURE \/\/ ARCHIVE COLLECTION/);
  assert.match(result.html, /alt="Reddit"/);
  assert.match(result.html, /alt="Google Pay"/);
  assert.doesNotMatch(result.html, /<svg\b/i);
});

test('renderOrderConfirmationEmail routes View Your Invoice to Reference#-based storefront invoice and attaches no PDFs', () => {
  const result = renderOrderConfirmationEmail({
    order: {
      orderCode: '998877',
      invoice_number: 'INV-000012',
      zoho_salesorder_number: 'SO-00041',
      zoho_invoice_url: 'https://zohosecurepay.in/inventory/thestreetco/secure?CInvoiceID=2-test123',
      shippingAddress: { fullName: 'Aniruddha Nag' },
      grandTotalInr: 1599,
      items: [{ title: 'Minato Tee', size: 'L', sku: 'TS-MIN-001', qty: 1, priceInr: 1599 }]
    },
    useCidAssets: true
  });

  assert.match(result.html, /href="https:\/\/thestreetco\.com\/invoice\/998877"[^>]*>\s*View Your Invoice/);
  assert.match(result.text, /https:\/\/thestreetco\.com\/invoice\/998877/);
  assert.match(result.html, /Reference #998877/);
  assert.doesNotMatch(result.html, /INV-000012|SO-00041/);
  assert.equal(result.cidAttachments.some(a => /\.pdf$/i.test(a.filename || '') || a.contentType === 'application/pdf'), false);
});

test('renderGstInvoiceHtml uses Reference# instead of Invoice# INV-000012 and Sales Order# and hides Zoho PDF download', () => {
  const html = renderGstInvoiceHtml({
    orderCode: '512515',
    reference_number: '512515',
    invoice_number: 'INV-000012',
    zoho_invoice_id: '4226403000000368099',
    zoho_salesorder_number: 'SO-00041',
    grandTotalInr: 1599,
    shippingAddress: { fullName: 'Aniruddha Nag', city: 'Thakurnagar', state: 'West Bengal', pincode: '743287' },
    items: [{ name: 'Minato Tee', sku: 'TS-MIN-001', size: 'M', quantity: 1, priceInr: 1599 }]
  });

  assert.match(html, /<strong>Reference#:<\/strong>\s*512515/);
  assert.doesNotMatch(html, /INV-000012|SO-00041|Invoice No:|DOWNLOAD OFFICIAL ZOHO PDF|\?pdf=true/);
});

test('useCidAssets attaches inline CID PNGs and product image without SVG tags', () => {
  const result = renderOrderConfirmationEmail({
    order: {
      orderCode: '214822',
      shippingAddress: { fullName: 'Aniruddha Nag' },
      grandTotalInr: 1599,
      items: [{ title: 'Minato Tee', size: 'L', sku: 'TS-MIN-001', qty: 1, priceInr: 1599, image: '/product-minato.jpg' }]
    },
    useCidAssets: true
  });

  const cids = result.cidAttachments.map(a => a.cid);
  assert.ok(cids.includes('product-minato'));
  assert.ok(cids.includes('social-instagram'));
  assert.ok(cids.includes('social-twitter'));
  assert.ok(cids.includes('social-reddit'));
  assert.ok(cids.includes('pay-visa'));
  assert.ok(cids.includes('pay-mastercard'));
  assert.ok(cids.includes('pay-paypal'));
  assert.ok(cids.includes('pay-applepay'));
  assert.ok(cids.includes('pay-stripe'));
  assert.ok(cids.includes('pay-gpay'));
  assert.ok(cids.includes('pay-amazonpay'));
  assert.match(result.html, /src="cid:product-minato"/);
  assert.match(result.html, /src="cid:pay-visa"/);
  assert.match(result.html, /src="cid:social-reddit"/);
  assert.doesNotMatch(result.html, /<svg\b/i);
});

test('email templates enforce light theme across both light and dark mode clients', () => {
  const result = renderOrderConfirmationEmail({
    order: {
      orderCode: '214822',
      shippingAddress: { fullName: 'Aniruddha Nag' },
      grandTotalInr: 1399,
      items: [{ title: 'Minato Tee', size: 'L', sku: 'TS-MIN-001', qty: 1, priceInr: 1399 }]
    }
  });

  assert.match(result.html, /<meta name="color-scheme" content="light only">/i);
  assert.match(result.html, /<meta name="supported-color-schemes" content="light only">/i);
  assert.match(result.html, /color-scheme:\s*light only/i);
  assert.match(result.html, /@media \(prefers-color-scheme:\s*dark\)/i);
  assert.match(result.html, /bgcolor="#FAF8F5"/i);
  assert.match(result.html, /linear-gradient\(#FAF8F5,#FAF8F5\)/i);
});

test('renderShipmentFulfilledEmail renders #FAF8F5 layout with 96x96 product image and horizontal details', () => {
  const result = renderShipmentFulfilledEmail({
    order: {
      orderCode: '214822',
      deliveredAtFormatted: '15 Nov 2026, 10:15 PM IST',
      shippingAddress: {
        fullName: 'Aniruddha Nag',
        houseFlat: 'Shimulpur Hazratala',
        city: 'Bongaon',
        state: 'West Bengal',
        pincode: '743287'
      },
      grandTotalInr: 1399,
      items: [
        {
          title: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
          finish: 'Obsidian Black',
          size: 'L',
          sku: 'TS-MIN-001',
          qty: 1,
          priceInr: 1599,
          totalItemPriceInr: 1599,
          image: '/product-minato.jpg'
        }
      ]
    },
    useCidAssets: true
  });

  assert.match(result.subject, /Shipment Fulfilled & Delivered #214822 - The Street Co/);
  assert.match(result.html, /Shipment Fulfilled/);
  assert.match(result.html, /src="cid:product-minato"/);
  assert.match(result.html, /width="96" height="96"/);
  assert.match(result.html, /Fulfilled &amp; Delivered/);
  assert.match(result.html, /Items delivered/);
});

test('renderEmailOtpEmail includes social & payment CID icons and prevents faded blue links', () => {
  const result = renderEmailOtpEmail({
    otpCode: '849201',
    recipientName: 'Aniruddha Nag',
    recipientEmail: 'aniruddhanag780@gmail.com',
    useCidAssets: true
  });

  assert.match(result.html, /849201/);
  assert.match(result.html, /alt="Instagram"/);
  assert.match(result.html, /alt="Twitter"/);
  assert.match(result.html, /alt="Reddit"/);
  assert.match(result.html, /alt="Visa"/);
  assert.match(result.html, /alt="Mastercard"/);
  assert.match(result.html, /alt="PayPal"/);
  assert.match(result.html, /alt="Apple Pay"/);
  assert.match(result.html, /alt="Stripe"/);
  assert.match(result.html, /alt="Google Pay"/);
  assert.match(result.html, /alt="Amazon Pay"/);
  assert.match(result.html, /src="cid:social-instagram"/);
  assert.match(result.html, /src="cid:pay-visa"/);
  assert.doesNotMatch(result.html, /#2563eb/i);
  assert.equal(result.cidAttachments.length, 10);
});
