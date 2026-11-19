import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCartEmailInrCurrency, normalizeCartItemForDisplay } from './cartItemHelper.js';

test('formatCartEmailInrCurrency formats INR values with two decimals like order email', () => {
  assert.equal(formatCartEmailInrCurrency(1599), '₹1,599.00');
  assert.equal(formatCartEmailInrCurrency(3198), '₹3,198.00');
  assert.equal(formatCartEmailInrCurrency(0), '₹0.00');
});

test('normalizeCartItemForDisplay resolves image, title, variant, SKU, qty, and total matching email', () => {
  const catalog = [
    {
      sku: 'TS-MIN-001',
      name: 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear',
      priceInr: 1599,
      images: ['/api/zoho-inventory/documents/4226403000000037086']
    }
  ];

  const result = normalizeCartItemForDisplay({
    id: 'TS-MIN-001',
    sku: 'TS-MIN-001',
    name: 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear',
    priceInr: 1599,
    qty: 2,
    size: 'L',
    finish: 'Obsidian Shadow',
    image: ''
  }, catalog);

  assert.equal(result.title, 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear');
  assert.equal(result.variant, 'Obsidian Shadow · Size L');
  assert.equal(result.sku, 'TS-MIN-001');
  assert.equal(result.qty, 2);
  assert.equal(result.totalInr, 3198);
  assert.equal(result.formattedTotalInr, '₹3,198.00');
  assert.equal(result.image, '/api/zoho-inventory/documents/4226403000000037086');
});

test('normalizeCartItemForDisplay omits empty color and falls back to Size M and /api/product-image', () => {
  const result = normalizeCartItemForDisplay({
    sku: 'TS-MIN-001',
    name: 'Fourth Hokage Minato Inspired Oversized T-Shirt',
    priceInr: 1599,
    qty: 1
  }, []);

  assert.equal(result.variant, 'Size M');
  assert.equal(result.sku, 'TS-MIN-001');
  assert.equal(result.qty, 1);
  assert.equal(result.formattedTotalInr, '₹1,599.00');
  assert.equal(result.image, '/api/product-image');
});
