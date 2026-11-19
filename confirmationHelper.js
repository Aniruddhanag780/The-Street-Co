/**
 * Pure helper utilities for Order Confirmed & Return/Exchange Request Submitted views.
 */

export function formatOrderDeliveryDate(createdAt, deliverySpeed) {
  const now = new Date(createdAt || Date.now());
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const daysAhead = deliverySpeed === 'express' ? 1 : 3;
  const estDate = new Date(safeNow);
  estDate.setDate(estDate.getDate() + daysAhead);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[estDate.getDay()]}, ${monthNames[estDate.getMonth()]} ${estDate.getDate()}`;
}

export function buildOrderConfirmedViewModel(orderRecord = {}) {
  const ord = orderRecord || {};
  const orderId = String(ord.orderCode || ord.orderId || '').replace(/^#/, '').trim() || '111111';
  const items = Array.isArray(ord.products) && ord.products.length > 0
    ? ord.products
    : (Array.isArray(ord.items) ? ord.items : []);
  const totalQty = items.reduce((sum, it) => sum + (Math.max(1, parseInt(it?.qty ?? it?.quantity ?? 1, 10) || 1)), 0);
  const computedSubtotal = items.reduce((sum, it) => {
    const qty = Math.max(1, parseInt(it?.qty ?? it?.quantity ?? 1, 10) || 1);
    const price = Number(it?.priceInr ?? it?.price ?? 0);
    return sum + (Number(it?.totalItemPriceInr) || (price * qty));
  }, 0);

  const subtotalInr = Number(ord.pricing?.subtotalInr ?? ord.subtotalInr ?? computedSubtotal);
  const deliveryCost = Number(ord.pricing?.deliveryCost ?? ord.delivery?.cost ?? 0);
  const discount = Number(ord.pricing?.discountInr ?? ord.discount ?? 0);
  const totalInr = Number(ord.pricing?.totalInr ?? ord.totalInr ?? Math.max(0, subtotalInr + deliveryCost - discount));

  const speed = ord.delivery?.speed === 'express' ? 'express' : 'free';
  const estimatedDelivery = ord.delivery?.estimatedDelivery || formatOrderDeliveryDate(ord.createdAt, speed);
  const courierName = speed === 'express' ? 'Express Delivery' : 'Standard Delivery';

  const payMethodRaw = String(ord.payment?.method || ord.paymentMethod || 'cod').toLowerCase();
  const payTitleMap = {
    cod: 'Cash on Delivery (COD)',
    upi: 'UPI Payment',
    card: 'Credit / Debit Card',
    netbanking: 'Net Banking'
  };
  const payStatus = payTitleMap[payMethodRaw] || 'Cash on Delivery (COD)';
  const payMethod = ord.payment?.detail || (payMethodRaw === 'cod' ? 'Pay with cash upon doorstep arrival' : 'Electronic Payment');

  const userObj = ord.user || ord.customer || ord.address || ord.shippingAddress || {};
  const recipientName = userObj.fullName || userObj.name || 'Valued Customer';
  const shortAddress = userObj.fullAddress || [
    userObj.houseFlat || userObj.address1 || '',
    userObj.city || '',
    userObj.pincode ? `- ${userObj.pincode}` : ''
  ].filter(Boolean).join(', ');

  return {
    orderId,
    statusBadge: 'ORDER CONFIRMED',
    heading: 'ORDER CONFIRMED',
    subtitle: 'Thank you for your order. Your order is confirmed and placed successfully.',
    estimatedDelivery,
    courierName,
    payStatus,
    payMethod,
    recipientName,
    shortAddress,
    items,
    totalQty: totalQty || (items.length > 0 ? items.length : 1),
    subtotalInr,
    deliveryCost,
    discount,
    totalInr
  };
}

export function buildReturnExchangeSubmittedViewModel(req = {}, ord = {}) {
  const request = req || {};
  const order = ord || {};
  const isExchange = request.type === 'exchange';
  const cleanOrderCode = String(request.orderCode || order.orderCode || order.orderId || '').replace(/^#/, '').trim();
  const requestId = String(request.id || request.exchangeId || '').trim() || 'RET-10001';

  const items = Array.isArray(request.items) && request.items.length > 0
    ? request.items
    : (Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : (Array.isArray(order.products) ? order.products : []));

  const totalQty = items.reduce((sum, it) => sum + (Math.max(1, parseInt(it?.qty ?? it?.quantity ?? 1, 10) || 1)), 0) || 1;
  const itemsTotalInr = items.reduce((sum, it) => {
    const qty = Math.max(1, parseInt(it?.qty ?? it?.quantity ?? 1, 10) || 1);
    const unitPrice = Number(it?.priceInr ?? it?.price ?? 0);
    return sum + (Number(it?.totalItemPriceInr) || (unitPrice * qty));
  }, 0);

  return {
    isExchange,
    requestId,
    orderCode: cleanOrderCode,
    statusBadge: 'STATUS: REQUEST MARKED AS SUBMITTED',
    statusValue: 'Marked as Submitted',
    heading: isExchange ? 'EXCHANGE REQUEST SUBMITTED' : 'RETURN REQUEST SUBMITTED',
    subtitle: isExchange
      ? 'Your size exchange request has been marked as submitted and scheduled for free doorstep pickup.'
      : 'Your return request has been marked as submitted and scheduled for free doorstep pickup.',
    idLabel: isExchange ? 'EXCHANGE REQUEST ID' : 'RETURN REQUEST ID',
    requestTypeLabel: isExchange ? 'Size Exchange (Free Replacement)' : 'Return Item (Full Refund)',
    requestedSize: isExchange ? (request.requestedSize || 'L') : null,
    salesreturnNumber: request.salesreturn_number || '',
    reverseAwb: request.reverseAwb || '',
    pickupAddress: request.pickupAddress || '',
    reason: request.reason || '',
    items,
    totalQty,
    itemsTotalInr,
    totalLabel: isExchange ? 'Exchange Value' : 'Estimated Refund'
  };
}
