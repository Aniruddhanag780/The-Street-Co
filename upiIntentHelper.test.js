import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPI_AUTO_VERIFY_SECONDS,
  UPI_RETURN_MIN_ELAPSED_MS,
  formatUpiAmount,
  buildUpiPaymentIntent,
  shouldConfirmUpiAppReturn,
  serializePendingUpiState,
  parsePendingUpiState
} from './upiIntentHelper.js';

test('UPI auto-verify window is configured to 4 minutes (240 seconds)', () => {
  assert.equal(UPI_AUTO_VERIFY_SECONDS, 240);
});

test('buildUpiPaymentIntent includes exact amount, transaction ref, order details, and app return URL', () => {
  const intent = buildUpiPaymentIntent({
    vpa: '6296731835@fam',
    payeeName: 'The Street Co',
    amountInr: 1399,
    orderRef: '214822',
    items: [{ name: 'Fourth Hokage Minato Inspired Oversized T-Shirt', qty: 1 }],
    origin: 'https://thestreetco.com'
  });

  assert.equal(formatUpiAmount(1399), '1399.00');
  assert.equal(intent.amountFormatted, '1399.00');
  assert.equal(intent.transactionRef, 'TSC214822');
  assert.match(intent.upiUri, /^upi:\/\/pay\?/);

  const parsed = new URL(intent.upiUri);
  assert.equal(parsed.searchParams.get('pa'), '6296731835@fam');
  assert.equal(parsed.searchParams.get('pn'), 'The Street Co');
  assert.equal(parsed.searchParams.get('am'), '1399.00');
  assert.equal(parsed.searchParams.get('cu'), 'INR');
  assert.equal(parsed.searchParams.get('tr'), 'TSC214822');
  assert.match(parsed.searchParams.get('tn') || '', /Order #214822/);
  assert.equal(
    parsed.searchParams.get('url'),
    'https://thestreetco.com/?upi_return=1&order_ref=214822&am=1399.00#upi-confirmed'
  );
});

test('shouldConfirmUpiAppReturn confirms when returning from UPI app via visibility or callback URL', () => {
  const now = 1_700_000_010_000;

  // Immediate spurious focus without leaving browser does not prematurely confirm
  assert.deepEqual(
    shouldConfirmUpiAppReturn({ launchedAtMs: now - 150, nowMs: now, wasHidden: false }),
    { shouldConfirm: false, via: 'none' }
  );

  // Returning after browser tab went hidden (user switched into UPI app)
  const hiddenReturn = shouldConfirmUpiAppReturn({ launchedAtMs: now - 600, nowMs: now, wasHidden: true });
  assert.equal(hiddenReturn.shouldConfirm, true);
  assert.equal(hiddenReturn.via, 'app_switch_return');

  // Returning after minimum elapsed time in external app
  const elapsedReturn = shouldConfirmUpiAppReturn({
    launchedAtMs: now - UPI_RETURN_MIN_ELAPSED_MS - 100,
    nowMs: now,
    wasHidden: false
  });
  assert.equal(elapsedReturn.shouldConfirm, true);
  assert.equal(elapsedReturn.via, 'app_switch_return');

  // Returning via explicit UPI callback redirect URL
  const urlReturn = shouldConfirmUpiAppReturn({
    urlSearch: '?upi_return=1&order_ref=214822&am=1399.00',
    urlHash: '#upi-confirmed',
    expectedRef: '214822'
  });
  assert.equal(urlReturn.shouldConfirm, true);
  assert.equal(urlReturn.via, 'url_callback');
});

test('pending UPI state serializes and restores cleanly within expiry window', () => {
  const now = 1_700_000_000_000;
  const serialized = serializePendingUpiState({
    refNum: '908172',
    totalInr: 1599,
    launchedAtMs: now,
    upiUri: 'upi://pay?pa=6296731835@fam&am=1599.00',
    checkoutSnapshot: { items: [{ sku: 'TS-MIN-001', qty: 1 }] }
  });

  const restored = parsePendingUpiState(serialized, now + 10_000);
  assert.equal(restored?.refNum, '908172');
  assert.equal(restored?.totalInr, 1599);

  const expired = parsePendingUpiState(serialized, now + 45 * 60 * 1000);
  assert.equal(expired, null);
});
