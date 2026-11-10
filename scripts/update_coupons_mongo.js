import { connectMongoDb, getCollection } from '../mongoDb.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, '..', 'coupons_cache.json');

function formatCouponSubText(minOrderValue, maxOrderValue) {
  const min = Number(minOrderValue) || 0;
  const max = maxOrderValue ? Number(maxOrderValue) : null;
  if (min > 0 && max && max > min) {
    return `Valid on orders between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`;
  }
  if (min > 0) {
    return `Valid on orders above ₹${min.toLocaleString('en-IN')}`;
  }
  if (max) {
    return `Valid on orders up to ₹${max.toLocaleString('en-IN')}`;
  }
  return 'Applicable on all orders (No minimum order value)';
}

const UPDATED_COUPONS = [
  // ── GROUP 1: PERCENTAGE DISCOUNTS (%) ──
  {
    code: 'STREET10',
    couponName: '10% Off Entire Order',
    couponText: 'Enjoy 10% instant discount across entire streetwear catalog.',
    group: 'percentage',
    type: 'percentage',
    value: 10,
    minOrderValue: 1500,
    maxOrderValue: 8000,
    maxDiscount: 800,
    isPublic: true,
    badge: '10% OFF',
    status: 'active'
  },
  {
    code: 'SHARINGAN15',
    couponName: '15% Off Shinobi Relics',
    couponText: 'Receive 15% instant discount on shinobi graphic hoodies & tees.',
    group: 'percentage',
    type: 'percentage',
    value: 15,
    minOrderValue: 2500,
    maxOrderValue: 12000,
    maxDiscount: 1800,
    isPublic: true,
    badge: '15% OFF',
    status: 'active'
  },
  {
    code: 'AMATERASU20',
    couponName: '20% Off Black Flame Hoard',
    couponText: 'Unlock 20% discount on high-tier streetwear apparel.',
    group: 'percentage',
    type: 'percentage',
    value: 20,
    minOrderValue: 5000,
    maxOrderValue: 25000,
    maxDiscount: 4000,
    isPublic: true,
    badge: '20% OFF',
    status: 'active'
  },
  {
    code: 'TSUKUYOMI25',
    couponName: '25% Off Grand Archive Master Collection',
    couponText: 'Exclusive 25% discount for major streetwear collectors.',
    group: 'percentage',
    type: 'percentage',
    value: 25,
    minOrderValue: 8000,
    maxOrderValue: null,
    maxDiscount: 6000,
    isPublic: true,
    badge: '25% OFF',
    status: 'active'
  },
  {
    code: 'FITBUNDLE10',
    couponName: '10% Off Complete Lookbook Outfit Bundle',
    couponText: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.',
    group: 'percentage',
    type: 'percentage',
    value: 10,
    minOrderValue: 1500,
    maxOrderValue: null,
    maxDiscount: 3500,
    isPublic: true,
    badge: '10% BUNDLE',
    status: 'active'
  },
  {
    code: 'ANBU30',
    couponName: 'Private ANBU 30% Pass',
    couponText: 'Confidential pass (inactive & private until released to public).',
    group: 'percentage',
    type: 'percentage',
    value: 30,
    minOrderValue: 4000,
    maxOrderValue: null,
    maxDiscount: 3000,
    isPublic: false,
    badge: 'INACTIVE',
    status: 'inactive'
  },

  // ── GROUP 2: FLAT DISCOUNTS (₹) ──
  {
    code: 'UCHIHA200',
    couponName: 'Flat ₹200 Welcome Offer',
    couponText: 'Flat ₹200 off instant discount on your streetwear order.',
    group: 'flat',
    type: 'flat',
    value: 200,
    minOrderValue: 1000,
    maxOrderValue: 6000,
    maxDiscount: 200,
    isPublic: true,
    badge: 'FLAT ₹200',
    status: 'active'
  },
  {
    code: 'ITACHI500',
    couponName: 'Flat ₹500 First Order Discount',
    couponText: 'Flat ₹500 instant discount on oversized drop-shoulder fits.',
    group: 'flat',
    type: 'flat',
    value: 500,
    minOrderValue: 3000,
    maxOrderValue: 20000,
    maxDiscount: 500,
    isPublic: true,
    badge: 'FLAT ₹500',
    status: 'active'
  },
  {
    code: 'AKATSUKI1000',
    couponName: 'Flat ₹1,000 Rogue Ninja Vault',
    couponText: 'Flat ₹1,000 deduction on premium streetwear orders.',
    group: 'flat',
    type: 'flat',
    value: 1000,
    minOrderValue: 6000,
    maxOrderValue: null,
    maxDiscount: 1000,
    isPublic: true,
    badge: 'FLAT ₹1,000',
    status: 'active'
  },
  {
    code: 'SUSANOO1500',
    couponName: 'Flat ₹1,500 Divine Armor Requisition',
    couponText: 'Save flat ₹1,500 on all orders above ₹10,000.',
    group: 'flat',
    type: 'flat',
    value: 1500,
    minOrderValue: 10000,
    maxOrderValue: null,
    maxDiscount: 1500,
    isPublic: true,
    badge: 'FLAT ₹1,500',
    status: 'active'
  },
  {
    code: 'VIP100',
    couponName: 'VIP Street Cred ₹100 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (200 Points).',
    group: 'flat',
    type: 'flat',
    value: 100,
    minOrderValue: 999,
    maxOrderValue: null,
    maxDiscount: 100,
    isPublic: true,
    badge: 'VIP ₹100',
    status: 'active'
  },
  {
    code: 'VIP250',
    couponName: 'VIP Street Cred ₹250 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (450 Points).',
    group: 'flat',
    type: 'flat',
    value: 250,
    minOrderValue: 1499,
    maxOrderValue: null,
    maxDiscount: 250,
    isPublic: true,
    badge: 'VIP ₹250',
    status: 'active'
  },
  {
    code: 'VIP500',
    couponName: 'VIP Street Cred ₹500 Reward Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (850 Points).',
    group: 'flat',
    type: 'flat',
    value: 500,
    minOrderValue: 2499,
    maxOrderValue: null,
    maxDiscount: 500,
    isPublic: true,
    badge: 'VIP ₹500',
    status: 'active'
  },
  {
    code: 'VIP1000',
    couponName: 'VIP Street Cred ₹1,000 Obsidian Voucher',
    couponText: 'Redeemed via Street Cred Loyalty Club (1,500 Points).',
    group: 'flat',
    type: 'flat',
    value: 1000,
    minOrderValue: 4999,
    maxOrderValue: null,
    maxDiscount: 1000,
    isPublic: true,
    badge: 'VIP ₹1,000',
    status: 'active'
  },
  {
    code: 'SECRET300',
    couponName: 'Classified ANBU Operative Seal',
    couponText: 'Covert seal (inactive & private until released to public).',
    group: 'flat',
    type: 'flat',
    value: 300,
    minOrderValue: 1800,
    maxOrderValue: null,
    maxDiscount: 300,
    isPublic: false,
    badge: 'INACTIVE',
    status: 'inactive'
  },
  {
    code: 'STREETCASH-499-FPGVGG',
    couponName: '₹499 The Street Cash VIP Voucher',
    couponText: 'Exclusive VIP Loyalty Reward: ₹499 Flat Discount. One-time use only.',
    group: 'flat',
    type: 'flat',
    value: 499,
    discountInr: 499,
    minOrderValue: 0,
    maxOrderValue: null,
    maxDiscount: 499,
    isPublic: true,
    isOneTimeUse: true,
    isRedeemed: true,
    usageLimit: 1,
    userPhone: '9876543210',
    redeemedAt: '2026-11-01T03:46:49.892Z',
    redeemedByOrder: 'UCHIHA-55413',
    badge: 'FLAT ₹499 OFF',
    status: 'used'
  },
  {
    code: 'STREETCASH-499-8O4FCJ',
    couponName: '₹499 The Street Cash VIP Voucher',
    couponText: 'Exclusive VIP Loyalty Reward: ₹499 Flat Discount. One-time use only.',
    group: 'flat',
    type: 'flat',
    value: 499,
    discountInr: 499,
    minOrderValue: 0,
    maxOrderValue: null,
    maxDiscount: 499,
    isPublic: true,
    isOneTimeUse: true,
    isRedeemed: false,
    usageLimit: 1,
    userPhone: '9876543210',
    redeemedAt: null,
    redeemedByOrder: null,
    badge: 'FLAT ₹499 OFF',
    status: 'active'
  }
];

async function run() {
  await connectMongoDb();
  const col = await getCollection('coupons');
  if (!col) {
    console.error('Coupons collection not available');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const enrichedCoupons = [];

  for (const c of UPDATED_COUPONS) {
    const min = Number(c.minOrderValue) || 0;
    const max = c.maxOrderValue ? Number(c.maxOrderValue) : null;
    const subText = formatCouponSubText(min, max);

    const doc = {
      ...c,
      minOrderValue: min,
      maxOrderValue: max,
      couponSubText: subText,
      title: c.couponName,
      desc: c.couponText,
      subText: subText,
      source: 'mongodb',
      updatedAt: nowIso
    };

    await col.updateOne({ code: c.code }, { $set: doc }, { upsert: true });
    enrichedCoupons.push(doc);
    console.log(`Updated in MongoDB: [${doc.group.toUpperCase()}] ${doc.code} -> "${doc.couponName}" | SubText: "${doc.couponSubText}"`);
  }

  // Update local coupons_cache.json
  fs.writeFileSync(CACHE_FILE, JSON.stringify(enrichedCoupons, null, 2), 'utf8');
  console.log(`Saved ${enrichedCoupons.length} coupons to ${CACHE_FILE}`);

  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
