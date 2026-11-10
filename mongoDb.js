import { MongoClient } from 'mongodb';

const DEFAULT_MONGODB_URI = 'mongodb+srv://aniruddhanag780_db_user:MIHtGOi9FH6Wgzd1@cluster-1.torqvts.mongodb.net/thestreetco?retryWrites=true&w=majority&appName=Cluster-1';
const DEFAULT_DB_NAME = 'thestreetco';

let client = null;
let dbInstance = null;
let connectionPromise = null;
let connectionStatus = {
  connected: false,
  cluster: 'cluster-1.torqvts.mongodb.net',
  dbName: DEFAULT_DB_NAME,
  user: 'aniruddhanag780_db_user',
  lastConnectedAt: null,
  lastError: null
};

export function getMongoUri() {
  const raw = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
  if (raw.endsWith('.mongodb.net/')) {
    return `${raw}${DEFAULT_DB_NAME}?retryWrites=true&w=majority`;
  }
  return raw;
}

export function getMongoDbName() {
  return (process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME).trim();
}

export async function connectMongoDb() {
  if (dbInstance && connectionStatus.connected) {
    return dbInstance;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = getMongoUri();
  const dbName = getMongoDbName();

  connectionPromise = (async () => {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000
      });
      await client.connect();
      dbInstance = client.db(dbName);

      // Ensure indexes for fast account & order lookups
      await Promise.allSettled([
        dbInstance.collection('users').createIndex({ phone: 1 }, { unique: true }),
        dbInstance.collection('orders').createIndex({ orderCode: 1 }, { unique: true }),
        dbInstance.collection('orders').createIndex({ accountPhone: 1 }),
        dbInstance.collection('coupons').createIndex({ code: 1 }, { unique: true }),
        dbInstance.collection('newsletter_subscribers').createIndex({ email: 1 }, { unique: true })
      ]);

      connectionStatus = {
        connected: true,
        cluster: 'cluster-1.torqvts.mongodb.net',
        dbName,
        user: 'aniruddhanag780_db_user',
        lastConnectedAt: new Date().toISOString(),
        lastError: null
      };
      console.log(`[MongoDB Atlas] Connected to ${connectionStatus.cluster} (DB: ${dbName})`);
      return dbInstance;
    } catch (err) {
      connectionStatus.connected = false;
      connectionStatus.lastError = err.message;
      console.warn('[MongoDB Atlas] Connection warning:', err.message);
      return null;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export function getMongoStatus() {
  return { ...connectionStatus };
}

export async function getCollection(name) {
  const db = dbInstance || (await connectMongoDb());
  if (!db) return null;
  return db.collection(name);
}

// Normalize and sequentially label user addresses as Address-1, Address-2, etc.
export function normalizeUserAddresses(rawAddresses = [], preferredDefaultId = '') {
  if (!Array.isArray(rawAddresses)) return { addresses: [], defaultAddressId: '' };

  const cleaned = rawAddresses
    .filter(a => a && typeof a === 'object' && (a.address1 || a.houseFlat || a.city || a.pincode))
    .map((a, idx) => {
      const id = String(a.id || `addr_${idx + 1}_${Date.now()}`).trim();
      const name = String(a.name || a.fullName || '').trim();
      const phone = String(a.phone || '').replace(/\D/g, '').slice(-10);
      const email = String(a.email || '').trim();
      const address1 = String(a.address1 || a.houseFlat || '').trim();
      const address2 = String(a.address2 || a.streetRoad || '').trim();
      const landmark = String(a.landmark || '').trim();
      const city = String(a.city || '').trim();
      const state = String(a.state || '').trim();
      const pincode = String(a.pincode || '').replace(/\D/g, '').slice(0, 6);
      const type = String(a.type || a.addressType || 'Home').trim();
      const fullAddress = [
        address1,
        address2,
        landmark ? `(Near ${landmark})` : '',
        city,
        state ? `${state} - ${pincode}` : pincode
      ].filter(Boolean).join(', ');

      return {
        id,
        label: a.type || a.addressType || 'Delivery Address',
        name,
        fullName: name,
        phone,
        email,
        address1,
        houseFlat: address1,
        address2,
        streetRoad: address2,
        landmark,
        city,
        state,
        pincode,
        type,
        addressType: type,
        fullAddress,
        isDefault: Boolean(a.isDefault),
        createdAt: a.createdAt || new Date().toISOString()
      };
    });

  // Determine which address is default
  let resolvedDefaultId = String(preferredDefaultId || '').trim();
  if (resolvedDefaultId && !cleaned.some(a => a.id === resolvedDefaultId)) {
    resolvedDefaultId = '';
  }
  if (!resolvedDefaultId) {
    // Check if any item has isDefault: true (prefer the last one marked isDefault if multiple)
    for (let i = cleaned.length - 1; i >= 0; i--) {
      if (cleaned[i].isDefault) {
        resolvedDefaultId = cleaned[i].id;
        break;
      }
    }
  }

  const finalAddresses = cleaned.map((a) => ({
    ...a,
    label: a.type || a.addressType || 'Delivery Address',
    isDefault: Boolean(resolvedDefaultId && a.id === resolvedDefaultId)
  }));

  return {
    addresses: finalAddresses,
    defaultAddressId: resolvedDefaultId
  };
}

// ── User Account Profile Helpers (MongoDB 'users' collection) ──
export async function findUserByPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;
  try {
    const col = await getCollection('users');
    if (!col) return null;
    const doc = await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } });
    if (!doc) return null;
    const { addresses, defaultAddressId } = normalizeUserAddresses(doc.addresses || [], doc.defaultAddressId || '');
    return {
      ...doc,
      addresses,
      defaultAddressId
    };
  } catch (err) {
    console.warn('[MongoDB users.findOne]:', err.message);
    return null;
  }
}

export async function upsertUserByPhone(phone, updates = {}) {
  const cleanPhone = String(phone || updates.phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const nowIso = new Date().toISOString();

    const firstName = updates.firstName !== undefined
      ? String(updates.firstName || '').trim()
      : String(existing.firstName || '').trim();
    const lastName = updates.lastName !== undefined
      ? String(updates.lastName || '').trim()
      : String(existing.lastName || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const email = updates.email !== undefined
      ? String(updates.email || '').trim().toLowerCase()
      : String(existing.email || '').trim().toLowerCase();

    const emailVerified = updates.emailVerified !== undefined
      ? Boolean(updates.emailVerified && email)
      : Boolean(existing.emailVerified && email);

    const phoneVerified = updates.phoneVerified !== undefined
      ? Boolean(updates.phoneVerified)
      : (existing.phoneVerified !== undefined ? Boolean(existing.phoneVerified) : true);

    const firebaseUid = String(updates.firebaseUid || existing.firebaseUid || '').trim();

    const rawAddresses = updates.addresses !== undefined
      ? updates.addresses
      : (Array.isArray(existing.addresses) ? existing.addresses : []);
    const rawDefaultId = updates.defaultAddressId !== undefined
      ? updates.defaultAddressId
      : (existing.defaultAddressId || '');

    const { addresses, defaultAddressId } = normalizeUserAddresses(rawAddresses, rawDefaultId);

    const orders = Array.isArray(updates.orders)
      ? updates.orders
      : (Array.isArray(existing.orders) ? existing.orders : []);

    const streetCashBalance = updates.streetCashBalance !== undefined
      ? Math.max(0, Number(updates.streetCashBalance) || 0)
      : Math.max(0, Number(existing.streetCashBalance) || 0);

    const streetCashEarnedTotal = updates.streetCashEarnedTotal !== undefined
      ? Math.max(0, Number(updates.streetCashEarnedTotal) || 0)
      : Math.max(0, Number(existing.streetCashEarnedTotal) || 0);

    const streetCashSpentTotal = updates.streetCashSpentTotal !== undefined
      ? Math.max(0, Number(updates.streetCashSpentTotal) || 0)
      : Math.max(0, Number(existing.streetCashSpentTotal) || 0);

    const streetCashHistory = Array.isArray(updates.streetCashHistory)
      ? updates.streetCashHistory
      : (Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : []);

    const streetCashCoupons = Array.isArray(updates.streetCashCoupons)
      ? updates.streetCashCoupons
      : (Array.isArray(existing.streetCashCoupons) ? existing.streetCashCoupons : []);

    const mergedDoc = {
      phone: cleanPhone,
      phoneWithCountryCode: `+91 ${cleanPhone}`,
      phoneVerified,
      firstName,
      lastName,
      fullName,
      email,
      emailVerified,
      addresses,
      defaultAddressId,
      orders,
      streetCashBalance,
      streetCashEarnedTotal,
      streetCashSpentTotal,
      streetCashHistory,
      streetCashCoupons,
      ...(firebaseUid ? { firebaseUid } : {}),
      createdAt: existing.createdAt || nowIso,
      lastLoginAt: updates.lastLoginAt || existing.lastLoginAt || nowIso,
      updatedAt: nowIso
    };

    await col.updateOne(
      { phone: cleanPhone },
      { $set: mergedDoc },
      { upsert: true }
    );

    return mergedDoc;
  } catch (err) {
    console.warn('[MongoDB users.upsert]:', err.message);
    return null;
  }
}

// Migrate user profile and associated orders from old phone to new phone
export async function changeUserPhone(oldPhone, newPhone) {
  const cleanOld = String(oldPhone || '').replace(/\D/g, '').slice(-10);
  const cleanNew = String(newPhone || '').replace(/\D/g, '').slice(-10);
  if (cleanOld.length !== 10 || cleanNew.length !== 10) return null;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanOld }, { projection: { _id: 0 } })) || {};
    const nowIso = new Date().toISOString();

    const updatedDoc = {
      ...existing,
      phone: cleanNew,
      phoneWithCountryCode: `+91 ${cleanNew}`,
      phoneVerified: true,
      updatedAt: nowIso
    };

    // Remove old document and store with new phone key
    await col.deleteOne({ phone: cleanOld });
    await col.updateOne({ phone: cleanNew }, { $set: updatedDoc }, { upsert: true });

    // Migrate all associated orders
    const ordersCol = await getCollection('orders');
    if (ordersCol) {
      await ordersCol.updateMany({ accountPhone: cleanOld }, { $set: { accountPhone: cleanNew } }).catch(() => {});
    }

    return updatedDoc;
  } catch (err) {
    console.warn('[MongoDB changeUserPhone error]:', err.message);
    return null;
  }
}

export async function appendOrderToUserAccount(accountPhone, orderDocument) {
  const cleanPhone = String(
    accountPhone ||
    orderDocument?.accountPhone ||
    orderDocument?.contactDetails?.phone ||
    orderDocument?.shippingAddress?.phone ||
    orderDocument?.user?.phone ||
    ''
  ).replace(/\D/g, '').slice(-10);

  if (cleanPhone.length !== 10 || !orderDocument) return null;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const currentOrders = Array.isArray(existing.orders) ? existing.orders : [];

    const rawItems = orderDocument.items || orderDocument.products || orderDocument.productDetails || [];
    const normalizedItems = Array.isArray(rawItems) ? rawItems.map(it => {
      const img = it.image || it.imageUrl || it.img || (Array.isArray(it.images) ? it.images[0] : '') || '';
      return {
        id: it.id || it.sku || '',
        sku: it.sku || it.id || '',
        name: it.name || it.title || 'Streetwear Apparel',
        title: it.title || it.name || 'Streetwear Apparel',
        priceInr: Number(it.priceInr ?? it.price ?? 0),
        price: Number(it.priceInr ?? it.price ?? 0),
        qty: Math.max(1, parseInt(it.qty || it.quantity, 10) || 1),
        quantity: Math.max(1, parseInt(it.qty || it.quantity, 10) || 1),
        totalItemPriceInr: Number(it.totalItemPriceInr ?? ((it.priceInr ?? it.price ?? 0) * (it.qty || it.quantity || 1))),
        size: it.size || 'M',
        finish: it.finish || 'Classic Black',
        image: img,
        imageUrl: img
      };
    }) : [];

    const orderSummary = {
      orderCode: orderDocument.orderCode,
      orderId: orderDocument.orderId,
      accountPhone: cleanPhone,
      status: orderDocument.status || 'CONFIRMED',
      orderDate: orderDocument.orderDate || new Date().toISOString(),
      orderDateFormatted: orderDocument.orderDateFormatted || '',
      grandTotalInr: Number(orderDocument.grandTotalInr || orderDocument.totalInr || 0),
      totalInr: Number(orderDocument.grandTotalInr || orderDocument.totalInr || 0),
      subtotalInr: Number(orderDocument.subtotalInr || 0),
      discountInr: Number(orderDocument.discountInr || 0),
      deliveryFeeInr: Number(orderDocument.deliveryFeeInr || orderDocument.delivery?.cost || 0),
      paymentMethod: orderDocument.paymentMethod || orderDocument.payment?.method || 'COD',
      paymentStatus: orderDocument.paymentStatus || 'CONFIRMED',
      shippingAddress: orderDocument.shippingAddress || orderDocument.address || orderDocument.customer || {},
      deliveryDetails: orderDocument.deliveryDetails || orderDocument.delivery || {},
      items: normalizedItems,
      products: normalizedItems,
      zoho_salesorder_number: orderDocument.zoho_salesorder_number || '',
      zoho_invoice_url: orderDocument.zoho_invoice_url || orderDocument.invoiceUrl || ''
    };

    const filtered = currentOrders.filter(o => o && o.orderCode !== orderSummary.orderCode && o.orderId !== orderSummary.orderId);
    const updatedOrders = [orderSummary, ...filtered].slice(0, 50);

    return await upsertUserByPhone(cleanPhone, {
      phone: cleanPhone,
      orders: updatedOrders
    });
  } catch (err) {
    console.warn('[MongoDB appendOrderToUserAccount]:', err.message);
    return null;
  }
}

export async function findOrdersByAccountPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return [];
  try {
    const col = await getCollection('orders');
    let docs = [];
    if (col) {
      docs = await col
        .find(
          {
            $or: [
              { accountPhone: cleanPhone },
              { 'contactDetails.phone': { $regex: `${cleanPhone}$` } },
              { 'shippingAddress.phone': { $regex: `${cleanPhone}$` } },
              { 'user.phone': { $regex: `${cleanPhone}$` } },
              { 'customer.phone': { $regex: `${cleanPhone}$` } }
            ]
          },
          { projection: { _id: 0 } }
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
    }

    // Also merge with orders inside the 'users' collection document for this phone
    const userCol = await getCollection('users');
    let userOrders = [];
    if (userCol) {
      const u = await userCol.findOne({ phone: cleanPhone }, { projection: { _id: 0, orders: 1 } });
      if (u && Array.isArray(u.orders)) {
        userOrders = u.orders;
      }
    }

    const seen = new Set();
    const combined = [];
    for (const ord of [...(docs || []), ...userOrders]) {
      if (!ord) continue;
      const key = ord.orderCode || ord.orderId;
      if (key && !seen.has(key)) {
        seen.add(key);
        // Ensure items have proper pictures
        const items = ord.items || ord.products || [];
        const normalizedItems = Array.isArray(items) ? items.map(it => ({
          ...it,
          image: it.image || it.imageUrl || it.img || (Array.isArray(it.images) ? it.images[0] : '') || '',
          imageUrl: it.imageUrl || it.image || it.img || (Array.isArray(it.images) ? it.images[0] : '') || ''
        })) : [];

        combined.push({
          ...ord,
          items: normalizedItems,
          products: normalizedItems
        });
      }
    }

    return combined;
  } catch (err) {
    console.warn('[MongoDB findOrdersByAccountPhone]:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STREET CASH — VIP LOYALTY POINTS SYSTEM
// Rate: Per 1,000 Rs spent will give you 199 The Street Cash (0.199 pts/Rs)
// Minimum points to redeem: 499 The Street Cash = ₹499 OFF Coupon (One-Time Use)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserStreetCash(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return {
      phone: '',
      streetCashBalance: 0,
      streetCashEarnedTotal: 0,
      streetCashSpentTotal: 0,
      streetCashHistory: [],
      streetCashCoupons: [],
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash'
    };
  }

  try {
    const col = await getCollection('users');
    let user = null;
    if (col) {
      user = await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } });
    }

    if (!user) {
      user = await upsertUserByPhone(cleanPhone, {
        phone: cleanPhone,
        streetCashBalance: 0,
        streetCashEarnedTotal: 0,
        streetCashSpentTotal: 0,
        streetCashHistory: [],
        streetCashCoupons: []
      });
    }

    // Look up any coupons minted for this phone from MongoDB 'coupons' collection
    const couponsCol = await getCollection('coupons');
    let dbCoupons = [];
    if (couponsCol) {
      dbCoupons = await couponsCol
        .find({ userPhone: cleanPhone }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    }

    const userCoupons = Array.isArray(user?.streetCashCoupons) ? user.streetCashCoupons : [];
    const couponMap = new Map();
    for (const c of [...dbCoupons, ...userCoupons]) {
      if (c && c.code && !couponMap.has(c.code)) {
        couponMap.set(c.code, c);
      }
    }

    const balance = Math.max(0, Number(user?.streetCashBalance) || 0);
    const earned = Math.max(0, Number(user?.streetCashEarnedTotal) || 0);
    const spent = Math.max(0, Number(user?.streetCashSpentTotal) || 0);
    const history = Array.isArray(user?.streetCashHistory) ? user.streetCashHistory : [];

    return {
      phone: cleanPhone,
      streetCashBalance: balance,
      streetCashEarnedTotal: earned,
      streetCashSpentTotal: spent,
      streetCashHistory: history,
      streetCashCoupons: Array.from(couponMap.values()),
      streetCashBonuses: user?.streetCashBonuses || {},
      canRedeem: balance >= 499,
      minRedemptionPoints: 499,
      minRedemptionInr: 499,
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash'
    };
  } catch (err) {
    console.warn('[MongoDB getUserStreetCash error]:', err.message);
    return {
      phone: cleanPhone,
      streetCashBalance: 0,
      streetCashEarnedTotal: 0,
      streetCashSpentTotal: 0,
      streetCashHistory: [],
      streetCashCoupons: [],
      canRedeem: false,
      minRedemptionPoints: 499,
      minRedemptionInr: 499,
      displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash'
    };
  }
}

export const STREET_CASH_BONUS_CONFIG = {
  account_creation: {
    points: 75,
    label: 'New Account Creation (+75 pts)',
    reason: 'New Account Creation'
  },
  profile_name: {
    points: 25,
    label: 'Name Uploaded in Profile (+25 pts)',
    reason: 'Name Upload in My Account'
  },
  profile_email: {
    points: 35,
    label: 'Email Added to Account (+35 pts)',
    reason: 'Email Added in My Account'
  },
  first_order: {
    points: 49,
    label: 'First Order Street Cash Bonus (+49 pts)',
    reason: '1st Order Reward'
  }
};

export async function awardStreetCashBonus(phone, bonusKey) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;
  const config = STREET_CASH_BONUS_CONFIG[bonusKey];
  if (!config) return null;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const bonuses = existing.streetCashBonuses || {};
    if (bonuses[bonusKey]) {
      return {
        alreadyAwarded: true,
        bonusKey,
        currentBalance: Math.max(0, Number(existing.streetCashBalance) || 0)
      };
    }

    const currentBalance = Math.max(0, Number(existing.streetCashBalance) || 0);
    const currentEarned = Math.max(0, Number(existing.streetCashEarnedTotal) || 0);
    const newBalance = currentBalance + config.points;
    const newEarned = currentEarned + config.points;

    const historyEntry = {
      id: `bonus_${bonusKey}_${Date.now()}`,
      type: 'EARNED',
      points: config.points,
      bonusKey,
      date: new Date().toISOString(),
      label: config.label
    };

    const currentHistory = Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : [];
    const updatedHistory = [historyEntry, ...currentHistory].slice(0, 100);
    const updatedBonuses = { ...bonuses, [bonusKey]: true, [`${bonusKey}At`]: new Date().toISOString() };

    await col.updateOne(
      { phone: cleanPhone },
      {
        $set: {
          streetCashBalance: newBalance,
          streetCashEarnedTotal: newEarned,
          streetCashBonuses: updatedBonuses,
          streetCashHistory: updatedHistory,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    console.log(`[The Street Cash Bonus] Credited ${config.points} pts (${bonusKey}) to ${cleanPhone}. New Balance: ${newBalance}`);
    return {
      awarded: true,
      bonusKey,
      points: config.points,
      label: config.label,
      reason: config.reason,
      newBalance,
      historyEntry
    };
  } catch (err) {
    console.warn('[MongoDB awardStreetCashBonus error]:', err.message);
    return null;
  }
}

export async function syncUserOnboardingBonuses(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return { bonuses: {}, awardedList: [], totalAwarded: 0 };

  try {
    const usersCol = await getCollection('users');
    if (!usersCol) return { bonuses: {}, awardedList: [], totalAwarded: 0 };

    const user = (await usersCol.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const bonuses = { ...(user.streetCashBonuses || {}) };
    const awardedList = [];

    // 1. Account creation bonus (75 pts) - Automatically awarded if user has created an account / logged in
    if (!bonuses.account_creation && cleanPhone.length === 10) {
      const res = await awardStreetCashBonus(cleanPhone, 'account_creation');
      if (res && res.awarded) {
        awardedList.push(res);
        bonuses.account_creation = true;
      }
    }

    // 2. Name uploaded in My Account (25 pts)
    const hasName = Boolean((user.firstName && user.firstName.trim()) || (user.lastName && user.lastName.trim()) || (user.name && user.name.trim()));
    if (!bonuses.profile_name && hasName) {
      const res = await awardStreetCashBonus(cleanPhone, 'profile_name');
      if (res && res.awarded) {
        awardedList.push(res);
        bonuses.profile_name = true;
      }
    }

    // 3. Email added in My Account (35 pts)
    const hasEmail = Boolean(user.email && String(user.email).includes('@'));
    if (!bonuses.profile_email && hasEmail) {
      const res = await awardStreetCashBonus(cleanPhone, 'profile_email');
      if (res && res.awarded) {
        awardedList.push(res);
        bonuses.profile_email = true;
      }
    }

    // 4. Check if user already placed an order (49 pts for 1st order)
    if (!bonuses.first_order) {
      const ordersCol = await getCollection('orders');
      if (ordersCol) {
        const orderCount = await ordersCol.countDocuments({
          $or: [
            { 'contactDetails.phone': cleanPhone },
            { 'shippingAddress.phone': cleanPhone },
            { accountPhone: cleanPhone },
            { phone: cleanPhone }
          ]
        });
        if (orderCount > 0) {
          const res = await awardStreetCashBonus(cleanPhone, 'first_order');
          if (res && res.awarded) {
            awardedList.push(res);
            bonuses.first_order = true;
          }
        }
      }
    }

    const latestUser = (await usersCol.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    return {
      bonuses: latestUser.streetCashBonuses || bonuses,
      awardedList,
      totalAwarded: awardedList.reduce((acc, curr) => acc + (curr.points || 0), 0),
      currentBalance: Math.max(0, Number(latestUser.streetCashBalance) || 0)
    };
  } catch (err) {
    console.warn('[MongoDB syncUserOnboardingBonuses error]:', err.message);
    return { bonuses: {}, awardedList: [], totalAwarded: 0 };
  }
}

export async function awardStreetCashForOrder(phone, grandTotalInr, orderCode) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;

  const total = Math.max(0, Number(grandTotalInr) || 0);
  // Rate: 0.199 points per 1 Rs (Per 1,000 Rs spent = 199 The Street Cash)
  let standardPoints = Math.floor(total * 0.199);
  if (standardPoints <= 0 && total > 0) standardPoints = 1;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const bonuses = existing.streetCashBonuses || {};
    const isFirstOrder = !bonuses.first_order;
    const firstOrderBonusPts = isFirstOrder ? 49 : 0;
    const totalPointsAwarded = standardPoints + firstOrderBonusPts;

    const currentBalance = Math.max(0, Number(existing.streetCashBalance) || 0);
    const currentEarned = Math.max(0, Number(existing.streetCashEarnedTotal) || 0);
    const newBalance = currentBalance + totalPointsAwarded;
    const newEarned = currentEarned + totalPointsAwarded;

    const historyEntries = [];
    if (standardPoints > 0) {
      historyEntries.push({
        id: `earn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'EARNED',
        points: standardPoints,
        inrSpent: total,
        orderCode: orderCode || '',
        date: new Date().toISOString(),
        label: `Order #${orderCode} Street Cash Bonus (+${standardPoints} pts)`
      });
    }

    if (isFirstOrder) {
      historyEntries.push({
        id: `bonus_first_order_${Date.now()}`,
        type: 'EARNED',
        points: 49,
        bonusKey: 'first_order',
        date: new Date().toISOString(),
        label: 'First Order Street Cash Bonus (+49 pts)'
      });
    }

    const currentHistory = Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : [];
    const updatedHistory = [...historyEntries, ...currentHistory].slice(0, 100);
    const updatedBonuses = isFirstOrder ? { ...bonuses, first_order: true, first_orderAt: new Date().toISOString() } : bonuses;

    await col.updateOne(
      { phone: cleanPhone },
      {
        $set: {
          streetCashBalance: newBalance,
          streetCashEarnedTotal: newEarned,
          streetCashBonuses: updatedBonuses,
          streetCashHistory: updatedHistory,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    console.log(`[The Street Cash] Awarded ${totalPointsAwarded} pts (${standardPoints} standard + ${firstOrderBonusPts} first order bonus) to ${cleanPhone} for order #${orderCode} (New balance: ${newBalance})`);
    return {
      pointsAwarded: totalPointsAwarded,
      standardPoints,
      firstOrderBonusPts,
      isFirstOrder,
      newBalance,
      historyEntry: historyEntries[0]
    };
  } catch (err) {
    console.warn('[MongoDB awardStreetCashForOrder error]:', err.message);
    return null;
  }
}

export async function redeemStreetCashCoupon(phone, requestedPoints = 499) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { success: false, error: 'Valid 10-digit mobile number required to redeem The Street Cash.' };
  }

  const pointsToRedeem = Math.max(499, Math.floor(Number(requestedPoints) || 499));

  try {
    const col = await getCollection('users');
    if (!col) return { success: false, error: 'Database service unavailable. Please try again.' };

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const currentBalance = Math.max(0, Number(existing.streetCashBalance) || 0);

    if (currentBalance < pointsToRedeem) {
      return {
        success: false,
        error: `Insufficient Street Cash. You need at least ${pointsToRedeem} points to redeem (Current balance: ${currentBalance} The Street Cash). Remember: Per 1,000 Rs spent will give you 199 The Street Cash!`,
        currentBalance,
        requiredPoints: pointsToRedeem
      };
    }

    // Minimum redemption is 499 The Street Cash = ₹499 OFF!
    const discountInr = pointsToRedeem;
    const newBalance = currentBalance - pointsToRedeem;
    const currentSpent = Math.max(0, Number(existing.streetCashSpentTotal) || 0);
    const newSpent = currentSpent + pointsToRedeem;

    // Generate unique, premium uppercase coupon code
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couponCode = `STREETCASH-${discountInr}-${uniqueSuffix}`;
    const nowIso = new Date().toISOString();

    const voucherName = `₹${discountInr} The Street Cash VIP Voucher`;
    const voucherText = `Exclusive VIP Loyalty Reward: ₹${discountInr} Flat Discount. One-time use only.`;
    const voucherSubText = 'Applicable on all orders (No minimum order value)';

    const couponDocument = {
      code: couponCode,
      couponName: voucherName,
      couponText: voucherText,
      couponSubText: voucherSubText,
      title: voucherName,
      desc: voucherText,
      subText: voucherSubText,
      group: 'flat',
      type: 'flat',
      value: discountInr,
      discountInr: discountInr,
      minOrderValue: 0,
      maxOrderValue: null,
      maxDiscount: discountInr,
      isPublic: true,
      isOneTimeUse: true,
      isRedeemed: false,
      usageLimit: 1,
      userPhone: cleanPhone,
      redeemedAt: null,
      redeemedByOrder: null,
      badge: `FLAT ₹${discountInr} OFF`,
      status: 'active',
      createdAt: nowIso,
      source: 'the_street_cash_loyalty'
    };

    // 1. Save coupon in MongoDB 'coupons' collection
    const couponsCol = await getCollection('coupons');
    if (couponsCol) {
      await couponsCol.updateOne({ code: couponCode }, { $set: couponDocument }, { upsert: true });
    }

    // 2. Record in user's Street Cash history and coupons list
    const historyEntry = {
      id: `redeem_${Date.now()}_${uniqueSuffix}`,
      type: 'REDEEMED',
      points: -pointsToRedeem,
      discountInr: discountInr,
      couponCode: couponCode,
      date: nowIso,
      label: `Redeemed ${pointsToRedeem} Street Cash for ₹${discountInr} Voucher`
    };

    const currentHistory = Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : [];
    const updatedHistory = [historyEntry, ...currentHistory].slice(0, 100);

    const currentCoupons = Array.isArray(existing.streetCashCoupons) ? existing.streetCashCoupons : [];
    const updatedCoupons = [couponDocument, ...currentCoupons];

    await col.updateOne(
      { phone: cleanPhone },
      {
        $set: {
          streetCashBalance: newBalance,
          streetCashSpentTotal: newSpent,
          streetCashHistory: updatedHistory,
          streetCashCoupons: updatedCoupons,
          updatedAt: nowIso
        }
      },
      { upsert: true }
    );

    console.log(`[The Street Cash] User ${cleanPhone} redeemed ${pointsToRedeem} pts. Minted coupon: ${couponCode}. Remaining balance: ${newBalance}`);

    return {
      success: true,
      coupon: couponDocument,
      remainingBalance: newBalance,
      pointsRedeemed: pointsToRedeem,
      discountInr: discountInr,
      message: `Success! ${pointsToRedeem} The Street Cash redeemed. Your ₹${discountInr} OFF voucher (${couponCode}) is ready to use.`
    };
  } catch (err) {
    console.warn('[MongoDB redeemStreetCashCoupon error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function findCouponInMongo(code) {
  const raw = String(code || '').trim().toUpperCase();
  if (!raw) return null;
  try {
    const col = await getCollection('coupons');
    if (!col) return null;
    return await col.findOne({ code: raw }, { projection: { _id: 0 } });
  } catch (err) {
    console.warn('[MongoDB findCouponInMongo error]:', err.message);
    return null;
  }
}

export async function burnOneTimeCoupon(code, orderCode) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return false;
  try {
    const couponsCol = await getCollection('coupons');
    if (couponsCol) {
      await couponsCol.updateOne(
        { code: cleanCode },
        {
          $set: {
            isRedeemed: true,
            status: 'used',
            redeemedAt: new Date().toISOString(),
            redeemedByOrder: orderCode || ''
          }
        }
      ).catch(() => {});
    }
    const userCol = await getCollection('users');
    if (userCol) {
      await userCol.updateMany(
        { 'streetCashCoupons.code': cleanCode },
        {
          $set: {
            'streetCashCoupons.$.isRedeemed': true,
            'streetCashCoupons.$.status': 'used',
            'streetCashCoupons.$.redeemedAt': new Date().toISOString(),
            'streetCashCoupons.$.redeemedByOrder': orderCode || ''
          }
        }
      ).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('[burnOneTimeCoupon notice]:', err.message);
    return false;
  }
}


