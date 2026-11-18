/**
 * Pure helpers for matching, mapping, and reconciling Zoho Inventory Customer Orders
 * against local/MongoDB storefront order metadata.
 */

export function normalizePhone10(rawPhone) {
  return String(rawPhone || '').replace(/\D/g, '').slice(-10);
}

export function normalizeOrderCode(rawCode) {
  return String(rawCode || '').replace(/^#/, '').trim().toUpperCase();
}

/**
 * Determine whether a Zoho Inventory Sales Order belongs to the given customer account.
 */
export function doesZohoSalesOrderBelongToCustomer(
  so,
  { cleanPhone = '', cleanEmail = '', matchedCustomerIds = [], knownLocalOrder = null } = {}
) {
  if (!so || typeof so !== 'object') return false;

  const targetPhone = normalizePhone10(cleanPhone);
  const targetEmail = String(cleanEmail || '').trim().toLowerCase();
  const idSet = new Set((Array.isArray(matchedCustomerIds) ? matchedCustomerIds : []).map(String));

  if (so.customer_id && idSet.has(String(so.customer_id))) {
    return true;
  }

  const shipPhone = normalizePhone10(so.shipping_address?.phone);
  const billPhone = normalizePhone10(so.billing_address?.phone);
  if (targetPhone && (shipPhone === targetPhone || billPhone === targetPhone)) {
    return true;
  }

  if (targetPhone && String(so.notes || '').includes(targetPhone)) {
    return true;
  }

  const soEmail = String(so.email || '').trim().toLowerCase();
  if (targetEmail && soEmail && soEmail === targetEmail) {
    return true;
  }

  const cpDetails = Array.isArray(so.contact_person_details) ? so.contact_person_details : [];
  if (targetEmail && cpDetails.some(cp => String(cp?.email || '').trim().toLowerCase() === targetEmail)) {
    return true;
  }

  if (knownLocalOrder) {
    const localPhone = normalizePhone10(
      knownLocalOrder.accountPhone ||
      knownLocalOrder.shippingAddress?.phone ||
      knownLocalOrder.user?.phone ||
      knownLocalOrder.contactDetails?.phone
    );
    const localEmail = String(
      knownLocalOrder.customerEmail ||
      knownLocalOrder.contactDetails?.email ||
      knownLocalOrder.shippingAddress?.email ||
      ''
    ).trim().toLowerCase();

    if (targetPhone && localPhone === targetPhone) return true;
    if (targetEmail && localEmail === targetEmail) return true;
  }

  return false;
}

/**
 * Map a live Zoho Inventory Sales Order (optionally enriched with Mongo/local order details)
 * into the storefront Account Order History schema.
 */
export function mapZohoSalesOrderToAccountOrder(
  so,
  { baseLocal = null, cachedItems = [], inMemoryReturn = null, cleanPhone = '' } = {}
) {
  const refCode = String(so.reference_number || '').replace(/^#/, '').trim();
  const orderCode = refCode || String(baseLocal?.orderCode || so.salesorder_number || so.salesorder_id).replace(/^#/, '').trim();

  const rawStatus = String(so.status || '').toLowerCase();
  const rawOrderStat = String(so.order_status || '').toLowerCase();
  const rawShipped = String(so.shipped_status || '').toLowerCase();

  const isFulfilled =
    rawStatus === 'fulfilled' ||
    rawStatus === 'delivered' ||
    rawStatus === 'shipped' ||
    rawShipped === 'fulfilled' ||
    rawShipped === 'shipped' ||
    rawOrderStat === 'fulfilled';

  let mappedStatus = 'CONFIRMED';
  if (isFulfilled) {
    mappedStatus = 'DELIVERED';
  } else if (rawStatus === 'void') {
    mappedStatus = 'CANCELLED';
  } else if (rawStatus === 'draft') {
    mappedStatus = 'AWAITING_ZOHO_CONFIRMATION';
  }

  // Prefer enriched storefront items if available, otherwise map Zoho SO line_items
  let items = Array.isArray(baseLocal?.items) && baseLocal.items.length > 0 ? baseLocal.items : [];
  if (items.length === 0 && Array.isArray(so.line_items)) {
    items = so.line_items.map((li) => {
      const liSku = String(li.sku || '').trim().toLowerCase();
      const liName = String(li.name || '').trim().toLowerCase();
      const matchedCatalog = (Array.isArray(cachedItems) ? cachedItems : []).find(ci =>
        (li.item_id && String(ci.zoho_item_id || '') === String(li.item_id)) ||
        (liSku && String(ci.sku || '').trim().toLowerCase() === liSku) ||
        (liName && String(ci.name || '').trim().toLowerCase() === liName)
      );
      const qty = Math.max(1, Number(li.quantity || 1));
      const rate = Number(li.rate || matchedCatalog?.price || 0);
      const sizeMatch = String(li.description || '').match(/Size:\s*([A-Za-z0-9]+)/i);
      return {
        sku: li.sku || matchedCatalog?.sku || '',
        zoho_item_id: li.item_id || '',
        name: li.name || matchedCatalog?.name || 'The Street Co Apparel',
        size: sizeMatch ? sizeMatch[1] : 'M',
        finish: 'Classic Black',
        qty,
        priceInr: rate,
        totalItemPriceInr: Number(li.item_total || rate * qty),
        image: matchedCatalog?.imageUrl || matchedCatalog?.images?.[0] || '/api/product-image'
      };
    });
  }

  const shipAddr = so.shipping_address || {};
  const fallbackFullAddr = [
    shipAddr.address,
    shipAddr.street2,
    shipAddr.city,
    shipAddr.state ? `${shipAddr.state}${shipAddr.zip ? ` - ${shipAddr.zip}` : ''}` : shipAddr.zip
  ].filter(Boolean).join(', ');

  const resolvedShippingAddress = baseLocal?.shippingAddress || {
    fullName: shipAddr.attention || so.customer_name || 'Customer',
    phone: normalizePhone10(shipAddr.phone) || normalizePhone10(cleanPhone),
    address1: shipAddr.address || '',
    city: shipAddr.city || '',
    state: shipAddr.state || '',
    pincode: shipAddr.zip || '',
    fullAddress: fallbackFullAddr || 'Address on file'
  };

  // Determine return request state
  let activeReturn = null;
  if (inMemoryReturn && inMemoryReturn.status !== 'CANCELLED') {
    activeReturn = inMemoryReturn;
  } else if (baseLocal?.returnRequest && baseLocal.returnRequest.status !== 'CANCELLED') {
    activeReturn = baseLocal.returnRequest;
  } else if (Array.isArray(so.salesreturns) && so.salesreturns.length > 0) {
    const sr = so.salesreturns[0];
    if (sr && String(sr.salesreturn_status || '').toLowerCase() !== 'void') {
      activeReturn = {
        id: sr.reference_number || sr.salesreturn_number || sr.salesreturn_id,
        orderCode,
        type: 'return',
        salesreturn_number: sr.salesreturn_number,
        zoho_salesreturn_id: sr.salesreturn_id,
        zoho_salesorder_id: so.salesorder_id,
        zoho_synced: true,
        status: 'PICKUP_SCHEDULED',
        createdAt: sr.date || so.last_modified_time
      };
    }
  }

  return {
    ...(baseLocal || {}),
    orderCode,
    orderId: orderCode,
    accountPhone: normalizePhone10(baseLocal?.accountPhone || shipAddr.phone || cleanPhone),
    orderDate: baseLocal?.orderDate || baseLocal?.createdAt || so.created_time || so.date || new Date().toISOString(),
    status: mappedStatus,
    deliveryStatus: isFulfilled ? 'DELIVERY_DONE' : (baseLocal?.deliveryStatus || undefined),
    zoho_salesorder_id: so.salesorder_id,
    zoho_salesorder_number: so.salesorder_number,
    zoho_status: rawStatus || 'confirmed',
    zoho_order_status: rawOrderStat || rawStatus || 'confirmed',
    zoho_invoiced_status: so.invoiced_status || 'not_invoiced',
    zoho_shipped_status: so.shipped_status || 'pending',
    paymentMethod: baseLocal?.paymentMethod || (String(so.paid_status || '').toLowerCase() === 'paid' ? 'UPI' : 'COD'),
    items,
    shippingAddress: resolvedShippingAddress,
    subtotalInr: Number(so.sub_total ?? baseLocal?.subtotalInr ?? so.total ?? 0),
    discountInr: Number(so.discount_total ?? baseLocal?.discountInr ?? 0),
    deliveryFeeInr: Number(so.shipping_charge ?? baseLocal?.deliveryFeeInr ?? 0),
    grandTotalInr: Number(so.total ?? baseLocal?.grandTotalInr ?? 0),
    ...(activeReturn ? {
      returnRequest: activeReturn,
      returnStatus: activeReturn.type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED'
    } : {
      returnRequest: undefined,
      returnStatus: undefined
    })
  };
}

/**
 * Keep only Zoho-backed orders for cleanPhone in local browser cache while leaving
 * other phones untouched.
 */
export function filterLocalOrdersAfterZohoSync(localOrders = [], cleanPhone = '', zohoOrders = []) {
  const targetPhone = normalizePhone10(cleanPhone);
  const zohoCodes = new Set(
    (Array.isArray(zohoOrders) ? zohoOrders : [])
      .flatMap(o => [normalizeOrderCode(o?.orderCode), normalizeOrderCode(o?.orderId), normalizeOrderCode(o?.zoho_salesorder_number)])
      .filter(Boolean)
  );
  const zohoSoIds = new Set(
    (Array.isArray(zohoOrders) ? zohoOrders : [])
      .map(o => String(o?.zoho_salesorder_id || '').trim())
      .filter(Boolean)
  );

  const untouchedOtherPhones = (Array.isArray(localOrders) ? localOrders : []).filter(o => {
    if (!o) return false;
    const oPhone = normalizePhone10(o.accountPhone || o.shippingAddress?.phone || o.user?.phone || o.contactDetails?.phone);
    if (!targetPhone) return false;
    return oPhone && oPhone !== targetPhone;
  });

  // Merge Zoho orders ahead of untouched orders from other accounts
  const merged = [];
  const seen = new Set();
  for (const zo of (Array.isArray(zohoOrders) ? zohoOrders : [])) {
    const code = normalizeOrderCode(zo?.orderCode || zo?.orderId);
    if (code && !seen.has(code)) {
      seen.add(code);
      merged.push(zo);
    }
  }
  for (const other of untouchedOtherPhones) {
    const code = normalizeOrderCode(other?.orderCode || other?.orderId);
    const soId = String(other?.zoho_salesorder_id || '').trim();
    if ((code && zohoCodes.has(code)) || (soId && zohoSoIds.has(soId))) continue;
    if (code && !seen.has(code)) {
      seen.add(code);
      merged.push(other);
    }
  }
  return merged;
}
