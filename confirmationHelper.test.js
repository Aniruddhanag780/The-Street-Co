import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOrderDeliveryDate,
  buildOrderConfirmedViewModel,
  buildReturnExchangeSubmittedViewModel
} from './confirmationHelper.js';

test('buildOrderConfirmedViewModel produces explicit ORDER CONFIRMED model with totals', () => {
  const vm = buildOrderConfirmedViewModel({
    orderCode: '784920',
    createdAt: '2026-11-18T10:00:00.000Z',
    delivery: { speed: 'express', cost: 149 },
    payment: { method: 'cod', detail: 'Pay with cash upon doorstep arrival' },
    user: { fullName: 'Aarav Sharma', houseFlat: '12 Park St', city: 'Kolkata', pincode: '700016' },
    products: [
      { name: 'Oversized Hoodie', qty: 2, priceInr: 1500, totalItemPriceInr: 3000 }
    ],
    pricing: { subtotalInr: 3000, deliveryCost: 149, discountInr: 200, totalInr: 2949 }
  });

  assert.equal(vm.orderId, '784920');
  assert.equal(vm.statusBadge, 'ORDER CONFIRMED');
  assert.equal(vm.heading, 'ORDER CONFIRMED');
  assert.equal(vm.payStatus, 'Cash on Delivery (COD)');
  assert.equal(vm.payMethod, 'Pay with cash upon doorstep arrival');
  assert.equal(vm.courierName, 'Express Delivery');
  assert.equal(vm.totalQty, 2);
  assert.equal(vm.totalInr, 2949);
  assert.equal(vm.recipientName, 'Aarav Sharma');
});

test('buildReturnExchangeSubmittedViewModel marks return request clearly as submitted', () => {
  const vm = buildReturnExchangeSubmittedViewModel({
    id: 'RET-55412',
    orderCode: '#784920',
    type: 'return',
    reason: 'Changed mind',
    pickupAddress: 'Kolkata 700016',
    items: [{ name: 'Minato Tee', qty: 1, priceInr: 1599 }]
  });

  assert.equal(vm.isExchange, false);
  assert.equal(vm.requestId, 'RET-55412');
  assert.equal(vm.orderCode, '784920');
  assert.equal(vm.statusBadge, 'STATUS: REQUEST MARKED AS SUBMITTED');
  assert.equal(vm.statusValue, 'Marked as Submitted');
  assert.equal(vm.heading, 'RETURN REQUEST SUBMITTED');
  assert.equal(vm.requestedSize, null);
  assert.equal(vm.itemsTotalInr, 1599);
  assert.equal(vm.totalLabel, 'Estimated Refund');
});

test('buildReturnExchangeSubmittedViewModel marks exchange request clearly as submitted with size', () => {
  const vm = buildReturnExchangeSubmittedViewModel({
    id: 'EXC-99123',
    orderCode: '851642',
    type: 'exchange',
    requestedSize: 'XL',
    items: [{ name: 'Flame Tee', qty: 2, priceInr: 1200 }]
  });

  assert.equal(vm.isExchange, true);
  assert.equal(vm.statusBadge, 'STATUS: REQUEST MARKED AS SUBMITTED');
  assert.equal(vm.heading, 'EXCHANGE REQUEST SUBMITTED');
  assert.equal(vm.requestedSize, 'XL');
  assert.equal(vm.totalQty, 2);
  assert.equal(vm.itemsTotalInr, 2400);
  assert.equal(vm.totalLabel, 'Exchange Value');
});

test('formatOrderDeliveryDate adds 1 day for express and 3 days for standard', () => {
  const express = formatOrderDeliveryDate('2026-11-18T10:00:00.000Z', 'express');
  const standard = formatOrderDeliveryDate('2026-11-18T10:00:00.000Z', 'free');
  assert.match(express, /Nov 19$/);
  assert.match(standard, /Nov 21$/);
});
