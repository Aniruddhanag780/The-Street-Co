import test from 'node:test';
import assert from 'node:assert/strict';
import {
  doesZohoSalesOrderBelongToCustomer,
  mapZohoSalesOrderToAccountOrder,
  filterLocalOrdersAfterZohoSync
} from './zohoOrderHelper.js';

test('doesZohoSalesOrderBelongToCustomer matches shipping phone, notes, customer_id, or known local order', () => {
  const so = {
    salesorder_id: 'SO1',
    customer_id: 'CUST1',
    shipping_address: { phone: '+91 62967 31835' },
    notes: 'Storefront Order #512515'
  };

  assert.equal(doesZohoSalesOrderBelongToCustomer(so, { cleanPhone: '6296731835' }), true);
  assert.equal(doesZohoSalesOrderBelongToCustomer(so, { cleanPhone: '9999999999', matchedCustomerIds: ['CUST1'] }), true);
  assert.equal(doesZohoSalesOrderBelongToCustomer(so, { cleanPhone: '9999999999' }), false);
});

test('mapZohoSalesOrderToAccountOrder preserves CONFIRMED status for open Zoho SO and enriches items', () => {
  const so = {
    salesorder_id: '4226403000000368105',
    salesorder_number: 'SO-00042',
    reference_number: '778899',
    status: 'confirmed',
    order_status: 'confirmed',
    shipped_status: 'pending',
    invoiced_status: 'not_invoiced',
    total: 1599,
    sub_total: 1599,
    date: '2026-11-16',
    line_items: [
      { item_id: 'ITEM1', sku: 'TS-MIN-001', name: 'Minato Tee', quantity: 1, rate: 1599, description: 'SKU: TS-MIN-001 | Size: L' }
    ],
    shipping_address: { attention: 'Aniruddha', phone: '6296731835', city: 'Thakurnagar', state: 'West Bengal', zip: '743287' }
  };

  const mapped = mapZohoSalesOrderToAccountOrder(so, {
    cachedItems: [{ sku: 'TS-MIN-001', zoho_item_id: 'ITEM1', imageUrl: '/api/zoho-inventory/documents/123' }],
    cleanPhone: '6296731835'
  });

  assert.equal(mapped.orderCode, '778899');
  assert.equal(mapped.status, 'CONFIRMED');
  assert.equal(mapped.zoho_order_status, 'confirmed');
  assert.equal(mapped.items.length, 1);
  assert.equal(mapped.items[0].size, 'L');
  assert.equal(mapped.items[0].image, '/api/zoho-inventory/documents/123');
});

test('filterLocalOrdersAfterZohoSync drops deleted orders for current user while keeping Zoho orders', () => {
  const localOrders = [
    { orderCode: '512515', accountPhone: '6296731835' },
    { orderCode: 'DELETED-OLD-1', accountPhone: '6296731835' },
    { orderCode: 'OTHER-USER-1', accountPhone: '9876543210' }
  ];
  const zohoOrders = [{ orderCode: '512515', accountPhone: '6296731835', zoho_salesorder_id: 'SO41' }];

  const result = filterLocalOrdersAfterZohoSync(localOrders, '6296731835', zohoOrders);
  assert.deepEqual(
    result.map(o => o.orderCode),
    ['512515', 'OTHER-USER-1']
  );
});
