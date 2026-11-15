/**
 * Pure helpers for The Street Co UPI Intent & Redirect Return Confirmation flow.
 * Shared across Node unit tests and browser checkout UI.
 */

export const UPI_AUTO_VERIFY_SECONDS = 240; // 4 minutes of QR showing
export const UPI_RETURN_MIN_ELAPSED_MS = 1500; // Minimum switch duration when focus returns without page hide
export const UPI_PENDING_STORAGE_KEY = 'the_street_co_pending_upi_intent';
export const UPI_PENDING_MAX_AGE_MS = 30 * 60 * 1000;

export function formatUpiAmount(amountInr) {
  const num = Number(amountInr);
  if (!Number.isFinite(num) || num <= 0) return '1.00';
  return num.toFixed(2);
}

export function sanitizeUpiNote(noteText) {
  const cleaned = String(noteText || '')
    .replace(/[^a-zA-Z0-9 #.,:/()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'The Street Co Order').slice(0, 50);
}

export function formatUpiItemsSummary(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const first = items[0] || {};
  const firstName = String(first.name || first.title || 'Apparel').trim().slice(0, 22);
  if (items.length === 1) return firstName;
  return `${firstName} +${items.length - 1}`;
}

export function buildUpiPaymentIntent({
  vpa = '6296731835@fam',
  payeeName = 'The Street Co',
  amountInr = 0,
  orderRef = '',
  items = [],
  origin = ''
} = {}) {
  const cleanRef = String(orderRef || Math.floor(100000 + Math.random() * 900000)).replace(/[^a-zA-Z0-9]/g, '') || '100000';
  const amountFormatted = formatUpiAmount(amountInr);
  const transactionRef = `TSC${cleanRef}`;
  const itemSummary = formatUpiItemsSummary(items);
  const rawNote = itemSummary
    ? `Order #${cleanRef} (${itemSummary}) - ${payeeName}`
    : `${payeeName} Order #${cleanRef}`;
  const transactionNote = sanitizeUpiNote(rawNote);

  const cleanOrigin = String(origin || '').replace(/\/$/, '');
  const returnUrl = cleanOrigin
    ? `${cleanOrigin}/?upi_return=1&order_ref=${encodeURIComponent(cleanRef)}&am=${encodeURIComponent(amountFormatted)}#upi-confirmed`
    : '';

  const params = new URLSearchParams();
  params.set('pa', String(vpa || '6296731835@fam').trim());
  params.set('pn', String(payeeName || 'The Street Co').trim());
  params.set('tr', transactionRef);
  params.set('tn', transactionNote);
  params.set('am', amountFormatted);
  params.set('cu', 'INR');
  if (returnUrl) {
    params.set('url', returnUrl);
  }

  return {
    orderRef: cleanRef,
    amountFormatted,
    transactionRef,
    transactionNote,
    returnUrl,
    upiUri: `upi://pay?${params.toString()}`
  };
}

export function shouldConfirmUpiAppReturn({
  launchedAtMs = 0,
  nowMs = Date.now(),
  wasHidden = false,
  urlSearch = '',
  urlHash = '',
  expectedRef = ''
} = {}) {
  const searchStr = String(urlSearch || '');
  const hashStr = String(urlHash || '');
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  const isCallbackParam = params.get('upi_return') === '1' || hashStr === '#upi-confirmed';

  if (isCallbackParam) {
    const callbackRef = String(params.get('order_ref') || '').trim();
    if (!expectedRef || !callbackRef || callbackRef === String(expectedRef).trim()) {
      return { shouldConfirm: true, via: 'url_callback', orderRef: callbackRef || expectedRef || '' };
    }
  }

  if (launchedAtMs > 0) {
    const elapsedMs = Math.max(0, Number(nowMs) - Number(launchedAtMs));
    if (wasHidden || elapsedMs >= UPI_RETURN_MIN_ELAPSED_MS) {
      return { shouldConfirm: true, via: 'app_switch_return', elapsedMs };
    }
  }

  return { shouldConfirm: false, via: 'none' };
}

export function serializePendingUpiState({
  refNum,
  totalInr,
  launchedAtMs = Date.now(),
  upiUri = '',
  returnUrl = '',
  checkoutSnapshot = null
} = {}) {
  return JSON.stringify({
    refNum: String(refNum || ''),
    totalInr: Number(totalInr) || 0,
    launchedAtMs: Number(launchedAtMs) || Date.now(),
    upiUri: String(upiUri || ''),
    returnUrl: String(returnUrl || ''),
    checkoutSnapshot: checkoutSnapshot || null
  });
}

export function parsePendingUpiState(rawJson, nowMs = Date.now()) {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || !parsed.refNum) return null;
    const age = Number(nowMs) - Number(parsed.launchedAtMs || 0);
    if (!Number.isFinite(age) || age < 0 || age > UPI_PENDING_MAX_AGE_MS) {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}
