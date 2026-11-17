/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE STREET CO — ZOHO INVENTORY INTEGRATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Official Zoho Inventory REST API v1 Client
 * - Automated OAuth 2.0 Access Token Refresh
 * - Real-Time Product Catalog & Stock Synchronization
 * - Direct Sales Order Push upon Storefront Checkout
 * - Automatic Customer Contact Creation in Zoho CRM / Inventory
 * - Graceful Fallback & In-Memory Cache with Zero Store Downtime
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local persistence file for Zoho tokens and cached inventory
const ZOHO_CACHE_FILE = path.join(__dirname, 'zoho_inventory_cache.json');

// Configuration from Environment Variables (or defaults)
export const config = {
  clientId: process.env.ZOHO_INVENTORY_CLIENT_ID || process.env.ZOHO_CLIENT_ID || '1000.UZX14OW3RS263F9HO71UTABZ83BEUK',
  clientSecret: process.env.ZOHO_INVENTORY_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET || '89c5bfa5bb94d3b6a6b956e030753116ed3f765095',
  refreshToken: process.env.ZOHO_INVENTORY_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN || '1000.be2b654a1e1c745bf85384b670224252.43b26bde60e360a5a7a083f98fe01c7e',
  orgId: process.env.ZOHO_INVENTORY_ORG_ID || process.env.ZOHO_ORG_ID || '60090378434',
  // Domain can be 'inventory.zoho.in' for India, 'inventory.zoho.com' for US/Global, 'inventory.zoho.eu'
  domain: process.env.ZOHO_INVENTORY_DOMAIN || 'inventory.zoho.in',
  accountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN || 'accounts.zoho.in',
  // Indian GST Billing Settings
  sellerGstin: process.env.ZOHO_SELLER_GSTIN || '19AAACT0000A1Z5',
  businessName: process.env.ZOHO_BUSINESS_NAME || 'THE STREET CO APPAREL PVT LTD',
  businessAddress: process.env.ZOHO_BUSINESS_ADDRESS || 'Plot 42, Salt Lake Sector V, Kolkata, West Bengal - 700091',
  businessState: process.env.ZOHO_BUSINESS_STATE || 'West Bengal',
  businessStateCode: process.env.ZOHO_BUSINESS_STATE_CODE || '19',
  defaultHsnCode: process.env.ZOHO_DEFAULT_HSN || '6109', // HSN 6109 = Streetwear & T-shirts
  defaultGstRate: Number(process.env.ZOHO_DEFAULT_GST_RATE || 12), // 12% standard apparel
  autoGenerateInvoice: true,
  // Custom Zoho Indian GST Invoice Template: "The Street Co"
  invoiceTemplateId: process.env.ZOHO_INVOICE_TEMPLATE_ID || '4226403000000039050'
};

// Indian GST State Codes (Place of Supply)
export const GST_STATE_CODES = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '37',
  'KARNATAKA': '29',
  'GOA': '30',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'TELANGANA': '36'
};

// In-Memory Token & State Store
export let tokenState = {
  accessToken: '',
  expiresAt: 0,
  lastSync: null,
  cachedItems: [],
  cachedInvoices: [],
  syncStatus: 'uninitialized',
  lastError: null
};

// Load cached state if exists
try {
  const candidateCachePaths = [
    ZOHO_CACHE_FILE,
    path.join(process.cwd(), 'zoho_inventory_cache.json'),
    path.join(process.cwd(), 'app', 'applet', 'zoho_inventory_cache.json')
  ];
  let foundPath = candidateCachePaths.find(p => fs.existsSync(p));
  if (foundPath) {
    const raw = fs.readFileSync(foundPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.cachedItems) tokenState.cachedItems = parsed.cachedItems;
    if (parsed.cachedInvoices) tokenState.cachedInvoices = parsed.cachedInvoices;
    if (parsed.lastSync) tokenState.lastSync = parsed.lastSync;
    if (parsed.accessToken && parsed.expiresAt > Date.now()) {
      tokenState.accessToken = parsed.accessToken;
      tokenState.expiresAt = parsed.expiresAt;
    }
    if (parsed.refreshToken) config.refreshToken = parsed.refreshToken;
    if (parsed.clientId) config.clientId = parsed.clientId;
    if (parsed.clientSecret) config.clientSecret = parsed.clientSecret;
    if (parsed.orgId) config.orgId = '60090378434';
    if (parsed.domain) config.domain = parsed.domain;
    if (parsed.sellerGstin) config.sellerGstin = parsed.sellerGstin;
    if (parsed.businessName) config.businessName = parsed.businessName;
    if (parsed.businessAddress) config.businessAddress = parsed.businessAddress;
    if (parsed.businessState) config.businessState = parsed.businessState;
    if (parsed.businessStateCode) config.businessStateCode = parsed.businessStateCode;
    if (parsed.defaultHsnCode) config.defaultHsnCode = parsed.defaultHsnCode;
    if (parsed.defaultGstRate) config.defaultGstRate = Number(parsed.defaultGstRate);
  }
} catch (_) {}

function saveCache() {
  try {
    fs.writeFileSync(
      ZOHO_CACHE_FILE,
      JSON.stringify(
        {
          cachedItems: tokenState.cachedItems,
          cachedInvoices: tokenState.cachedInvoices,
          lastSync: tokenState.lastSync,
          accessToken: tokenState.accessToken,
          expiresAt: tokenState.expiresAt,
          refreshToken: config.refreshToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          orgId: config.orgId,
          domain: config.domain,
          sellerGstin: config.sellerGstin,
          businessName: config.businessName,
          businessAddress: config.businessAddress,
          businessState: config.businessState,
          businessStateCode: config.businessStateCode,
          defaultHsnCode: config.defaultHsnCode,
          defaultGstRate: config.defaultGstRate
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (_) {}
}

export function getIstDateString(dateInput = Date.now()) {
  try {
    return new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch (_) {
    return new Date(dateInput).toISOString().slice(0, 10);
  }
}

export function getApiBaseUrl() {
  const d = (config.domain || 'inventory.zoho.in').toLowerCase();
  if (d.includes('.in')) return 'https://www.zohoapis.in/inventory/v1';
  if (d.includes('.eu')) return 'https://www.zohoapis.eu/inventory/v1';
  if (d.includes('.com.au')) return 'https://www.zohoapis.com.au/inventory/v1';
  return 'https://www.zohoapis.com/inventory/v1';
}

export async function listOrganizations() {
  if (!isZohoConfigured()) return [];
  try {
    const token = await getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/organizations`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.code === 0 && Array.isArray(data.organizations)) {
      return data.organizations.map(o => ({
        organization_id: o.organization_id,
        name: (o.name || '').trim(),
        plan_name: o.plan_name || '',
        is_active: String(o.organization_id) === String(config.orgId)
      }));
    }
  } catch (err) {
    console.warn('[Zoho listOrganizations Notice]', err.message);
  }
  return [];
}

/**
 * Update Zoho Inventory configuration dynamically (from environment or admin UI)
 */
export function updateZohoConfig(newConfig) {
  if (newConfig.clientId) config.clientId = String(newConfig.clientId).trim();
  if (newConfig.clientSecret) config.clientSecret = String(newConfig.clientSecret).trim();
  if (newConfig.refreshToken) config.refreshToken = String(newConfig.refreshToken).trim();
  if (newConfig.orgId) config.orgId = String(newConfig.orgId).trim();
  if (newConfig.domain) config.domain = String(newConfig.domain).trim();
  if (newConfig.accountsDomain) config.accountsDomain = String(newConfig.accountsDomain).trim();
  if (newConfig.sellerGstin !== undefined) config.sellerGstin = String(newConfig.sellerGstin).trim();
  if (newConfig.businessName !== undefined) config.businessName = String(newConfig.businessName).trim();
  if (newConfig.businessAddress !== undefined) config.businessAddress = String(newConfig.businessAddress).trim();
  if (newConfig.businessState !== undefined) config.businessState = String(newConfig.businessState).trim();
  if (newConfig.businessStateCode !== undefined) config.businessStateCode = String(newConfig.businessStateCode).trim();
  if (newConfig.defaultHsnCode !== undefined) config.defaultHsnCode = String(newConfig.defaultHsnCode).trim();
  if (newConfig.defaultGstRate !== undefined) config.defaultGstRate = Number(newConfig.defaultGstRate) || 12;
  if (newConfig.autoGenerateInvoice !== undefined) config.autoGenerateInvoice = Boolean(newConfig.autoGenerateInvoice);
  tokenState.accessToken = '';
  tokenState.expiresAt = 0;
  tokenState.syncStatus = 'configured';
  tokenState.lastError = null;
  saveCache();
}

/**
 * Exchange temporary authorization code from Self Client for permanent Refresh Token
 */
export async function exchangeCodeForRefreshToken({ code, clientId, clientSecret, accountsDomain }) {
  const domain = accountsDomain || config.accountsDomain;
  const cId = (clientId || config.clientId).trim();
  const cSec = (clientSecret || config.clientSecret).trim();
  const tokenUrl = `https://${domain}/oauth/v2/token`;

  const params = new URLSearchParams({
    code: code.trim(),
    client_id: cId,
    client_secret: cSec,
    grant_type: 'authorization_code'
  });

  const res = await fetch(`${tokenUrl}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const err = data.error_description || data.error || `HTTP ${res.status}`;
    tokenState.lastError = err;
    throw new Error(err);
  }

  if (data.refresh_token) {
    config.refreshToken = data.refresh_token;
    if (clientId) config.clientId = cId;
    if (clientSecret) config.clientSecret = cSec;
    tokenState.accessToken = data.access_token;
    tokenState.expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
    tokenState.syncStatus = 'connected';
    tokenState.lastError = null;
    saveCache();

    console.log('[Zoho Inventory] Successfully generated and stored permanent Refresh Token!');
    return {
      success: true,
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      message: 'Permanent Refresh Token received and saved successfully!'
    };
  } else {
    throw new Error('Zoho did not return a refresh_token. The code may have expired or already been used. Please generate a new code.');
  }
}

/**
 * Check if required Zoho Inventory credentials are fully configured
 */
export function isZohoConfigured() {
  return Boolean(config.clientId && config.clientSecret && config.refreshToken && config.orgId);
}

/**
 * Retrieve a valid Zoho Inventory OAuth Access Token (refreshes automatically if expired)
 */
export async function getAccessToken() {
  // If token is still valid with at least 2 minutes cushion, return it
  if (tokenState.accessToken && tokenState.expiresAt > Date.now() + 120000) {
    return tokenState.accessToken;
  }

  if (!isZohoConfigured()) {
    throw new Error('Zoho Inventory credentials (clientId, clientSecret, refreshToken, orgId) are incomplete.');
  }

  const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
  const params = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token'
  });

  try {
    const res = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error_description || data.error || `HTTP ${res.status}`;
      tokenState.lastError = `Token Refresh Failed: ${errMsg}`;
      tokenState.syncStatus = 'token_error';
      throw new Error(`[Zoho Inventory OAuth] ${errMsg}`);
    }

    tokenState.accessToken = data.access_token;
    // expires_in is in seconds (usually 3600)
    tokenState.expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
    tokenState.syncStatus = 'connected';
    tokenState.lastError = null;
    saveCache();

    console.log('[Zoho Inventory] Successfully generated OAuth access token. Valid for 1 hour.');
    return tokenState.accessToken;
  } catch (err) {
    tokenState.lastError = err.message;
    console.error('[Zoho Inventory OAuth Error]', err.message);
    throw err;
  }
}

/**
 * Fetch all items from Zoho Inventory
 * Maps Zoho items into the storefront relic format
 */
export async function fetchZohoItems(force = false) {
  if (!isZohoConfigured()) {
    return {
      success: false,
      source: 'offline',
      items: tokenState.cachedItems || [],
      message: 'Zoho Inventory credentials pending. Serving cached catalog.'
    };
  }

  // Serve from cache unless forced or cache is older than 15 minutes
  const lastSyncMs = tokenState.lastSync ? new Date(tokenState.lastSync).getTime() : 0;
  if (!force && Array.isArray(tokenState.cachedItems) && tokenState.cachedItems.length > 0 && (Date.now() - lastSyncMs < 15 * 60 * 1000)) {
    return {
      success: true,
      source: 'zoho_cache',
      count: tokenState.cachedItems.length,
      items: tokenState.cachedItems,
      lastSync: tokenState.lastSync
    };
  }

  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/items?organization_id=${config.orgId}&status=active`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok || data.code !== 0) {
      throw new Error(data.message || `Zoho API returned HTTP ${res.status}`);
    }

    const rawList = data.items || [];
    
    // Fetch detailed item representation for each active item to get full documents / gallery photos
    const detailedItems = await Promise.all(rawList.map(async (it) => {
      try {
        const dUrl = `${getApiBaseUrl()}/items/${it.item_id}?organization_id=${config.orgId}`;
        const dRes = await fetch(dUrl, {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (dRes.ok) {
          const dData = await dRes.json();
          if (dData && dData.item) {
            return dData.item;
          }
        }
      } catch (e) {
        console.warn(`[Zoho Inventory] Detail fetch notice for ${it.item_id}:`, e.message);
      }
      return it;
    }));

    const mappedItems = detailedItems.map((item, idx) => {
      // Stock parsing
      const stock = typeof item.actual_available_stock === 'number'
        ? item.actual_available_stock
        : (typeof item.stock_on_hand === 'number' ? item.stock_on_hand : (typeof item.available_stock === 'number' ? item.available_stock : 0));

      const itemRate = Number(item.rate || item.selling_price || 0);
      const purchaseRate = Number(item.purchase_rate || 0);
      const hasRealMrp = purchaseRate > itemRate;
      const origPrice = hasRealMrp ? purchaseRate : null;

      const fullDesc = (item.description && item.description.trim())
        || (item.purchase_description && item.purchase_description.trim())
        || '';

      // Collect all real uploaded photos/documents
      let docImages = [];
      if (Array.isArray(item.documents) && item.documents.length > 0) {
        docImages = item.documents
          .filter(d => d && d.document_id && (!d.file_type || /jpg|jpeg|png|webp|gif/i.test(d.file_type)))
          .map(d => `/api/zoho-inventory/documents/${d.document_id}`);
      }

      // If item has a primary image_document_id not in docImages, prepend it
      const primaryDocId = item.image_document_id;
      if (primaryDocId && !docImages.some(img => img.includes(primaryDocId))) {
        docImages.unshift(`/api/zoho-inventory/documents/${primaryDocId}`);
      }

      // Fallback to item image endpoint if documents empty
      if (docImages.length === 0 && item.image_document_id) {
        docImages.push(`/api/zoho-inventory/items/${item.item_id}/image`);
      }

      const itemName = item.name || item.item_name || 'Zoho Item';
      const itemSku = (item.sku || '').trim();
      const nameLower = `${itemName} ${itemSku}`.toLowerCase();

      // Provide accurate SKU/type fallback images when no image is uploaded in Zoho Inventory yet
      if (docImages.length === 0) {
        if (nameLower.includes('holster')) {
          docImages = [
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'
          ];
        } else if (nameLower.includes('jogger') || nameLower.includes('cargo') || nameLower.includes('ts-str-004')) {
          docImages = [
            'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&q=80',
            'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80'
          ];
        } else {
          docImages = ['/product-minato.jpg'];
        }
      }

      // Infer clean category when category_name is blank in Zoho Inventory
      let resolvedCategoryName = (item.category_name || item.brand || '').trim();
      if (!resolvedCategoryName || resolvedCategoryName.toLowerCase() === 't-shirt') {
        if (nameLower.includes('jogger') || nameLower.includes('cargo') || nameLower.includes('pant')) {
          resolvedCategoryName = 'Cargo Pants & Joggers';
        } else if (nameLower.includes('holster') || nameLower.includes('ring') || nameLower.includes('hat') || nameLower.includes('necklace')) {
          resolvedCategoryName = 'Accessories & Jewelry';
        } else if (nameLower.includes('hoodie') || nameLower.includes('sweatshirt')) {
          resolvedCategoryName = 'Hoodies & Sweatshirts';
        } else if (nameLower.includes('jacket') || nameLower.includes('bomber') || nameLower.includes('cloak')) {
          resolvedCategoryName = 'Jackets & Outerwear';
        } else if (!resolvedCategoryName) {
          resolvedCategoryName = 'Oversized T-Shirts';
        }
      }

      // Avoid using group_name when Zoho sets group_name identical to the full item title
      const rawGroup = (item.group_name || item.cf_collection || '').trim();
      const validGroup = (rawGroup && rawGroup.toLowerCase() !== itemName.toLowerCase()) ? rawGroup : '';
      let resolvedCollectionName = validGroup;
      if (!resolvedCollectionName) {
        if (nameLower.includes('minato') || nameLower.includes('hokage')) {
          resolvedCollectionName = 'Minato Namikaze';
        } else if (nameLower.includes('holster') || nameLower.includes('akatsuki')) {
          resolvedCollectionName = 'Akatsuki Shadows';
        } else if (nameLower.includes('tokyo') || nameLower.includes('ts-str') || nameLower.includes('cargo')) {
          resolvedCollectionName = 'Street Core';
        } else if (nameLower.includes('uchiha') || nameLower.includes('sharingan') || nameLower.includes('susanoo')) {
          resolvedCollectionName = 'Uchiha Clan';
        } else {
          resolvedCollectionName = 'Official Collection';
        }
      }

      return {
        id: itemSku || item.item_id || `zoho-item-${idx + 1}`,
        zoho_item_id: item.item_id,
        sku: itemSku,
        title: itemName,
        name: itemName,
        price: itemRate,
        priceInr: itemRate,
        originalPrice: origPrice,
        originalMrp: origPrice,
        hasDiscount: hasRealMrp,
        discountPercent: hasRealMrp ? Math.round(((purchaseRate - itemRate) / purchaseRate) * 100) : 0,
        unit: item.unit || 'pcs',
        stock: Math.max(0, stock),
        inStock: stock > 0,
        category: resolvedCategoryName.toLowerCase(),
        category_name: resolvedCategoryName,
        collection: resolvedCollectionName.toLowerCase(),
        collectionName: resolvedCollectionName,
        description: fullDesc,
        purchase_description: item.purchase_description || '',
        images: docImages,
        imageUrl: docImages[0] || ''
      };
    });

    if (mappedItems.length > 0) {
      tokenState.cachedItems = mappedItems;
    }
    tokenState.lastSync = new Date().toISOString();
    tokenState.syncStatus = 'synced';
    tokenState.lastError = null;
    saveCache();

    const activeItems = mappedItems.length > 0 ? mappedItems : (tokenState.cachedItems || []);
    console.log(`[Zoho Inventory] Successfully fetched ${activeItems.length} active items with full photo galleries from organization ${config.orgId}`);
    return {
      success: true,
      source: 'zoho_inventory',
      count: activeItems.length,
      items: activeItems,
      lastSync: tokenState.lastSync
    };
  } catch (err) {
    tokenState.lastError = err.message;
    console.warn('[Zoho Inventory Fetch Warning]', err.message);
    return {
      success: false,
      source: 'cache_fallback',
      items: tokenState.cachedItems || [],
      error: err.message
    };
  }
}

/**
 * Fetch all live Categories & Collections directly from Zoho Inventory
 */
export async function fetchZohoCategories() {
  if (!isZohoConfigured()) {
    return {
      success: false,
      categories: [{ id: 't-shirt', name: 'T-Shirt' }],
      collections: [{ id: 'minato', name: 'Minato' }]
    };
  }

  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/categories?organization_id=${config.orgId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok || data.code !== 0) {
      throw new Error(data.message || 'Failed to fetch categories');
    }

    const all = Array.isArray(data.categories) ? data.categories : [];
    // Filter out root placeholder
    const valid = all.filter(c => c && c.name && c.name.toUpperCase() !== 'ROOT');
    
    // Top-level categories (e.g. T-Shirt)
    const topCategories = valid.filter(c => Number(c.depth) === 0 || c.parent_category_id === '-1');
    // Sub-categories / Collections (e.g. Minato)
    const subCollections = valid.filter(c => Number(c.depth) > 0 || (c.parent_category_id && c.parent_category_id !== '-1'));

    return {
      success: true,
      categories: topCategories.map(c => ({ id: c.category_id, name: c.name, url: c.url })),
      collections: subCollections.map(c => ({ id: c.category_id, parentId: c.parent_category_id, name: c.name, url: c.url }))
    };
  } catch (err) {
    console.warn('[Zoho Categories Fetch Notice]', err.message);
    return {
      success: false,
      categories: [{ id: 't-shirt', name: 'T-Shirt' }],
      collections: [{ id: 'minato', name: 'Minato' }]
    };
  }
}

function buildContactPersonPayload(fullName, email, cleanPhone) {
  const parts = String(fullName || 'Storefront Customer').trim().split(/\s+/);
  const firstName = parts[0] || 'Customer';
  const lastName = parts.slice(1).join(' ') || '';
  const person = {
    first_name: firstName,
    last_name: lastName,
    is_primary_contact: true
  };
  if (email) person.email = email;
  if (cleanPhone) {
    person.phone = cleanPhone;
    person.mobile = cleanPhone;
  }
  return { firstName, lastName, person };
}

async function ensureZohoContactUpdated(contactId, details, token) {
  if (!contactId) return contactId;
  try {
    const base = getApiBaseUrl();
    const orgId = config.orgId;
    const getRes = await fetch(`${base}/contacts/${contactId}?organization_id=${orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const getData = await getRes.json();
    const existing = getData?.contact;
    if (!getRes.ok || !existing) return contactId;

    const desiredEmail = String(details.email || '').trim().toLowerCase();
    const desiredPhone = String(details.phone || '').replace(/[^\d+]/g, '').trim();
    const desiredPhone10 = desiredPhone.replace(/\D/g, '').slice(-10);
    const fullName = String(details.fullName || existing.contact_name || 'Storefront Customer').trim();
    const { firstName, lastName, person: desiredPerson } = buildContactPersonPayload(fullName, desiredEmail, desiredPhone);

    const existingEmail = String(existing.email || '').trim().toLowerCase();
    const existingPhone10 = String(existing.phone || '').replace(/\D/g, '').slice(-10);
    const existingMobile10 = String(existing.mobile || '').replace(/\D/g, '').slice(-10);
    const persons = Array.isArray(existing.contact_persons) ? existing.contact_persons : [];
    const primaryPerson = persons.find(p => p && p.is_primary_contact) || persons[0] || null;
    const primaryEmail = String(primaryPerson?.email || '').trim().toLowerCase();
    const primaryPhone10 = String(primaryPerson?.phone || '').replace(/\D/g, '').slice(-10);
    const primaryMobile10 = String(primaryPerson?.mobile || '').replace(/\D/g, '').slice(-10);

    const needsEmailUpdate = Boolean(desiredEmail && (existingEmail !== desiredEmail || primaryEmail !== desiredEmail));
    const needsPhoneUpdate = Boolean(
      desiredPhone10 &&
      (existingPhone10 !== desiredPhone10 || existingMobile10 !== desiredPhone10 ||
       primaryPhone10 !== desiredPhone10 || primaryMobile10 !== desiredPhone10)
    );
    const needsPersonCreated = persons.length === 0 && Boolean(desiredEmail || desiredPhone);

    if (!needsEmailUpdate && !needsPhoneUpdate && !needsPersonCreated) {
      return contactId;
    }

    const updatePayload = {
      contact_name: existing.contact_name || fullName,
      first_name: existing.first_name || firstName,
      last_name: existing.last_name || lastName
    };
    if (desiredEmail) updatePayload.email = desiredEmail;
    else if (existingEmail) updatePayload.email = existingEmail;

    if (desiredPhone) {
      updatePayload.phone = desiredPhone;
      updatePayload.mobile = desiredPhone;
    }

    if (persons.length > 0) {
      updatePayload.contact_persons = persons.map((p, idx) => {
        if (idx === 0 || p.is_primary_contact) {
          return {
            contact_person_id: p.contact_person_id,
            first_name: p.first_name || firstName,
            last_name: p.last_name || lastName,
            email: desiredEmail || p.email || '',
            phone: desiredPhone || p.phone || '',
            mobile: desiredPhone || p.mobile || '',
            is_primary_contact: true
          };
        }
        return p;
      });
    } else {
      updatePayload.contact_persons = [desiredPerson];
    }

    const putRes = await fetch(`${base}/contacts/${contactId}?organization_id=${orgId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    const putData = await putRes.json();

    // If contact still has 0 contact_persons after PUT, explicitly attach a primary contact person
    const updatedPersons = putData?.contact?.contact_persons;
    if (needsPersonCreated && (!Array.isArray(updatedPersons) || updatedPersons.length === 0)) {
      await fetch(`${base}/contacts/contactpersons?organization_id=${orgId}`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact_id: contactId,
          ...desiredPerson
        })
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Zoho Inventory Contact Sync Notice]', err.message);
  }
  return contactId;
}

/**
 * Find or create customer contact in Zoho Inventory (always syncs user's phone & email)
 */
export async function findOrCreateContact(shippingInfo) {
  if (!isZohoConfigured()) return null;

  try {
    const token = await getAccessToken();
    const base = getApiBaseUrl();
    const orgId = config.orgId;
    const email = (shippingInfo.email || '').trim().toLowerCase();
    const fullName = (shippingInfo.fullName || shippingInfo.name || 'Storefront Customer').trim();
    const rawPhone = (shippingInfo.phone || '').trim();
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const cleanPhone10 = cleanPhone.replace(/\D/g, '').slice(-10);

    // 1. Search existing customer contacts by email, phone, or exact name
    if (email) {
      try {
        const searchUrl = `${base}/contacts?organization_id=${orgId}&email=${encodeURIComponent(email)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` }
        });
        const searchData = await searchRes.json();
        if (searchRes.ok && Array.isArray(searchData.contacts) && searchData.contacts.length > 0) {
          return await ensureZohoContactUpdated(searchData.contacts[0].contact_id, { fullName, email, phone: cleanPhone }, token);
        }
      } catch (_) {}
    }

    if (cleanPhone10.length >= 10) {
      try {
        const listRes = await fetch(`${base}/contacts?organization_id=${orgId}&contact_type=customer&per_page=200`, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` }
        });
        const listData = await listRes.json();
        if (listRes.ok && Array.isArray(listData.contacts)) {
          const phoneMatch = listData.contacts.find(c => {
            const cPhone = String(c.phone || '').replace(/\D/g, '').slice(-10);
            const cMobile = String(c.mobile || '').replace(/\D/g, '').slice(-10);
            const cEmail = String(c.email || '').trim().toLowerCase();
            return (cPhone && cPhone === cleanPhone10) ||
              (cMobile && cMobile === cleanPhone10) ||
              (email && cEmail && cEmail === email);
          });
          if (phoneMatch && phoneMatch.contact_id) {
            return await ensureZohoContactUpdated(phoneMatch.contact_id, { fullName, email, phone: cleanPhone }, token);
          }

          const exactNameMatch = listData.contacts.find(c =>
            String(c.contact_name || '').trim().toLowerCase() === fullName.toLowerCase()
          );
          if (exactNameMatch && exactNameMatch.contact_id) {
            return await ensureZohoContactUpdated(exactNameMatch.contact_id, { fullName, email, phone: cleanPhone }, token);
          }
        }
      } catch (_) {}
    }

    // 2. Create new contact with user phone & email
    const createUrl = `${base}/contacts?organization_id=${orgId}`;
    const resolvedPhone = cleanPhone || '';
    const { firstName, lastName, person } = buildContactPersonPayload(fullName, email, resolvedPhone);
    const payload = {
      contact_name: fullName,
      first_name: firstName,
      last_name: lastName,
      company_name: shippingInfo.isB2B && shippingInfo.gstin ? (shippingInfo.companyName || 'Business Client') : '',
      contact_type: 'customer',
      customer_sub_type: 'individual',
      ...(email ? { email } : {}),
      ...(resolvedPhone ? { phone: resolvedPhone, mobile: resolvedPhone } : {}),
      contact_persons: [person],
      shipping_address: {
        attention: fullName,
        address: String(shippingInfo.address || shippingInfo.fullAddress || '').slice(0, 99),
        city: shippingInfo.city || '',
        state: shippingInfo.state || '',
        zip: shippingInfo.pincode || '',
        country: 'India',
        ...(resolvedPhone ? { phone: resolvedPhone } : {})
      },
      billing_address: {
        attention: fullName,
        address: String(shippingInfo.address || shippingInfo.fullAddress || '').slice(0, 99),
        city: shippingInfo.city || '',
        state: shippingInfo.state || '',
        zip: shippingInfo.pincode || '',
        country: 'India',
        ...(resolvedPhone ? { phone: resolvedPhone } : {})
      }
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const createData = await createRes.json();
    if (createRes.ok && createData.contact && createData.contact.contact_id) {
      console.log(`[Zoho Inventory] Created new contact ID ${createData.contact.contact_id} for ${fullName}`);
      return await ensureZohoContactUpdated(createData.contact.contact_id, { fullName, email, phone: resolvedPhone }, token);
    }

    // If contact already exists or creation failed, search by name
    try {
      const searchByNameUrl = `${base}/contacts?organization_id=${orgId}&search_text=${encodeURIComponent(fullName)}`;
      const searchByNameRes = await fetch(searchByNameUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      const searchByNameData = await searchByNameRes.json();
      if (searchByNameData.contacts && searchByNameData.contacts.length > 0) {
        return await ensureZohoContactUpdated(searchByNameData.contacts[0].contact_id, { fullName, email, phone: resolvedPhone }, token);
      }
    } catch (_) {}

    // 3. Fallback: Fetch first available customer contact in Zoho
    const fallbackRes = await fetch(`${base}/contacts?organization_id=${orgId}&contact_type=customer`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const fallbackData = await fallbackRes.json();
    if (fallbackData.contacts && fallbackData.contacts.length > 0) {
      return fallbackData.contacts[0].contact_id;
    }

    return null;
  } catch (err) {
    console.warn('[Zoho Inventory Contact Warning]', err.message);
    return null;
  }
}

/**
 * Resolve or create a Zoho item by SKU/name in the active organization
 */
const orgItemsMapCache = new Map();
export async function resolveOrCreateOrgItem(item, token) {
  const orgKey = `${config.orgId}:${(item.sku || item.id || item.name || 'TS-MIN-001').toUpperCase()}`;
  if (orgItemsMapCache.has(orgKey)) return orgItemsMapCache.get(orgKey);

  try {
    const sku = String(item.sku || item.id || 'TS-MIN-001').trim();
    const searchRes = await fetch(`${getApiBaseUrl()}/items?organization_id=${config.orgId}&sku=${encodeURIComponent(sku)}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchRes.ok && Array.isArray(searchData.items) && searchData.items.length > 0) {
      const foundId = searchData.items[0].item_id;
      orgItemsMapCache.set(orgKey, foundId);
      return foundId;
    }

    // Create item in active org if it doesn't exist yet
    const createRes = await fetch(`${getApiBaseUrl()}/items?organization_id=${config.orgId}`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: (item.title || item.name || 'Fourth Hokage Minato Inspired Oversized T-Shirt').slice(0, 99),
        sku: sku,
        rate: Number(item.priceInr ?? item.price ?? 1599),
        purchase_rate: Number(item.originalMrp ?? item.originalPrice ?? 1799),
        unit: 'pcs',
        product_type: 'goods',
        item_type: 'inventory',
        initial_stock: 100,
        initial_stock_rate: 800,
        description: String(item.desc || item.description || 'Premium Heavyweight Oversized Streetwear Apparel').slice(0, 1900)
      })
    });
    const createData = await createRes.json();
    if (createRes.ok && createData.item && createData.item.item_id) {
      orgItemsMapCache.set(orgKey, createData.item.item_id);
      return createData.item.item_id;
    }
  } catch (_) {}
  return null;
}

/**
 * Create a Sales Order directly in Zoho Inventory when a customer checks out
 */
export async function createSalesOrder(orderRecord) {
  if (!isZohoConfigured()) {
    return {
      success: false,
      message: 'Zoho Inventory is not configured; order recorded locally.'
    };
  }

  try {
    const token = await getAccessToken();

    // 1. Resolve customer contact info (prefer user's account phone & email for Zoho Customer Contact)
    const contactObj = orderRecord.shippingAddress || orderRecord.shipping || orderRecord.contactDetails || orderRecord.user || orderRecord.customer || {};
    const accountPhone = String(orderRecord.accountPhone || orderRecord.userAccountPhone || '').trim();
    const accountEmail = String(orderRecord.accountEmail || orderRecord.userAccountEmail || '').trim();
    const mergedShipping = {
      fullName: orderRecord.contactDetails?.fullName || contactObj.fullName || contactObj.name || 'Storefront Customer',
      phone: accountPhone || orderRecord.contactDetails?.phone || contactObj.phone || '',
      email: accountEmail || orderRecord.contactDetails?.email || contactObj.email || '',
      address: contactObj.address || contactObj.fullAddress || `${contactObj.houseFlat || ''}, ${contactObj.streetRoad || ''}`,
      city: contactObj.city || '',
      state: contactObj.state || '',
      pincode: contactObj.pincode || '',
      isB2B: Boolean(orderRecord.isB2B || contactObj.isB2B),
      gstin: orderRecord.gstin || contactObj.gstin || ''
    };

    const contactId = await findOrCreateContact(mergedShipping);
    if (!contactId) {
      return {
        success: false,
        error: 'Failed to find or create customer contact in Zoho Inventory.'
      };
    }

    // Check if a Sales Order for this reference_number already exists in Zoho to avoid duplicates
    const cleanCode = String(orderRecord.orderCode || orderRecord.orderId || `${Date.now()}`).replace(/^#/, '').trim();
    const existingSo = await findSalesOrderByReference(cleanCode);
    if (existingSo && existingSo.salesorder_id) {
      console.log(`[Zoho Inventory] Found existing Sales Order ${existingSo.salesorder_number} (ID: ${existingSo.salesorder_id}) for ${cleanCode}`);
      if (String(existingSo.status || '').toLowerCase() === 'draft') {
        await confirmSalesOrderInZoho(existingSo.salesorder_id).catch(() => {});
      }
      return {
        success: true,
        existing: true,
        zoho_salesorder_id: existingSo.salesorder_id,
        zoho_salesorder_number: existingSo.salesorder_number,
        total: existingSo.total,
        message: `Already in Zoho Inventory: ${existingSo.salesorder_number}`
      };
    }

    // 2. Prepare line items for Zoho
    const rawItems = orderRecord.items || orderRecord.products || [];
    const lineItems = await Promise.all(rawItems.map(async item => {
      const skuLower = String(item.sku || item.id || '').trim().toLowerCase();
      const titleLower = String(item.title || item.name || '').trim().toLowerCase();
      const cached = (tokenState.cachedItems || []).find(ci =>
        (skuLower && String(ci.sku || '').trim().toLowerCase() === skuLower) ||
        (item.zoho_item_id && ci.zoho_item_id === item.zoho_item_id) ||
        (titleLower && String(ci.name || '').trim().toLowerCase() === titleLower)
      );
      const resolvedOrgItemId = await resolveOrCreateOrgItem(item, token);
      const zohoItemId = resolvedOrgItemId || item.zoho_item_id || (cached && cached.zoho_item_id);
      const rate = Number(item.priceInr ?? item.price ?? item.rate ?? (cached && cached.price) ?? 1599);
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));

      const lineItem = {
        name: item.title || item.name || (cached && cached.name) || 'Streetwear Apparel',
        rate: rate,
        quantity: qty,
        description: `SKU: ${item.sku || 'N/A'}${item.size ? ' | Size: ' + item.size : ''}`
      };
      if (zohoItemId) {
        lineItem.item_id = zohoItemId;
      }
      return lineItem;
    }));

    // Fallback: If lineItems empty, pick first cached item
    if (lineItems.length === 0 && tokenState.cachedItems && tokenState.cachedItems.length > 0) {
      const first = tokenState.cachedItems[0];
      const resolvedId = await resolveOrCreateOrgItem(first, token);
      lineItems.push({
        ...(resolvedId ? { item_id: resolvedId } : {}),
        name: first.name,
        rate: first.price,
        quantity: 1,
        description: `SKU: ${first.sku}`
      });
    }

    // 3. Construct Sales Order Payload (omit salesorder_number so Zoho auto-generates sequential number)
    const orderDateIst = orderRecord.orderDate ? getIstDateString(orderRecord.orderDate) : getIstDateString();
    const shipmentDateIst = getIstDateString((orderRecord.orderDate ? new Date(orderRecord.orderDate).getTime() : Date.now()) + 86400000);
    const salesOrderPayload = {
      customer_id: contactId,
      reference_number: cleanCode,
      date: orderDateIst,
      shipment_date: shipmentDateIst,
      line_items: lineItems,
      shipping_charge: Number(orderRecord.deliveryFeeInr ?? orderRecord.delivery?.cost ?? orderRecord.shippingCost ?? 0),
      discount: Number(orderRecord.discountInr ?? orderRecord.discount ?? 0),
      notes: '',
      terms: 'The Street Co 7-Day Replacement & Return Policy.'
    };

    const url = `${getApiBaseUrl()}/salesorders?organization_id=${config.orgId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(salesOrderPayload)
    });

    const data = await res.json();

    if (!res.ok || data.code !== 0) {
      throw new Error(data.message || `Zoho API returned HTTP ${res.status}`);
    }

    const zohoOrder = data.salesorder || {};
    console.log(`[Zoho Inventory] Successfully created Sales Order: ${zohoOrder.salesorder_number} (ID: ${zohoOrder.salesorder_id}) for ${cleanCode}`);

    // Immediately confirm the Sales Order in Zoho so it appears as Confirmed rather than Draft
    await confirmSalesOrderInZoho(zohoOrder.salesorder_id).catch(() => {});

    return {
      success: true,
      zoho_salesorder_id: zohoOrder.salesorder_id,
      zoho_salesorder_number: zohoOrder.salesorder_number,
      total: zohoOrder.total,
      message: `Created in Zoho Inventory: ${zohoOrder.salesorder_number}`
    };
  } catch (err) {
    console.warn('[Zoho Inventory Sales Order Warning]', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Status overview of the Zoho Inventory integration & GST Billing
 */
export function getStatus() {
  return {
    configured: isZohoConfigured(),
    domain: config.domain,
    orgId: config.orgId ? `${config.orgId.slice(0, 4)}...${config.orgId.slice(-4)}` : 'Not Set',
    clientIdConfigured: Boolean(config.clientId),
    clientSecretConfigured: Boolean(config.clientSecret),
    refreshTokenConfigured: Boolean(config.refreshToken),
    syncStatus: tokenState.syncStatus,
    lastSync: tokenState.lastSync,
    cachedItemsCount: (tokenState.cachedItems || []).length,
    cachedInvoicesCount: (tokenState.cachedInvoices || []).length,
    tokenValid: Boolean(tokenState.accessToken && tokenState.expiresAt > Date.now()),
    tokenExpiresInMinutes: tokenState.expiresAt > Date.now() ? Math.round((tokenState.expiresAt - Date.now()) / 60000) : 0,
    lastError: tokenState.lastError,
    // GST Billing Status
    gstBilling: {
      sellerGstin: config.sellerGstin,
      businessName: config.businessName,
      businessAddress: config.businessAddress,
      businessState: config.businessState,
      businessStateCode: config.businessStateCode,
      defaultHsnCode: config.defaultHsnCode,
      defaultGstRate: config.defaultGstRate,
      autoGenerateInvoice: config.autoGenerateInvoice
    }
  };
}

/**
 * Calculate Indian GST breakdown (CGST+SGST for intra-state, IGST for inter-state)
 */
export function calculateGstBreakdown({ subtotalInr, customerState, isB2B = false, gstin = '', customGstRate = null }) {
  const totalAmount = Number(subtotalInr || 0);
  const gstRate = customGstRate !== null && !isNaN(customGstRate) ? Number(customGstRate) : (config.defaultGstRate || 12);
  
  // Backward calculation: Store prices are GST-inclusive
  const taxableAmount = Math.round((totalAmount / (1 + (gstRate / 100))) * 100) / 100;
  const totalTax = Math.round((totalAmount - taxableAmount) * 100) / 100;

  // State matching
  const normCustomerState = (customerState || '').trim().toUpperCase();
  const normSellerState = (config.businessState || 'West Bengal').trim().toUpperCase();
  
  const isIntraState = normCustomerState === normSellerState || !normCustomerState;
  const customerStateCode = GST_STATE_CODES[normCustomerState] || '19';
  const sellerStateCode = config.businessStateCode || '19';

  let cgstRate = 0, cgstAmount = 0;
  let sgstRate = 0, sgstAmount = 0;
  let igstRate = 0, igstAmount = 0;

  if (isIntraState) {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
  } else {
    igstRate = gstRate;
    igstAmount = totalTax;
  }

  return {
    subtotalInr: totalAmount,
    taxableAmount,
    totalTax,
    gstRate,
    taxType: isIntraState ? 'INTRA_STATE' : 'INTER_STATE',
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    placeOfSupply: customerState || config.businessState,
    placeOfSupplyCode: customerStateCode,
    sellerState: config.businessState,
    sellerStateCode,
    isB2B: Boolean(isB2B && gstin),
    gstin: (gstin || '').trim().toUpperCase(),
    gstTreatment: (isB2B && gstin) ? 'business_gst' : 'consumer'
  };
}

/**
 * Create official GST Tax Invoice in Zoho Inventory
 */
export async function createGstInvoice(orderRecord) {
  if (!orderRecord) throw new Error('Order record required to create GST Invoice');

  const shippingInfo = orderRecord.shippingAddress || orderRecord.shipping || {};
  const customerState = shippingInfo.state || config.businessState;
  const isB2B = Boolean(orderRecord.isB2B || orderRecord.gstin);
  const customerGstin = (orderRecord.gstin || '').trim().toUpperCase();

  const gstBreakdown = calculateGstBreakdown({
    subtotalInr: orderRecord.grandTotalInr || orderRecord.subtotalInr,
    customerState,
    isB2B,
    gstin: customerGstin
  });

  // Make Invoice Number & Reference identical to the order's Reference#
  const orderIdNumber = String(orderRecord.reference_number || orderRecord.orderCode || orderRecord.orderId || `${Date.now()}`).replace(/^#/, '').trim();
  const invoiceNumber = orderIdNumber;
  const invoiceDate = getIstDateString();

  // If Zoho is configured, try creating directly in Zoho
  if (isZohoConfigured()) {
    try {
      const token = await getAccessToken();
      const contactId = await findOrCreateContact(shippingInfo);

      const items = Array.isArray(orderRecord.items) ? orderRecord.items : [];
      const lineItems = await Promise.all(items.map(async item => {
        const resolvedId = await resolveOrCreateOrgItem(item, token);
        const itemId = resolvedId || item.zoho_item_id || item.item_id;

        const lineObj = {
          rate: Number(item.price || item.priceInr || 1599),
          quantity: Number(item.quantity || item.qty || 1)
        };
        if (itemId) {
          lineObj.item_id = itemId;
        } else {
          lineObj.name = item.name || item.title || 'Streetwear Apparel';
        }
        return lineObj;
      }));

      const invoicePayload = {
        customer_id: contactId,
        invoice_number: invoiceNumber,
        reference_number: invoiceNumber,
        template_id: config.invoiceTemplateId || '4226403000000039050',
        date: invoiceDate,
        due_date: invoiceDate,
        line_items: lineItems,
        discount: Number(orderRecord.discountInr || orderRecord.discount || 0),
        notes: '',
        terms: '7-Day Free Size Exchange Policy. Goods once sold are non-refundable except defective transit items.'
      };

      if (orderRecord.zoho_salesorder_id) {
        invoicePayload.salesorder_id = orderRecord.zoho_salesorder_id;
      }

      const url = `${getApiBaseUrl()}/invoices?organization_id=${config.orgId}&ignore_auto_number_generation=true`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoicePayload)
      });

      const data = await res.json();
      if (res.ok && data.code === 0 && data.invoice) {
        const zohoInv = data.invoice;
        console.log(`[Zoho Invoice Created] Invoice #${zohoInv.invoice_number} (ID: ${zohoInv.invoice_id}) saved with template "${zohoInv.template_name || 'The Street Co'}"`);

        // Automatically activate invoice from Draft to Sent so customer portal link is immediately viewable
        try {
          await fetch(`${getApiBaseUrl()}/invoices/${zohoInv.invoice_id}/status/sent?organization_id=${config.orgId}`, {
            method: 'POST',
            headers: { Authorization: `Zoho-oauthtoken ${token}` }
          });
          console.log(`[Zoho Invoice] Successfully activated invoice #${zohoInv.invoice_number} to Sent status.`);
        } catch (statusErr) {
          console.warn('[Zoho Invoice Activation Notice]', statusErr.message);
        }
        let resolvedInvoiceUrl = String(zohoInv.invoice_url || '').trim();
        if (!resolvedInvoiceUrl && zohoInv.invoice_id) {
          try {
            const detailRes = await fetch(`${getApiBaseUrl()}/invoices/${zohoInv.invoice_id}?organization_id=${config.orgId}`, {
              headers: { Authorization: `Zoho-oauthtoken ${token}` }
            });
            const detailData = await detailRes.json();
            resolvedInvoiceUrl = String(detailData?.invoice?.invoice_url || '').trim();
          } catch (_) {}
        }

        const invRecord = {
          success: true,
          source: 'zoho_inventory',
          invoice_id: zohoInv.invoice_id,
          zoho_invoice_id: zohoInv.invoice_id,
          invoice_number: zohoInv.invoice_number || invoiceNumber,
          invoice_url: resolvedInvoiceUrl,
          template_id: zohoInv.template_id || config.invoiceTemplateId,
          template_name: zohoInv.template_name || 'The Street Co',
          date: invoiceDate,
          orderCode: orderRecord.orderCode,
          customerName: shippingInfo.fullName || shippingInfo.name || 'Storefront Customer',
          customerGstin,
          sellerGstin: config.sellerGstin,
          gstBreakdown,
          grandTotalInr: zohoInv.total || orderRecord.grandTotalInr || orderRecord.subtotalInr,
          status: 'issued'
        };
        tokenState.cachedInvoices.unshift(invRecord);
        if (tokenState.cachedInvoices.length > 100) tokenState.cachedInvoices.pop();
        saveCache();
        return invRecord;
      }
    } catch (zohoInvErr) {
      console.warn('[Zoho Invoice Creation Notice]', zohoInvErr.message);
    }
  }

  // Self-contained compliant GST Invoice fallback
  const localInvRecord = {
    success: true,
    source: 'local_compliant',
    invoice_id: `LOCAL-INV-${Date.now()}`,
    invoice_number: invoiceNumber,
    date: invoiceDate,
    orderCode: orderRecord.orderCode,
    customerName: shippingInfo.fullName || shippingInfo.name || 'Storefront Customer',
    customerGstin,
    sellerGstin: config.sellerGstin,
    gstBreakdown,
    grandTotalInr: orderRecord.grandTotalInr || orderRecord.subtotalInr,
    status: 'issued'
  };
  tokenState.cachedInvoices.unshift(localInvRecord);
  if (tokenState.cachedInvoices.length > 100) tokenState.cachedInvoices.pop();
  saveCache();
  return localInvRecord;
}

/**
 * Confirm a Sales Order in Zoho Inventory
 */
export async function confirmSalesOrderInZoho(salesOrderId) {
  if (!isZohoConfigured() || !salesOrderId) {
    return { success: false, message: 'Zoho Inventory not configured or salesOrderId missing.' };
  }
  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/salesorders/${salesOrderId}/status/confirmed?organization_id=${config.orgId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.code === 0) {
      console.log(`[Zoho Inventory] Successfully marked Sales Order ${salesOrderId} as Confirmed in Zoho.`);
      return { success: true, data };
    }
    return { success: false, message: data.message || `HTTP ${res.status}` };
  } catch (err) {
    console.warn('[Zoho Confirm Sales Order Warning]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Convert a Zoho Sales Order to an official Zoho Invoice using Zoho Invoice API
 */
export async function convertSalesOrderToInvoice(salesOrderId, orderRecord = {}) {
  // 1. Try converting directly in Zoho via /invoices/fromsalesorder
  if (isZohoConfigured() && salesOrderId) {
    try {
      const token = await getAccessToken();
      const cleanRef = String(orderRecord.reference_number || orderRecord.orderCode || orderRecord.orderId || `${Date.now()}`).replace(/^#/, '').trim();
      const fromSoUrl = `${getApiBaseUrl()}/invoices/fromsalesorder?salesorder_id=${salesOrderId}&organization_id=${config.orgId}&ignore_auto_number_generation=true`;
      const res = await fetch(fromSoUrl, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_number: cleanRef,
          reference_number: cleanRef,
          template_id: config.invoiceTemplateId || '4226403000000039050',
          notes: '',
          terms: '7-Day Free Size Exchange Policy. Goods once sold are non-refundable except defective transit items.'
        })
      });

      const data = await res.json();
      if (res.ok && data.code === 0 && data.invoice) {
        const zohoInv = data.invoice;
        console.log(`[Zoho Invoice Converted] Successfully converted Sales Order ${salesOrderId} to Zoho Invoice #${zohoInv.invoice_number} (ID: ${zohoInv.invoice_id})`);

        // Automatically activate invoice from Draft to Sent so customer portal link & PDF are viewable
        try {
          await fetch(`${getApiBaseUrl()}/invoices/${zohoInv.invoice_id}/status/sent?organization_id=${config.orgId}`, {
            method: 'POST',
            headers: { Authorization: `Zoho-oauthtoken ${token}` }
          });
        } catch (_) {}

        let resolvedInvoiceUrl = String(zohoInv.invoice_url || '').trim();
        if (!resolvedInvoiceUrl && zohoInv.invoice_id) {
          try {
            const detailRes = await fetch(`${getApiBaseUrl()}/invoices/${zohoInv.invoice_id}?organization_id=${config.orgId}`, {
              headers: { Authorization: `Zoho-oauthtoken ${token}` }
            });
            const detailData = await detailRes.json();
            resolvedInvoiceUrl = String(detailData?.invoice?.invoice_url || '').trim();
          } catch (_) {}
        }

        const invoiceDate = zohoInv.date || new Date().toISOString().slice(0, 10);
        const invRecord = {
          success: true,
          source: 'zoho_invoice_from_salesorder',
          invoice_id: zohoInv.invoice_id,
          zoho_invoice_id: zohoInv.invoice_id,
          invoice_number: zohoInv.invoice_number,
          invoice_url: resolvedInvoiceUrl,
          template_id: zohoInv.template_id || config.invoiceTemplateId,
          template_name: zohoInv.template_name || 'The Street Co',
          date: invoiceDate,
          orderCode: orderRecord.orderCode || `${Date.now()}`,
          customerName: orderRecord.contactDetails?.fullName || orderRecord.shippingAddress?.fullName || 'Storefront Customer',
          grandTotalInr: zohoInv.total || orderRecord.grandTotalInr,
          status: 'issued'
        };
        tokenState.cachedInvoices.unshift(invRecord);
        if (tokenState.cachedInvoices.length > 100) tokenState.cachedInvoices.pop();
        saveCache();
        return invRecord;
      } else {
        console.warn('[Zoho fromsalesorder Notice]', data.message || `HTTP ${res.status}. Falling back to createGstInvoice.`);
      }
    } catch (err) {
      console.warn('[Zoho convertSalesOrderToInvoice Warning]', err.message);
    }
  }

  // 2. Fallback: Call createGstInvoice with zoho_salesorder_id linked
  return await createGstInvoice({
    ...orderRecord,
    zoho_salesorder_id: salesOrderId || orderRecord.zoho_salesorder_id
  });
}

/**
 * Lookup an existing Sales Order in Zoho Inventory by reference_number (orderCode)
 */
export async function findSalesOrderByReference(referenceCode) {
  if (!isZohoConfigured() || !referenceCode) return null;
  const cleanRef = String(referenceCode).replace(/^#/, '').trim();
  if (!cleanRef) return null;
  try {
    const token = await getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/salesorders?organization_id=${config.orgId}&reference_number=${encodeURIComponent(cleanRef)}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.code === 0 && Array.isArray(data.salesorders) && data.salesorders.length > 0) {
      return data.salesorders[0];
    }
  } catch (err) {
    console.warn('[Zoho findSalesOrderByReference Notice]', err.message);
  }
  return null;
}

/**
 * Record a Customer Payment against an Invoice in Zoho Inventory (for prepaid UPI/Card/NetBanking orders)
 */
export async function recordCustomerPaymentInZoho(invoiceId, orderRecord = {}) {
  if (!isZohoConfigured() || !invoiceId) {
    return { success: false, message: 'Zoho not configured or invoiceId missing.' };
  }
  try {
    const token = await getAccessToken();
    const invRes = await fetch(`${getApiBaseUrl()}/invoices/${invoiceId}?organization_id=${config.orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const invData = await invRes.json();
    const inv = invData.invoice;
    if (!inv || !inv.customer_id || Number(inv.balance || 0) <= 0) {
      return { success: true, alreadyPaid: true };
    }

    const amount = Number(inv.balance || inv.total || orderRecord.grandTotalInr || 0);
    if (amount <= 0) return { success: false, message: 'Zero amount invoice' };

    const payPayload = {
      customer_id: inv.customer_id,
      payment_mode: String(orderRecord.paymentMethod || 'UPI').toUpperCase(),
      amount: amount,
      date: inv.date || getIstDateString(),
      reference_number: orderRecord.transactionId || orderRecord.orderCode || '',
      description: `Online Payment for Order #${orderRecord.orderCode || inv.invoice_number}`,
      invoices: [
        {
          invoice_id: invoiceId,
          amount_applied: amount
        }
      ]
    };

    const res = await fetch(`${getApiBaseUrl()}/customerpayments?organization_id=${config.orgId}`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payPayload)
    });
    const data = await res.json();
    if (res.ok && data.code === 0 && data.payment) {
      console.log(`[Zoho Inventory] Recorded customer payment #${data.payment.payment_number} for Invoice #${inv.invoice_number}`);
      return { success: true, payment: data.payment };
    }
    return { success: false, message: data.message || `HTTP ${res.status}` };
  } catch (err) {
    console.warn('[Zoho Customer Payment Notice]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Mark a Sales Order / Shipment as Fulfilled / Delivered in Zoho Inventory
 * Creates a Package (with valid SO date) AND Shipment Order marked delivered.
 */
export async function markShipmentFulfilledInZoho(salesOrderId, trackingNumber = '') {
  if (!isZohoConfigured() || !salesOrderId) {
    return { success: false, message: 'Zoho Inventory not configured or salesOrderId missing.' };
  }
  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch sales order details from Zoho
    const getSoRes = await fetch(`${getApiBaseUrl()}/salesorders/${salesOrderId}?organization_id=${config.orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const soData = await getSoRes.json();
    if (!getSoRes.ok || soData.code !== 0 || !soData.salesorder) {
      return { success: false, error: soData.message || 'Sales Order not found in Zoho Inventory.' };
    }

    let so = soData.salesorder;
    const soDate = so.date || getIstDateString();

    // Ensure Sales Order is Confirmed first (draft SOs cannot be packaged/shipped)
    if (String(so.status || '').toLowerCase() === 'draft') {
      await confirmSalesOrderInZoho(salesOrderId);
      const refreshRes = await fetch(`${getApiBaseUrl()}/salesorders/${salesOrderId}?organization_id=${config.orgId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      const refreshData = await refreshRes.json();
      if (refreshData.code === 0 && refreshData.salesorder) {
        so = refreshData.salesorder;
      }
    }

    // 2. Check existing packages or create a new Package
    let pkg = Array.isArray(so.packages) && so.packages.length > 0 ? so.packages[0] : null;
    if (!pkg) {
      const lineItems = (so.line_items || [])
        .map(li => ({
          so_line_item_id: li.line_item_id,
          quantity: Math.max(0, Number(li.quantity || 0) - Number(li.quantity_packed || 0))
        }))
        .filter(li => li.quantity > 0);

      if (lineItems.length > 0) {
        const pkgRes = await fetch(`${getApiBaseUrl()}/packages?organization_id=${config.orgId}&salesorder_id=${salesOrderId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            salesorder_id: salesOrderId,
            date: soDate,
            line_items: lineItems
          })
        });
        const pkgData = await pkgRes.json();
        if (pkgData.code === 0 && pkgData.package) {
          pkg = pkgData.package;
          console.log(`[Zoho Inventory] Package ${pkg.package_number} created for Sales Order ${salesOrderId}`);
        } else {
          console.warn('[Zoho Package Notice]', pkgData.message || `HTTP ${pkgRes.status}`);
        }
      }
    }

    // 3. Create Shipment Order (is_delivered=true) if package exists and isn't already shipped
    let shipment = null;
    if (pkg && pkg.package_id && !pkg.shipment_id) {
      const cleanTrack = String(trackingNumber || '').trim();
      const shipNumber = cleanTrack || `SHP-${String(salesOrderId).slice(-6)}-${Date.now().toString().slice(-4)}`;
      const shipRes = await fetch(
        `${getApiBaseUrl()}/shipmentorders?organization_id=${config.orgId}&package_ids=${pkg.package_id}&salesorder_id=${salesOrderId}&is_delivered=true`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            shipment_number: shipNumber,
            date: soDate,
            delivery_method: 'Delhivery Express',
            tracking_number: cleanTrack || shipNumber
          })
        }
      );
      const shipData = await shipRes.json();
      if (shipData.code === 0 && shipData.shipmentorder) {
        shipment = shipData.shipmentorder;
        console.log(`[Zoho Inventory] Shipment ${shipment.shipment_number} created & delivered for Sales Order ${salesOrderId}`);
      } else {
        console.warn('[Zoho Shipment Notice]', shipData.message || `HTTP ${shipRes.status}`);
      }
    }

    return {
      success: true,
      salesOrderId,
      package: pkg || null,
      shipment: shipment || null,
      message: `Sales Order ${salesOrderId} packaged and marked shipped/delivered in Zoho Inventory.`
    };
  } catch (err) {
    console.warn('[Zoho Mark Fulfilled Warning]', err.message);
    return { success: false, salesOrderId, error: err.message };
  }
}

/**
 * Fetch a single Sales Order from Zoho Inventory to inspect live status
 */
export async function getSalesOrderFromZoho(salesOrderId) {
  if (!isZohoConfigured() || !salesOrderId) return null;
  try {
    const token = await getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/salesorders/${salesOrderId}?organization_id=${config.orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.code === 0 && data.salesorder) {
      return data.salesorder;
    }
  } catch (err) {
    console.warn('[Zoho getSalesOrder Error]:', err.message);
  }
  return null;
}

/**
 * Fetch recent Sales Orders from Zoho Inventory to check live fulfillment statuses
 */
export async function fetchRecentSalesOrdersFromZoho() {
  if (!isZohoConfigured()) return [];
  try {
    const token = await getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/salesorders?organization_id=${config.orgId}&sort_column=created_time&sort_order=D&per_page=200`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.code === 0 && Array.isArray(data.salesorders)) {
      return data.salesorders;
    }
  } catch (err) {
    console.warn('[Zoho fetchRecentSalesOrders Error]:', err.message);
  }
  return [];
}

/**
 * Fetch detailed Zoho Inventory Sales Orders and matching customer contact IDs
 * so Account Order History renders strictly what exists in Zoho Inventory.
 */
export async function fetchCustomerSalesOrders(phone = '', email = '') {
  if (!isZohoConfigured()) {
    return { zohoSynced: false, salesorders: [], matchedCustomerIds: [], error: 'Zoho Inventory not configured' };
  }
  try {
    const token = await getAccessToken();
    const base = getApiBaseUrl();
    const orgId = config.orgId;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = String(email || '').trim().toLowerCase();

    const listRes = await fetch(`${base}/salesorders?organization_id=${orgId}&sort_column=created_time&sort_order=D&per_page=200`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const listData = await listRes.json();
    if (!listRes.ok || listData.code !== 0) {
      throw new Error(listData.message || `Zoho API returned HTTP ${listRes.status}`);
    }

    const rawList = Array.isArray(listData.salesorders) ? listData.salesorders : [];
    const matchedCustomerIds = new Set();

    try {
      const contactsRes = await fetch(`${base}/contacts?organization_id=${orgId}&per_page=200`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      const contactsData = await contactsRes.json();
      if (contactsRes.ok && contactsData.code === 0 && Array.isArray(contactsData.contacts)) {
        for (const c of contactsData.contacts) {
          const cPhone = String(c.phone || '').replace(/\D/g, '').slice(-10);
          const cMobile = String(c.mobile || '').replace(/\D/g, '').slice(-10);
          const cEmail = String(c.email || '').trim().toLowerCase();
          if ((cleanPhone && (cPhone === cleanPhone || cMobile === cleanPhone)) ||
              (cleanEmail && cEmail && cEmail === cleanEmail)) {
            matchedCustomerIds.add(c.contact_id);
          }
        }
      }
    } catch (_) {}

    if (rawList.length === 0) {
      return { zohoSynced: true, salesorders: [], matchedCustomerIds: Array.from(matchedCustomerIds) };
    }

    const detailedList = await Promise.all(
      rawList.map(async (so) => {
        const det = await getSalesOrderFromZoho(so.salesorder_id);
        return det || so;
      })
    );

    return {
      zohoSynced: true,
      salesorders: detailedList,
      matchedCustomerIds: Array.from(matchedCustomerIds)
    };
  } catch (err) {
    console.warn('[Zoho fetchCustomerSalesOrders Error]:', err.message);
    return { zohoSynced: false, salesorders: [], matchedCustomerIds: [], error: err.message };
  }
}

/**
 * Fetch a customer's profile & address directly from Zoho Inventory Contacts by 10-digit phone.
 */
export async function fetchCustomerProfileFromZoho(phone = '') {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10 || !isZohoConfigured()) return null;

  try {
    const token = await getAccessToken();
    const base = getApiBaseUrl();
    const orgId = config.orgId;

    const listRes = await fetch(`${base}/contacts?organization_id=${orgId}&contact_type=customer&per_page=200`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const listData = await listRes.json();
    if (!listRes.ok || listData.code !== 0 || !Array.isArray(listData.contacts)) return null;

    const match = listData.contacts.find(c => {
      const cPhone = String(c.phone || '').replace(/\D/g, '').slice(-10);
      const cMobile = String(c.mobile || '').replace(/\D/g, '').slice(-10);
      return cPhone === cleanPhone || cMobile === cleanPhone;
    });
    if (!match || !match.contact_id) return null;

    const detRes = await fetch(`${base}/contacts/${match.contact_id}?organization_id=${orgId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const detData = await detRes.json();
    const c = (detRes.ok && detData.contact) ? detData.contact : match;

    const fullName = String(c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = String(c.first_name || nameParts[0] || '').trim();
    const lastName = String(c.last_name || nameParts.slice(1).join(' ') || '').trim();
    const email = String(c.email || c.contact_persons?.[0]?.email || '').trim().toLowerCase();

    const ship = c.shipping_address || c.billing_address || {};
    const addresses = [];
    if (ship && (ship.address || ship.city || ship.zip)) {
      addresses.push({
        id: `zoho_addr_${c.contact_id}`,
        name: fullName || 'Customer',
        fullName: fullName || 'Customer',
        phone: cleanPhone,
        email,
        address1: String(ship.address || '').trim(),
        houseFlat: String(ship.address || '').trim(),
        address2: String(ship.street2 || '').trim(),
        streetRoad: String(ship.street2 || '').trim(),
        city: String(ship.city || '').trim(),
        state: String(ship.state || '').trim(),
        pincode: String(ship.zip || '').replace(/\D/g, '').slice(0, 6),
        type: 'Home',
        addressType: 'Home',
        isDefault: true
      });
    }

    return {
      zoho_customer_id: c.contact_id,
      phone: cleanPhone,
      phoneVerified: true,
      firstName,
      lastName,
      fullName,
      email,
      emailVerified: Boolean(email),
      addresses,
      defaultAddressId: addresses[0]?.id || ''
    };
  } catch (err) {
    console.warn('[Zoho fetchCustomerProfileFromZoho Notice]:', err.message);
    return null;
  }
}

/**
 * Build Zoho Sales Return line items mapped strictly to salesorder_item_id
 */
export function mapReturnLineItemsForZoho(soLineItems = [], requestedItems = []) {
  if (!Array.isArray(soLineItems) || soLineItems.length === 0) return [];
  const usedIds = new Set();
  const mapped = [];

  for (const reqItem of (Array.isArray(requestedItems) ? requestedItems : [])) {
    const reqSku = String(reqItem.sku || reqItem.id || '').trim().toLowerCase();
    const reqName = String(reqItem.name || reqItem.title || '').trim().toLowerCase();
    const match = soLineItems.find(li => {
      const avail = Number(li.quantity_shipped ?? li.quantity ?? 1) - Number(li.quantity_returned ?? 0);
      if (avail <= 0 && Number(li.quantity || 0) <= 0) return false;
      if (reqSku && String(li.sku || '').trim().toLowerCase() === reqSku) return true;
      if (reqName && String(li.name || '').trim().toLowerCase().includes(reqName.slice(0, 18))) return true;
      return false;
    }) || soLineItems.find(li => !usedIds.has(li.line_item_id));

    if (match && !usedIds.has(match.line_item_id)) {
      usedIds.add(match.line_item_id);
      const maxQty = Math.max(1, Number(match.quantity || 1) - Number(match.quantity_returned || 0));
      const desiredQty = Math.min(maxQty, Math.max(1, Number(reqItem.qty || reqItem.quantity || 1)));
      mapped.push({
        salesorder_item_id: match.line_item_id,
        item_id: match.item_id,
        quantity: desiredQty
      });
    }
  }

  if (mapped.length === 0) {
    const first = soLineItems[0];
    mapped.push({
      salesorder_item_id: first.line_item_id,
      item_id: first.item_id,
      quantity: 1
    });
  }

  return mapped;
}

/**
 * Create a Sales Return in Zoho Inventory when a customer initiates an Exchange or Return
 */
export async function deleteSalesReturnInZoho(salesReturnId) {
  if (!isZohoConfigured() || !salesReturnId) {
    return { success: false, message: 'Zoho Inventory not configured or salesReturnId missing.' };
  }
  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/salesreturns/${salesReturnId}?organization_id=${config.orgId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    return { success: res.ok && data.code === 0, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a Sales Return in Zoho Inventory when a customer initiates an Exchange or Return
 */
export async function createSalesReturnInZoho(returnRecord, salesOrder = {}) {
  const returnId = returnRecord.id || `RET-${Date.now()}`;
  let salesOrderId = returnRecord.zoho_salesorder_id || salesOrder.zoho_salesorder_id;
  let lastZohoError = null;

  if (isZohoConfigured()) {
    try {
      const token = await getAccessToken();
      let soDetail = null;

      // 1. Verify existing salesOrderId in active Zoho organization (ignore stale IDs from removed orgs)
      if (salesOrderId) {
        soDetail = await getSalesOrderFromZoho(salesOrderId);
        if (!soDetail) {
          salesOrderId = null;
        }
      }

      // 2. Resolve by order reference_number in Zoho if salesOrderId is missing or stale
      if (!salesOrderId && returnRecord.orderCode) {
        const existingSo = await findSalesOrderByReference(returnRecord.orderCode);
        if (existingSo && existingSo.salesorder_id) {
          salesOrderId = existingSo.salesorder_id;
          soDetail = await getSalesOrderFromZoho(salesOrderId);
        }
      }

      // 3. Auto-create Sales Order in Zoho Inventory if not yet present
      if (!salesOrderId || !soDetail) {
        const soFallbackInput = (salesOrder && (salesOrder.orderCode || salesOrder.items?.length))
          ? salesOrder
          : {
              orderCode: returnRecord.orderCode || `ORD-${Date.now()}`,
              contactDetails: {
                fullName: returnRecord.customerName || 'Storefront Customer',
                phone: returnRecord.customerPhone || '',
                email: returnRecord.customerEmail || ''
              },
              shippingAddress: {
                address: returnRecord.pickupAddress || 'Address on file'
              },
              items: returnRecord.items || []
            };
        const createdSo = await createSalesOrder(soFallbackInput);
        if (createdSo && createdSo.success && createdSo.zoho_salesorder_id) {
          salesOrderId = createdSo.zoho_salesorder_id;
          soDetail = await getSalesOrderFromZoho(salesOrderId);
        } else {
          lastZohoError = createdSo?.error || 'Could not link or create Sales Order in Zoho.';
        }
      }

      if (salesOrderId && soDetail) {
        // 4. Ensure Sales Order is Confirmed + Packaged + Shipped (prerequisite for Zoho Sales Return)
        const totalShipped = (soDetail.line_items || []).reduce((s, li) => s + Number(li.quantity_shipped || 0), 0);
        if (totalShipped <= 0) {
          await markShipmentFulfilledInZoho(salesOrderId, salesOrder?.deliveryDetails?.trackingCode || '');
          soDetail = await getSalesOrderFromZoho(salesOrderId) || soDetail;
        }

        // 5. If all line items were already returned in a prior Sales Return on this order, replace the prior return in Zoho
        const remainingReturnable = (soDetail.line_items || []).reduce(
          (s, li) => s + Math.max(0, Number(li.quantity || 0) - Number(li.quantity_returned || 0)),
          0
        );
        if (remainingReturnable <= 0) {
          const priorReturns = Array.isArray(soDetail.salesreturns) ? soDetail.salesreturns : [];
          for (const pr of priorReturns) {
            if (pr && pr.salesreturn_id) {
              await deleteSalesReturnInZoho(pr.salesreturn_id);
            }
          }
          soDetail = await getSalesOrderFromZoho(salesOrderId) || soDetail;
        }

        const zohoLineItems = mapReturnLineItemsForZoho(soDetail.line_items || [], returnRecord.items || []);
        const returnPayload = {
          date: soDetail.date || getIstDateString(),
          reference_number: returnId,
          reason: returnRecord.reason || 'Fit / Size Adjustment',
          notes: '',
          line_items: zohoLineItems
        };

        const url = `${getApiBaseUrl()}/salesreturns?organization_id=${config.orgId}&salesorder_id=${salesOrderId}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(returnPayload)
        });

        const data = await res.json();
        if (res.ok && data.code === 0 && data.salesreturn) {
          const sr = data.salesreturn;
          console.log(`[Zoho Inventory] Successfully created Sales Return #${sr.salesreturn_number} (ID: ${sr.salesreturn_id}) for ${returnId}`);
          return {
            success: true,
            zohoSynced: true,
            source: 'zoho_inventory',
            zoho_salesorder_id: salesOrderId,
            zoho_salesorder_number: soDetail.salesorder_number || salesOrder.zoho_salesorder_number || '',
            zoho_salesreturn_id: sr.salesreturn_id,
            salesreturn_number: sr.salesreturn_number,
            total: sr.total,
            message: `Recorded in Zoho Inventory: ${sr.salesreturn_number}`
          };
        } else {
          lastZohoError = data.message || `Zoho API returned HTTP ${res.status}`;
          console.warn('[Zoho Sales Return Notice]', lastZohoError);
        }
      }
    } catch (err) {
      lastZohoError = err.message;
      console.warn('[Zoho createSalesReturnInZoho Error]', err.message);
    }
  } else {
    lastZohoError = 'Zoho Inventory credentials are not configured.';
  }

  // Local compliant return recording fallback (explicitly mark zohoSynced: false)
  return {
    success: true,
    zohoSynced: false,
    source: 'local_zoho_registered',
    zoho_salesorder_id: salesOrderId || null,
    zohoError: lastZohoError || 'Zoho Sales Return API rejected the request.',
    salesreturn_number: `SR-${returnId.replace(/\D/g, '').slice(-5) || '001'}`,
    message: `Return saved locally (${returnId}); Zoho sync pending: ${lastZohoError || 'Check Zoho Inventory connection'}`
  };
}

/**
 * Confirm / Approve a Sales Return in Zoho Inventory
 */
export async function confirmSalesReturnInZoho(salesReturnId) {
  if (!isZohoConfigured() || !salesReturnId) {
    return { success: false, message: 'Zoho Inventory not configured or salesReturnId missing.' };
  }
  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/salesreturns/${salesReturnId}/status/confirmed?organization_id=${config.orgId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await res.json();
    return { success: res.ok && data.code === 0, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieve cached list of all generated GST invoices
 */
export function getInvoicesList() {
  return tokenState.cachedInvoices || [];
}

/**
 * Fetch Official Zoho Invoice PDF rendered with "The Street Co" template
 */
export async function fetchZohoInvoicePdf(invoiceId) {
  if (!isZohoConfigured() || !invoiceId) return null;
  try {
    const token = await getAccessToken();
    const url = `${getApiBaseUrl()}/invoices/${invoiceId}?organization_id=${config.orgId}&accept=pdf`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return Buffer.from(buf);
    }
  } catch (err) {
    console.warn('[Zoho PDF Fetch Error]:', err.message);
  }
  return null;
}

/**
 * Render printable, compliant Indian GST Tax Invoice HTML
 */
export function renderGstInvoiceHtml(orderRecord) {
  const shipping = orderRecord.shippingAddress || orderRecord.shipping || {};
  const customerState = shipping.state || config.businessState;
  const isB2B = Boolean(orderRecord.isB2B || orderRecord.gstin);
  const customerGstin = (orderRecord.gstin || '').trim().toUpperCase();

  const gst = calculateGstBreakdown({
    subtotalInr: orderRecord.grandTotalInr || orderRecord.subtotalInr,
    customerState,
    isB2B,
    gstin: customerGstin
  });

  const referenceNo = String(orderRecord.reference_number || orderRecord.orderCode || orderRecord.orderId || 'ORDER').replace(/^#/, '').trim();
  const invoiceDate = new Date(orderRecord.createdAt || orderRecord.orderDate || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const items = Array.isArray(orderRecord.items) ? orderRecord.items : [];
  let itemRowsHtml = '';

  items.forEach((item, index) => {
    const qty = Number(item.quantity || 1);
    const grossPrice = Number(item.price || item.priceInr || 999) * qty;
    const taxableItemPrice = Math.round((grossPrice / (1 + (gst.gstRate / 100))) * 100) / 100;
    const itemHsn = item.hsnCode || config.defaultHsnCode;

    itemRowsHtml += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>
          <strong>${item.name || item.title || 'Streetwear Apparel'}</strong>
          ${item.size ? `<br/><span style="font-size: 0.75rem; color: #666;">Size: ${item.size}</span>` : ''}
          ${item.sku ? `<br/><span style="font-size: 0.72rem; color: #888;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="text-align: center;">${itemHsn}</td>
        <td style="text-align: center;">${qty}</td>
        <td style="text-align: right;">₹${Math.round(taxableItemPrice / qty).toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${taxableItemPrice.toLocaleString('en-IN')}</td>
        ${gst.taxType === 'INTRA_STATE' ? `
          <td style="text-align: right;">₹${(Math.round(taxableItemPrice * (gst.cgstRate / 100))).toLocaleString('en-IN')} (${gst.cgstRate}%)</td>
          <td style="text-align: right;">₹${(Math.round(taxableItemPrice * (gst.sgstRate / 100))).toLocaleString('en-IN')} (${gst.sgstRate}%)</td>
        ` : `
          <td style="text-align: right;" colspan="2">₹${(Math.round(taxableItemPrice * (gst.igstRate / 100))).toLocaleString('en-IN')} (${gst.igstRate}%)</td>
        `}
        <td style="text-align: right; font-weight: bold;">₹${grossPrice.toLocaleString('en-IN')}</td>
      </tr>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Tax Invoice — Reference #${referenceNo} — The Street Co</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      background: #f4f4f7;
      padding: 30px 15px;
    }
    .invoice-card {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      padding: 35px 40px;
      border: 1px solid #ddd;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 4px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #c0121f;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #000;
    }
    .brand-sub {
      font-size: 11px;
      color: #c0121f;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .invoice-tag {
      text-align: right;
    }
    .invoice-tag h2 {
      font-size: 20px;
      color: #c0121f;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .invoice-tag p {
      font-size: 12px;
      color: #555;
      margin-top: 3px;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
      font-size: 12px;
      line-height: 1.5;
    }
    .party-box {
      border: 1px solid #e5e7eb;
      padding: 12px 16px;
      border-radius: 4px;
      background: #fafafa;
    }
    .party-box h4 {
      font-size: 11px;
      text-transform: uppercase;
      color: #c0121f;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    table, th, td {
      border: 1px solid #e5e7eb;
    }
    th {
      background: #0d0d12;
      color: #fff;
      padding: 8px 10px;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 10px;
      vertical-align: middle;
    }
    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
    }
    .totals-table {
      width: 320px;
      border: none;
    }
    .totals-table td {
      border: none;
      padding: 4px 6px;
    }
    .totals-table tr.grand-total {
      font-size: 14px;
      font-weight: 800;
      color: #c0121f;
      border-top: 1px solid #ddd;
    }
    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      background: #c0121f;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .badge-b2b {
      display: inline-block;
      padding: 2px 6px;
      background: #10b981;
      color: #fff;
      font-size: 10px;
      border-radius: 3px;
      font-weight: 700;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .action-bar { display: none; }
    }
  </style>
</head>
<body>

  <div class="action-bar" style="max-width: 850px; margin: 0 auto 15px; display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
    <button class="btn" onclick="window.print()">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      PRINT / SAVE PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="header-bar">
      <div>
        <div class="brand-title">THE STREET CO</div>
        <div class="brand-sub">Premium Japanese Anime Streetwear</div>
        <p style="font-size: 11px; color: #555; margin-top: 4px;">
          ${config.businessName}<br/>
          ${config.businessAddress}<br/>
          State: ${config.businessState} (Code: ${config.businessStateCode})<br/>
          <strong>GSTIN:</strong> ${config.sellerGstin}
        </p>
      </div>
      <div class="invoice-tag">
        <h2>TAX INVOICE</h2>
        <p><strong>Reference#:</strong> ${referenceNo}</p>
        <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
        <p><strong>Place of Supply:</strong> ${gst.placeOfSupply} (${gst.placeOfSupplyCode})</p>
      </div>
    </div>

    <div class="parties-grid">
      <div class="party-box">
        <h4>Billed To (Customer) ${gst.isB2B ? '<span class="badge-b2b">B2B TAX INVOICE</span>' : ''}</h4>
        <strong>${shipping.fullName || shipping.name || 'Storefront Customer'}</strong><br/>
        ${orderRecord.customerEmail ? `Email: ${orderRecord.customerEmail}<br/>` : ''}
        ${shipping.phone ? `Phone: ${shipping.phone}<br/>` : ''}
        ${gst.isB2B ? `<strong>Buyer GSTIN:</strong> ${customerGstin}<br/>` : ''}
        Address: ${shipping.address || shipping.address1 || shipping.houseFlat || shipping.fullAddress || 'Address on file'}${shipping.city ? `, ${shipping.city}` : ''}<br/>
        State: ${shipping.state || config.businessState} (Code: ${gst.placeOfSupplyCode})<br/>
        PIN: ${shipping.pincode || ''}
      </div>
      <div class="party-box">
        <h4>Shipping Details</h4>
        <strong>${shipping.fullName || shipping.name || 'Storefront Customer'}</strong><br/>
        Address: ${shipping.address || shipping.address1 || shipping.houseFlat || shipping.fullAddress || 'Same as billing address'}<br/>
        City: ${shipping.city || ''}, State: ${shipping.state || config.businessState}<br/>
        PIN: ${shipping.pincode || ''}<br/>
        Dispatch Mode: <strong>Delhivery Express Courier</strong>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px;">#</th>
          <th>Description of Goods</th>
          <th style="width: 70px;">HSN</th>
          <th style="width: 45px;">Qty</th>
          <th style="width: 80px;">Unit Rate</th>
          <th style="width: 90px;">Taxable Val</th>
          ${gst.taxType === 'INTRA_STATE' ? `
            <th style="width: 90px;">CGST</th>
            <th style="width: 90px;">SGST</th>
          ` : `
            <th style="width: 140px;" colspan="2">IGST</th>
          `}
          <th style="width: 95px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <!-- Totals & GST Summary -->
    <div class="totals-area">
      <div style="max-width: 450px;">
        <p style="font-size: 11px; color: #444; line-height: 1.5;">
          <strong>GST Breakdown Summary (${gst.taxType}):</strong><br/>
          • Taxable Goods Value: ₹${gst.taxableAmount.toLocaleString('en-IN')}<br/>
          ${gst.taxType === 'INTRA_STATE' ? `
            • Central GST (CGST @ ${gst.cgstRate}%): ₹${gst.cgstAmount.toLocaleString('en-IN')}<br/>
            • State GST (SGST @ ${gst.sgstRate}%): ₹${gst.sgstAmount.toLocaleString('en-IN')}<br/>
          ` : `
            • Integrated GST (IGST @ ${gst.igstRate}%): ₹${gst.igstAmount.toLocaleString('en-IN')}<br/>
          `}
          • Total GST Tax Amount: ₹${gst.totalTax.toLocaleString('en-IN')}<br/>
          <br/>
          <em style="color: #666;">This is a computer-generated Indian GST Tax Invoice in accordance with Rule 46 of CGST Rules, 2017.</em>
        </p>
      </div>

      <table class="totals-table">
        <tr>
          <td>Taxable Amount:</td>
          <td style="text-align: right;">₹${gst.taxableAmount.toLocaleString('en-IN')}</td>
        </tr>
        ${gst.taxType === 'INTRA_STATE' ? `
          <tr>
            <td>CGST (${gst.cgstRate}%):</td>
            <td style="text-align: right;">₹${gst.cgstAmount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>SGST (${gst.sgstRate}%):</td>
            <td style="text-align: right;">₹${gst.sgstAmount.toLocaleString('en-IN')}</td>
          </tr>
        ` : `
          <tr>
            <td>IGST (${gst.igstRate}%):</td>
            <td style="text-align: right;">₹${gst.igstAmount.toLocaleString('en-IN')}</td>
          </tr>
        `}
        <tr>
          <td>Shipping & Delivery:</td>
          <td style="text-align: right;">FREE</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${(orderRecord.grandTotalInr || orderRecord.subtotalInr || 0).toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <!-- Footer Terms & Stamp -->
    <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #ccc; padding-top: 15px; font-size: 11px; color: #555;">
      <div>
        <strong>Terms & Conditions:</strong><br/>
        1. 7-Day Free Size Exchange Guarantee on unworn streetwear.<br/>
        2. ITC eligible on B2B purchases with valid GSTIN.<br/>
        3. Subject to Kolkata jurisdiction.
      </div>
      <div style="text-align: center;">
        <div style="font-weight: 800; color: #111; font-size: 12px; margin-bottom: 25px;">For THE STREET CO APPAREL PVT LTD</div>
        <div style="border-top: 1px solid #444; width: 180px; margin: 0 auto; padding-top: 4px; font-size: 10px;">Authorized Signatory</div>
      </div>
    </div>

  </div>

</body>
</html>
  `;
}

