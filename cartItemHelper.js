/**
 * Pure helper utilities for formatting and normalizing cart items
 * so the cart drawer renders the exact same image, title, variant/SKU text,
 * quantity, and INR price formatting as the order confirmation email.
 */

export function formatCartEmailInrCurrency(amount) {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  const abs = Math.abs(safe);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return safe < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function normalizeCartItemForDisplay(item = {}, catalogItems = []) {
  const safeItem = item && typeof item === 'object' ? item : {};
  const list = Array.isArray(catalogItems) ? catalogItems : [];
  const skuKey = String(safeItem.sku || safeItem.id || '').trim().toUpperCase();
  const nameKey = String(safeItem.title || safeItem.name || '').trim().toLowerCase();

  const matched = list.find(ci =>
    (skuKey && String(ci?.sku || ci?.id || '').trim().toUpperCase() === skuKey) ||
    (nameKey && String(ci?.title || ci?.name || '').trim().toLowerCase() === nameKey)
  ) || null;

  const title = safeItem.title || safeItem.name || matched?.title || matched?.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt';
  const size = safeItem.size || matched?.size || 'M';
  const color = safeItem.color || safeItem.finish || matched?.color || matched?.finish || '';
  const variantParts = [];
  if (color) variantParts.push(color);
  if (size) variantParts.push(`Size ${size}`);
  const variant = variantParts.join(' · ') || 'Standard Edition';

  const sku = safeItem.sku || safeItem.id || matched?.sku || matched?.id || 'TS-MIN-001';
  const qty = Math.max(1, parseInt(safeItem.quantity ?? safeItem.qty ?? 1, 10) || 1);
  const fallbackUsdInr = safeItem.priceUsd ? Math.round(Number(safeItem.priceUsd) * 83) : 0;
  const unitPrice = Number(
    safeItem.priceInr ||
    safeItem.price ||
    matched?.priceInr ||
    matched?.price ||
    fallbackUsdInr ||
    4999
  );
  const totalInr = Number(safeItem.totalItemPriceInr || (unitPrice * qty));

  const image = safeItem.image ||
    safeItem.imageUrl ||
    safeItem.img ||
    (Array.isArray(safeItem.images) && safeItem.images[0]) ||
    matched?.image ||
    matched?.imageUrl ||
    (Array.isArray(matched?.images) && matched.images[0]) ||
    '/api/product-image';

  return {
    title,
    variant,
    size,
    color,
    sku,
    qty,
    unitPrice,
    totalInr,
    formattedTotalInr: formatCartEmailInrCurrency(totalInr),
    image
  };
}
