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
        label: `Address-${idx + 1}`,
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

  const finalAddresses = cleaned.map((a, idx) => ({
    ...a,
    label: `Address-${idx + 1}`,
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

export async function appendOrderToUserAccount(accountPhone, orderDocument) {
  const cleanPhone = String(
    accountPhone ||
    orderDocument?.accountPhone ||
    orderDocument?.contactDetails?.phone ||
    orderDocument?.shippingAddress?.phone ||
    ''
  ).replace(/\D/g, '').slice(-10);

  if (cleanPhone.length !== 10 || !orderDocument) return null;

  try {
    const col = await getCollection('users');
    if (!col) return null;

    const existing = (await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } })) || {};
    const currentOrders = Array.isArray(existing.orders) ? existing.orders : [];

    const orderSummary = {
      orderCode: orderDocument.orderCode,
      orderId: orderDocument.orderId,
      status: orderDocument.status || 'CONFIRMED',
      orderDate: orderDocument.orderDate || new Date().toISOString(),
      orderDateFormatted: orderDocument.orderDateFormatted || '',
      grandTotalInr: orderDocument.grandTotalInr || orderDocument.totalInr || 0,
      subtotalInr: orderDocument.subtotalInr || 0,
      discountInr: orderDocument.discountInr || 0,
      paymentMethod: orderDocument.paymentMethod || 'COD',
      shippingAddress: orderDocument.shippingAddress || {},
      items: orderDocument.items || orderDocument.products || []
    };

    const filtered = currentOrders.filter(o => o && o.orderCode !== orderSummary.orderCode);
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
    if (!col) return [];
    const docs = await col
      .find(
        {
          $or: [
            { accountPhone: cleanPhone },
            { 'contactDetails.phone': { $regex: `${cleanPhone}$` } },
            { 'shippingAddress.phone': { $regex: `${cleanPhone}$` } }
          ]
        },
        { projection: { _id: 0 } }
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return docs || [];
  } catch (err) {
    console.warn('[MongoDB findOrdersByAccountPhone]:', err.message);
    return [];
  }
}
