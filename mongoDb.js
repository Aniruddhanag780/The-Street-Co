import { MongoClient } from 'mongodb';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ACCOUNTS_CACHE_FILE = path.join(os.tmpdir(), 'thestreetco_accounts_cache.json');

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
  collections: ['newsletter_subscribers', 'coupons'],
  lastConnectedAt: null,
  lastError: null
};

const INITIAL_ACCOUNT_SEEDS = {
  '6296731835': {
    phone: '6296731835',
    phoneWithCountryCode: '+91 6296731835',
    phoneVerified: true,
    firstName: 'Aniruddha',
    lastName: 'Nag',
    fullName: 'Aniruddha Nag',
    email: 'aniruddhanag780@gmail.com',
    emailVerified: true,
    addresses: [
      {
        id: 'addr_1_1794593258741',
        label: 'Home',
        name: 'Aniruddha Nag',
        fullName: 'Aniruddha Nag',
        phone: '6296731835',
        email: 'aniruddhanag780@gmail.com',
        address1: 'Thakurnagar Hazratala',
        houseFlat: 'Thakurnagar Hazratala',
        address2: 'Shimulpur Road',
        streetRoad: 'Shimulpur Road',
        landmark: '',
        city: 'Thakurnagar',
        state: 'West Bengal',
        pincode: '743287',
        type: 'Home',
        addressType: 'Home',
        fullAddress: 'Thakurnagar Hazratala, Shimulpur Road, Thakurnagar, West Bengal - 743287',
        isDefault: true,
        createdAt: '2026-11-13T18:07:38.741Z'
      }
    ],
    defaultAddressId: 'addr_1_1794593258741',
    createdAt: '2026-11-13T18:07:38.741Z',
    lastLoginAt: '2026-11-16T17:45:52.760Z',
    updatedAt: '2026-11-16T17:45:54.497Z'
  }
};

// Sanitize account document (points / Street Cash system permanently removed)
function sanitizeWalletDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { streetCashBalance, streetCashEarnedTotal, streetCashSpentTotal, streetCashHistory, streetCashCoupons, streetCashBonuses, ...rest } = doc;
  return rest;
}

// In-memory customer session/address/loyalty store persisted in OS temp dir
const inMemoryAccounts = new Map();
function loadLocalAccountsCache() {
  for (const [phone, doc] of Object.entries(INITIAL_ACCOUNT_SEEDS)) {
    inMemoryAccounts.set(phone, sanitizeWalletDoc({ ...doc }));
  }
  try {
    if (fs.existsSync(ACCOUNTS_CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_CACHE_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        for (const [phone, doc] of Object.entries(parsed)) {
          const clean = String(phone || '').replace(/\D/g, '').slice(-10);
          if (clean.length === 10 && doc && typeof doc === 'object') {
            inMemoryAccounts.set(clean, sanitizeWalletDoc({ ...doc, phone: clean }));
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Accounts Session] Load notice:', err.message);
  }
  persistLocalAccountsCache();
}
loadLocalAccountsCache();

function persistLocalAccountsCache() {
  try {
    const out = {};
    for (const [phone, doc] of inMemoryAccounts.entries()) {
      out[phone] = doc;
    }
    fs.writeFileSync(ACCOUNTS_CACHE_FILE, JSON.stringify(out, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Accounts Cache] Save notice:', err.message);
  }
}

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

      // Keep indexes for users_accounts, coupons, and newsletter_subscribers
      await Promise.allSettled([
        dbInstance.collection('users_accounts').createIndex({ phone: 1 }, { unique: true }),
        dbInstance.collection('coupons').createIndex({ code: 1 }, { unique: true }),
        dbInstance.collection('newsletter_subscribers').createIndex({ email: 1 }, { unique: true })
      ]);

      // Sync clean wallet state for any existing accounts into MongoDB users_accounts
      try {
        const usersCol = dbInstance.collection('users_accounts');
        for (const [phone, localDoc] of inMemoryAccounts.entries()) {
          const cleanDoc = sanitizeWalletDoc(localDoc);
          await usersCol.updateOne(
            { phone },
            { $set: cleanDoc },
            { upsert: true }
          );
        }
        const remoteDocs = await usersCol.find({}, { projection: { _id: 0 } }).toArray();
        for (const rDoc of remoteDocs) {
          const p = String(rDoc?.phone || '').replace(/\D/g, '').slice(-10);
          if (p.length === 10 && !inMemoryAccounts.has(p)) {
            inMemoryAccounts.set(p, sanitizeWalletDoc({ ...rDoc, phone: p }));
          }
        }
        persistLocalAccountsCache();
      } catch (_) {}

      connectionStatus = {
        connected: true,
        cluster: 'cluster-1.torqvts.mongodb.net',
        dbName,
        user: 'aniruddhanag780_db_user',
        collections: ['users_accounts', 'newsletter_subscribers', 'coupons'],
        lastConnectedAt: new Date().toISOString(),
        lastError: null
      };
      console.log(`[MongoDB Atlas] Connected to ${connectionStatus.cluster} (DB: ${dbName} · Accounts, Street Cash Wallet, Newsletter & Coupons)`);
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

// Normalize user delivery addresses
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

  let resolvedDefaultId = String(preferredDefaultId || '').trim();
  if (resolvedDefaultId && !cleaned.some(a => a.id === resolvedDefaultId)) {
    resolvedDefaultId = '';
  }
  if (!resolvedDefaultId) {
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

// ── Customer Account Profile & Street Cash Wallet Helpers (MongoDB users_accounts + Local Cache) ──
export async function findUserByPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;
  let doc = inMemoryAccounts.get(cleanPhone) || null;
  if (!doc) {
    try {
      const col = await getCollection('users_accounts');
      if (col) {
        const remote = await col.findOne({ phone: cleanPhone }, { projection: { _id: 0 } });
        if (remote) {
          doc = sanitizeWalletDoc({ ...remote, phone: cleanPhone });
          inMemoryAccounts.set(cleanPhone, doc);
          persistLocalAccountsCache();
        }
      }
    } catch (_) {}
  }
  if (!doc) return null;
  const { addresses, defaultAddressId } = normalizeUserAddresses(doc.addresses || [], doc.defaultAddressId || '');
  return {
    ...doc,
    addresses,
    defaultAddressId
  };
}

export async function upsertUserByPhone(phone, updates = {}) {
  const cleanPhone = String(phone || updates.phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;

  const existing = inMemoryAccounts.get(cleanPhone) || {};
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

  const rawAddresses = updates.addresses !== undefined
    ? updates.addresses
    : (Array.isArray(existing.addresses) ? existing.addresses : []);
  const rawDefaultId = updates.defaultAddressId !== undefined
    ? updates.defaultAddressId
    : (existing.defaultAddressId || '');

  const { addresses, defaultAddressId } = normalizeUserAddresses(rawAddresses, rawDefaultId);

  const mergedDoc = sanitizeWalletDoc({
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
    createdAt: existing.createdAt || nowIso,
    lastLoginAt: updates.lastLoginAt || existing.lastLoginAt || nowIso,
    updatedAt: nowIso
  });

  inMemoryAccounts.set(cleanPhone, mergedDoc);
  persistLocalAccountsCache();

  try {
    const col = await getCollection('users_accounts');
    if (col) {
      await col.updateOne({ phone: cleanPhone }, { $set: mergedDoc }, { upsert: true });
    }
  } catch (_) {}

  return mergedDoc;
}

export async function changeUserPhone(oldPhone, newPhone) {
  const cleanOld = String(oldPhone || '').replace(/\D/g, '').slice(-10);
  const cleanNew = String(newPhone || '').replace(/\D/g, '').slice(-10);
  if (cleanOld.length !== 10 || cleanNew.length !== 10) return null;

  const existing = inMemoryAccounts.get(cleanOld) || {};
  const nowIso = new Date().toISOString();

  const updatedDoc = sanitizeWalletDoc({
    ...existing,
    phone: cleanNew,
    phoneWithCountryCode: `+91 ${cleanNew}`,
    phoneVerified: true,
    updatedAt: nowIso
  });

  inMemoryAccounts.delete(cleanOld);
  inMemoryAccounts.set(cleanNew, updatedDoc);
  persistLocalAccountsCache();

  try {
    const col = await getCollection('users_accounts');
    if (col) {
      await col.deleteOne({ phone: cleanOld }).catch(() => {});
      await col.updateOne({ phone: cleanNew }, { $set: updatedDoc }, { upsert: true }).catch(() => {});
    }
  } catch (_) {}

  return updatedDoc;
}

// Orders live in Zoho Inventory (not stored in MongoDB or user profile documents)
export async function appendOrderToUserAccount() {
  return null;
}

export async function findOrdersByAccountPhone() {
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STREET CASH — VIP LOYALTY POINTS SYSTEM
// Rate: Per 1,000 Rs spent will give you 199 The Street Cash (0.199 pts/Rs)
// Minimum points to redeem: 499 The Street Cash = ₹499 OFF Coupon (One-Time Use)
// Redeemed coupons are persisted in MongoDB 'coupons' collection
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

  let user = await findUserByPhone(cleanPhone);
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

  const balance = Math.max(0, Number(user?.streetCashBalance) || 0);
  const earned = Math.max(0, Number(user?.streetCashEarnedTotal) || balance);
  const history = (Array.isArray(user?.streetCashHistory) ? user.streetCashHistory : []).filter(h => h && h.type !== 'REDEEMED');

  return {
    phone: cleanPhone,
    streetCashBalance: balance,
    streetCashEarnedTotal: earned,
    streetCashSpentTotal: 0,
    streetCashHistory: history,
    streetCashCoupons: [],
    streetCashBonuses: user?.streetCashBonuses || {},
    canRedeem: false,
    minRedemptionPoints: 0,
    minRedemptionInr: 0,
    displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash'
  };
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

  const existing = inMemoryAccounts.get(cleanPhone) || {};
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

  await upsertUserByPhone(cleanPhone, {
    streetCashBalance: newBalance,
    streetCashEarnedTotal: newEarned,
    streetCashBonuses: updatedBonuses,
    streetCashHistory: updatedHistory
  });

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
}

export async function syncUserOnboardingBonuses(phone, hasOrder = false) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return { bonuses: {}, awardedList: [], totalAwarded: 0 };

  const user = (await findUserByPhone(cleanPhone)) || {};
  const bonuses = { ...(user.streetCashBonuses || {}) };
  const awardedList = [];

  if (!bonuses.account_creation && cleanPhone.length === 10) {
    const res = await awardStreetCashBonus(cleanPhone, 'account_creation');
    if (res && res.awarded) {
      awardedList.push(res);
      bonuses.account_creation = true;
    }
  }

  const hasName = Boolean((user.firstName && user.firstName.trim()) || (user.lastName && user.lastName.trim()) || (user.name && user.name.trim()));
  if (!bonuses.profile_name && hasName) {
    const res = await awardStreetCashBonus(cleanPhone, 'profile_name');
    if (res && res.awarded) {
      awardedList.push(res);
      bonuses.profile_name = true;
    }
  }

  const hasEmail = Boolean(user.email && String(user.email).includes('@'));
  if (!bonuses.profile_email && hasEmail) {
    const res = await awardStreetCashBonus(cleanPhone, 'profile_email');
    if (res && res.awarded) {
      awardedList.push(res);
      bonuses.profile_email = true;
    }
  }

  if (!bonuses.first_order && hasOrder) {
    const res = await awardStreetCashBonus(cleanPhone, 'first_order');
    if (res && res.awarded) {
      awardedList.push(res);
      bonuses.first_order = true;
    }
  }

  const latestUser = (await findUserByPhone(cleanPhone)) || {};
  return {
    bonuses: latestUser.streetCashBonuses || bonuses,
    awardedList,
    totalAwarded: awardedList.reduce((acc, curr) => acc + (curr.points || 0), 0),
    currentBalance: Math.max(0, Number(latestUser.streetCashBalance) || 0)
  };
}

export async function awardStreetCashForOrder(phone, grandTotalInr, orderCode) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return null;

  const total = Math.max(0, Number(grandTotalInr) || 0);
  let standardPoints = Math.floor(total * 0.199);
  if (standardPoints <= 0 && total > 0) standardPoints = 1;

  const existing = inMemoryAccounts.get(cleanPhone) || {};
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

  await upsertUserByPhone(cleanPhone, {
    streetCashBalance: newBalance,
    streetCashEarnedTotal: newEarned,
    streetCashBonuses: updatedBonuses,
    streetCashHistory: updatedHistory
  });

  console.log(`[The Street Cash] Awarded ${totalPointsAwarded} pts (${standardPoints} standard + ${firstOrderBonusPts} first order bonus) to ${cleanPhone} for order #${orderCode} (New balance: ${newBalance})`);
  return {
    pointsAwarded: totalPointsAwarded,
    standardPoints,
    firstOrderBonusPts,
    isFirstOrder,
    newBalance,
    historyEntry: historyEntries[0]
  };
}

export async function earnCustomStreetCashBonus(phone, { actionId, label, points = 50 }) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { success: false, error: 'Valid phone required to claim The Street Cash bonus.' };
  }
  const existing = inMemoryAccounts.get(cleanPhone) || {};
  const history = Array.isArray(existing.streetCashHistory) ? existing.streetCashHistory : [];

  if (actionId && history.some(h => h.id === actionId)) {
    return {
      success: false,
      alreadyClaimed: true,
      message: 'Bonus points for this activity have already been claimed.',
      streetCashBalance: existing.streetCashBalance || 0
    };
  }

  const ptsToAdd = Math.max(10, Math.min(250, Number(points) || 50));
  const newBalance = (Number(existing.streetCashBalance) || 0) + ptsToAdd;
  const newEarned = (Number(existing.streetCashEarnedTotal) || 0) + ptsToAdd;

  const entry = {
    id: actionId || `bonus_${Date.now()}`,
    type: 'EARNED',
    points: ptsToAdd,
    date: new Date().toISOString(),
    label: label || 'VIP Community Street Cash Bonus'
  };

  await upsertUserByPhone(cleanPhone, {
    streetCashBalance: newBalance,
    streetCashEarnedTotal: newEarned,
    streetCashHistory: [entry, ...history].slice(0, 100)
  });

  return {
    success: true,
    pointsAwarded: ptsToAdd,
    streetCashBalance: newBalance,
    streetCashEarnedTotal: newEarned,
    entry
  };
}

export async function redeemStreetCashCoupon(phone, requestedPoints = 499) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { success: false, error: 'Valid 10-digit mobile number required to redeem The Street Cash.' };
  }

  const pointsToRedeem = Math.max(499, Math.floor(Number(requestedPoints) || 499));
  const existing = inMemoryAccounts.get(cleanPhone) || {};
  const currentBalance = Math.max(0, Number(existing.streetCashBalance) || 0);

  if (currentBalance < pointsToRedeem) {
    return {
      success: false,
      error: `Insufficient Street Cash. You need at least ${pointsToRedeem} points to redeem (Current balance: ${currentBalance} The Street Cash). Remember: Per 1,000 Rs spent will give you 199 The Street Cash!`,
      currentBalance,
      requiredPoints: pointsToRedeem
    };
  }

  const discountInr = pointsToRedeem;
  const newBalance = currentBalance - pointsToRedeem;
  const currentSpent = Math.max(0, Number(existing.streetCashSpentTotal) || 0);
  const newSpent = currentSpent + pointsToRedeem;

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

  // Persist redeemed coupon in MongoDB 'coupons' collection
  try {
    const couponsCol = await getCollection('coupons');
    if (couponsCol) {
      await couponsCol.updateOne({ code: couponCode }, { $set: couponDocument }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB coupons.upsert notice]:', err.message);
  }

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

  await upsertUserByPhone(cleanPhone, {
    streetCashBalance: newBalance,
    streetCashSpentTotal: newSpent,
    streetCashHistory: updatedHistory,
    streetCashCoupons: updatedCoupons
  });

  console.log(`[The Street Cash] User ${cleanPhone} redeemed ${pointsToRedeem} pts. Minted coupon: ${couponCode}. Remaining balance: ${newBalance}`);

  return {
    success: true,
    coupon: couponDocument,
    remainingBalance: newBalance,
    pointsRedeemed: pointsToRedeem,
    discountInr: discountInr,
    message: `Success! ${pointsToRedeem} The Street Cash redeemed. Your ₹${discountInr} OFF voucher (${couponCode}) is ready to use.`
  };
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

    for (const [phone, doc] of inMemoryAccounts.entries()) {
      if (Array.isArray(doc?.streetCashCoupons)) {
        let changed = false;
        const nextCoupons = doc.streetCashCoupons.map(c => {
          if (c && String(c.code || '').toUpperCase() === cleanCode) {
            changed = true;
            return {
              ...c,
              isRedeemed: true,
              status: 'used',
              redeemedAt: new Date().toISOString(),
              redeemedByOrder: orderCode || ''
            };
          }
          return c;
        });
        if (changed) {
          inMemoryAccounts.set(phone, { ...doc, streetCashCoupons: nextCoupons });
        }
      }
    }
    persistLocalAccountsCache();
    return true;
  } catch (err) {
    console.warn('[burnOneTimeCoupon notice]:', err.message);
    return false;
  }
}
