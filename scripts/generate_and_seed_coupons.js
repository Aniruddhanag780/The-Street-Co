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

// 1. GENERATE 100 FLAT DISCOUNT COUPONS (₹100 - ₹500)
const flatTemplates = [
  // 100-149
  { code: 'UCHIHA100', val: 100, min: 799, max: 5000, name: 'Flat ₹100 Uchiha Novice Spark', desc: 'Flat ₹100 instant cash discount on streetwear essentials.' },
  { code: 'STREET100', val: 100, min: 899, max: 6000, name: 'Flat ₹100 Street Cred Starter', desc: 'Flat ₹100 off your first cart across the catalog.' },
  { code: 'WELCOME100', val: 100, min: 999, max: 5000, name: 'Flat ₹100 Welcome Pass', desc: 'Flat ₹100 welcome reward for joining the streetwear community.' },
  { code: 'BRONZE100', val: 100, min: 999, max: null, name: 'Flat ₹100 Bronze Member Perk', desc: 'Exclusive ₹100 member discount for Bronze tier shoppers.' },
  { code: 'SUMMER100', val: 100, min: 899, max: null, name: 'Flat ₹100 Summer Vibe Pass', desc: 'Flat ₹100 off on light cotton tees and shorts.' },
  { code: 'IGNITE100', val: 100, min: 949, max: 6000, name: 'Flat ₹100 Ignite Flame Pass', desc: 'Flat ₹100 off anime streetwear graphic essentials.' },
  { code: 'KUNAI110', val: 110, min: 899, max: 5000, name: 'Flat ₹110 Hidden Leaf Kunai Seal', desc: 'Flat ₹110 savings on stealth shinobi graphics.' },
  { code: 'SWIFT110', val: 110, min: 949, max: 5500, name: 'Flat ₹110 Swift Shinobi Pass', desc: 'Flat ₹110 discount on fast-selling streetwear.' },
  { code: 'ANBU120', val: 120, min: 999, max: 6000, name: 'Flat ₹120 ANBU Mask Clearance', desc: 'Flat ₹120 off black operative oversized garments.' },
  { code: 'URBAN120', val: 120, min: 999, max: 5500, name: 'Flat ₹120 Urban Pulse Deduction', desc: 'Flat ₹120 off high-street printed apparel.' },
  { code: 'FRENZY120', val: 120, min: 1099, max: 7000, name: 'Flat ₹120 Streetwear Frenzy', desc: 'Flat ₹120 flash deduction on oversized apparel.' },
  { code: 'ELITE120', val: 120, min: 1099, max: null, name: 'Flat ₹120 Elite Cadet Reward', desc: 'Flat ₹120 instant perk for elite club members.' },
  { code: 'BLAZE125', val: 125, min: 1049, max: 6000, name: 'Flat ₹125 Fire Style Ember', desc: 'Flat ₹125 discount on streetwear hoodies & tees.' },
  { code: 'PULSE125', val: 125, min: 1099, max: null, name: 'Flat ₹125 Pulse Club Voucher', desc: 'Flat ₹125 off on trending streetwear drops.' },
  { code: 'SHADOW130', val: 130, min: 1099, max: 6500, name: 'Flat ₹130 Shadow Clone Voucher', desc: 'Flat ₹130 instant saving on dark aesthetic clothing.' },
  { code: 'NEON130', val: 130, min: 1149, max: 7000, name: 'Flat ₹130 Neon Shibuya Glow', desc: 'Flat ₹130 deduction on neon cyberpunk prints.' },
  { code: 'KONAN140', val: 140, min: 1199, max: 7500, name: 'Flat ₹140 Paper Angel Shuriken', desc: 'Flat ₹140 discount on origami shinobi designs.' },
  { code: 'ZENITH140', val: 140, min: 1199, max: 6000, name: 'Flat ₹140 Zenith Street Line', desc: 'Flat ₹140 off modern Japanese silhouettes.' },
  { code: 'RAW140', val: 140, min: 1149, max: 7000, name: 'Flat ₹140 Raw Hem Heavyweight Drop', desc: 'Flat ₹140 off raw finish and distressed fits.' },
  { code: 'OVERLORD140', val: 140, min: 1199, max: null, name: 'Flat ₹140 Overlord Vanguard Pass', desc: 'Flat ₹140 exclusive savings on heavy cotton.' },
  
  // 150-199
  { code: 'SHARINGAN150', val: 150, min: 1199, max: 7500, name: 'Flat ₹150 Tomoe Eye Awakening', desc: 'Flat ₹150 instant discount on ninja graphic hoodies.' },
  { code: 'DRIP150', val: 150, min: 1299, max: 8000, name: 'Flat ₹150 Tokyo Drip Requisition', desc: 'Flat ₹150 deduction on high-density puff print tees.' },
  { code: 'FIRSTDROP150', val: 150, min: 1299, max: null, name: 'Flat ₹150 First Drop Voucher', desc: 'Flat ₹150 off for early drop streetwear adopters.' },
  { code: 'SILVER150', val: 150, min: 1399, max: null, name: 'Flat ₹150 Silver Tier Voucher', desc: 'Flat ₹150 loyalty saving on orders above ₹1,399.' },
  { code: 'AUTUMN150', val: 150, min: 1249, max: 8000, name: 'Flat ₹150 Autumn Leaves Hoodie Cut', desc: 'Flat ₹150 discount on thermal fleeces and hoodies.' },
  { code: 'NINJA160', val: 160, min: 1299, max: 7500, name: 'Flat ₹160 Shinobi Wayfarer Seal', desc: 'Flat ₹160 discount on graphic boxy t-shirts.' },
  { code: 'DEIDARA160', val: 160, min: 1349, max: 8000, name: 'Flat ₹160 Explosive Art Voucher', desc: 'Flat ₹160 instant saving on artistic anime drops.' },
  { code: 'MYTHIC160', val: 160, min: 1399, max: null, name: 'Flat ₹160 Mythic Archive Cut', desc: 'Flat ₹160 off rare limited edition apparel.' },
  { code: 'METEOR160', val: 160, min: 1349, max: 7500, name: 'Flat ₹160 Meteor Strike Token', desc: 'Flat ₹160 discount on space anime aesthetic apparel.' },
  { code: 'VORTEX170', val: 170, min: 1399, max: 8000, name: 'Flat ₹170 Spiral Vortex Voucher', desc: 'Flat ₹170 savings on oversized streetwear staples.' },
  { code: 'CLAN170', val: 170, min: 1449, max: 8500, name: 'Flat ₹170 Clan Heritage Pass', desc: 'Flat ₹170 off heritage anime embroidered fits.' },
  { code: 'COVERT175', val: 175, min: 1399, max: 7500, name: 'Flat ₹175 Covert Operative Cut', desc: 'Flat ₹175 instant deduction on tactical streetwear.' },
  { code: 'CYBER175', val: 175, min: 1449, max: null, name: 'Flat ₹175 Cyber Techwear Pass', desc: 'Flat ₹175 off techwear cargo pants and tees.' },
  { code: 'TOBIRAMA180', val: 180, min: 1499, max: 9000, name: 'Flat ₹180 Water Dragon Severance', desc: 'Flat ₹180 discount on anime premium wash hoodies.' },
  { code: 'SHIBUYA180', val: 180, min: 1499, max: 8000, name: 'Flat ₹180 Shibuya Crossing Pass', desc: 'Flat ₹180 instant savings on Tokyo streetwear.' },
  { code: 'CASHBACK180', val: 180, min: 1549, max: null, name: 'Flat ₹180 Street Cred Rebate', desc: 'Flat ₹180 loyalty cashback discount.' },
  { code: 'BLIZZARD180', val: 180, min: 1499, max: 9000, name: 'Flat ₹180 Frost Blizzard Pass', desc: 'Flat ₹180 deduction on winter streetwear fleece.' },
  { code: 'MASTER180', val: 180, min: 1599, max: null, name: 'Flat ₹180 Master Shinobi Token', desc: 'Flat ₹180 off curated Japanese streetwear apparel.' },
  { code: 'SONIC190', val: 190, min: 1549, max: 8500, name: 'Flat ₹190 Sonic Gale Pass', desc: 'Flat ₹190 off heavy loopback French terry tees.' },
  { code: 'DRIFT190', val: 190, min: 1599, max: null, name: 'Flat ₹190 Midnight Drift Pass', desc: 'Flat ₹190 deduction on midnight drift collection.' },

  // 200-249
  { code: 'UCHIHA200', val: 200, min: 1499, max: 8000, name: 'Flat ₹200 Uchiha Fireball Jutsu', desc: 'Flat ₹200 off instant discount on your streetwear order.' },
  { code: 'CHIDORI200', val: 200, min: 1599, max: 9000, name: 'Flat ₹200 One Thousand Birds Seal', desc: 'Flat ₹200 lightning savings on graphic streetwear.' },
  { code: 'HOODIE200', val: 200, min: 1699, max: 10000, name: 'Flat ₹200 Heavy Hooded Fleece Cut', desc: 'Flat ₹200 discount on 400 GSM heavyweight hoodies.' },
  { code: 'GOLD200', val: 200, min: 1799, max: null, name: 'Flat ₹200 Gold VIP Patron Voucher', desc: 'Flat ₹200 exclusive savings for Gold members.' },
  { code: 'WEEKEND200', val: 200, min: 1599, max: 8500, name: 'Flat ₹200 Weekend Drop Special', desc: 'Flat ₹200 flash deduction on weekend shopping.' },
  { code: 'WINTER200', val: 200, min: 1699, max: 9000, name: 'Flat ₹200 Winter Outerwear Pass', desc: 'Flat ₹200 off jackets, hoodies and thermal knits.' },
  { code: 'PHANTOM210', val: 210, min: 1699, max: 9500, name: 'Flat ₹210 Phantom Reaper Token', desc: 'Flat ₹210 savings on gothic streetwear fits.' },
  { code: 'NIGHT210', val: 210, min: 1749, max: 9000, name: 'Flat ₹210 Midnight Shinobi Voucher', desc: 'Flat ₹210 off dark stealth aesthetic clothing.' },
  { code: 'KAKASHI220', val: 220, min: 1799, max: 9500, name: 'Flat ₹220 Copy Ninja Hound Sigil', desc: 'Flat ₹220 off anime boxy graphic essentials.' },
  { code: 'GRAFFITI220', val: 220, min: 1799, max: 10000, name: 'Flat ₹220 Tokyo Graffiti Stamp', desc: 'Flat ₹220 off street graffiti puff print tees.' },
  { code: 'BOOST220', val: 220, min: 1849, max: null, name: 'Flat ₹220 Street Cred Boost', desc: 'Flat ₹220 loyalty boost discount on premium cotton.' },
  { code: 'PRIME220', val: 220, min: 1899, max: null, name: 'Flat ₹220 Prime Collector Card', desc: 'Flat ₹220 savings on our flagship oversized cuts.' },
  { code: 'BLAZE220', val: 220, min: 1849, max: 10500, name: 'Flat ₹220 Blazing Phoenix Pass', desc: 'Flat ₹220 off anime printed acid-wash apparel.' },
  { code: 'VOLT225', val: 225, min: 1799, max: 9500, name: 'Flat ₹225 Voltage Shinobi Seal', desc: 'Flat ₹225 discount on high-voltage graphic drops.' },
  { code: 'TITAN230', val: 230, min: 1899, max: 11000, name: 'Flat ₹230 Colossal Titan Slash', desc: 'Flat ₹230 instant savings on heavy drop tees.' },
  { code: 'ECHO230', val: 230, min: 1899, max: null, name: 'Flat ₹230 Echo Drip Requisition', desc: 'Flat ₹230 deduction on exclusive anime cuts.' },
  { code: 'HIDAN240', val: 240, min: 1949, max: 10000, name: 'Flat ₹240 Immortal Scythe Ritual', desc: 'Flat ₹240 discount on dark cult anime graphics.' },
  { code: 'RAWHEM240', val: 240, min: 1949, max: 11000, name: 'Flat ₹240 Raw Hem Boxy Fit Pass', desc: 'Flat ₹240 off raw seam and drop-shoulder fits.' },
  { code: 'APEX240', val: 240, min: 1999, max: null, name: 'Flat ₹240 Apex Predator Token', desc: 'Flat ₹240 deduction on limited release streetwear.' },
  { code: 'AURORA240', val: 240, min: 1999, max: 12000, name: 'Flat ₹240 Aurora Night Glow', desc: 'Flat ₹240 off glow-in-dark streetwear prints.' },

  // 250-299
  { code: 'VIP250', val: 250, min: 1999, max: null, name: 'Flat ₹250 VIP Street Cred Reward', desc: 'Redeemed via Street Cred Loyalty Club (450 Points).' },
  { code: 'RASENGAN250', val: 250, min: 1999, max: 11000, name: 'Flat ₹250 Spiraling Chakra Sphere', desc: 'Flat ₹250 off on oversized anime hoodies & tees.' },
  { code: 'OVERSIZED250', val: 250, min: 2099, max: 12000, name: 'Flat ₹250 Boxy Silhouette Cut', desc: 'Flat ₹250 deduction on 280 GSM oversized tees.' },
  { code: 'PLATINUM250', val: 250, min: 2199, max: null, name: 'Flat ₹250 Platinum Tier Privilege', desc: 'Flat ₹250 exclusive savings for Platinum shoppers.' },
  { code: 'NIGHTOWL250', val: 250, min: 2049, max: 11500, name: 'Flat ₹250 Night Owl Midnight Pass', desc: 'Flat ₹250 discount for late-night streetwear hunters.' },
  { code: 'SPRING250', val: 250, min: 2099, max: 11000, name: 'Flat ₹250 Cherry Blossom Bloom', desc: 'Flat ₹250 off spring anime streetwear drops.' },
  { code: 'SASORI260', val: 260, min: 2199, max: 12000, name: 'Flat ₹260 Iron Sand Puppet Seal', desc: 'Flat ₹260 off engineered Japanese embroidery.' },
  { code: 'KATANA260', val: 260, min: 2199, max: 12500, name: 'Flat ₹260 Damascus Katana Slash', desc: 'Flat ₹260 discount on samurai aesthetic apparel.' },
  { code: 'NEBULA260', val: 260, min: 2249, max: null, name: 'Flat ₹260 Nebula Starlight Pass', desc: 'Flat ₹260 deduction on celestial printed fits.' },
  { code: 'SOVEREIGN260', val: 260, min: 2299, max: null, name: 'Flat ₹260 Sovereign Royalty Seal', desc: 'Flat ₹260 off heavyweight streetwear outerwear.' },
  { code: 'PULSE275', val: 275, min: 2249, max: 12000, name: 'Flat ₹275 Neon Pulse Cyber Cut', desc: 'Flat ₹275 instant discount on techwear garments.' },
  { code: 'REAP275', val: 275, min: 2299, max: 13000, name: 'Flat ₹275 Soul Reaper Requisition', desc: 'Flat ₹275 off anime bleach wash apparel.' },
  { code: 'HASHIRAMA280', val: 280, min: 2349, max: 13500, name: 'Flat ₹280 Wood Style Forest Sage', desc: 'Flat ₹280 discount on organic streetwear apparel.' },
  { code: 'HARAJUKU280', val: 280, min: 2399, max: 13000, name: 'Flat ₹280 Harajuku Streetwear Pass', desc: 'Flat ₹280 off eclectic Shibuya fashion items.' },
  { code: 'STREETCRED280', val: 280, min: 2449, max: null, name: 'Flat ₹280 Street Cred Club Bonus', desc: 'Flat ₹280 VIP loyalty bonus for active members.' },
  { code: 'TORNADO280', val: 280, min: 2399, max: 14000, name: 'Flat ₹280 Wind Scythe Gale Cut', desc: 'Flat ₹280 off windbreaker jackets and outerwear.' },
  { code: 'GRANDMASTER280', val: 280, min: 2499, max: null, name: 'Flat ₹280 Grandmaster Sigil', desc: 'Flat ₹280 off premier streetwear pieces.' },
  { code: 'STRIKE290', val: 290, min: 2449, max: 14000, name: 'Flat ₹290 Ninja Strike Requisition', desc: 'Flat ₹290 savings on graphic drop-shoulder fits.' },
  { code: 'FROST290', val: 290, min: 2499, max: null, name: 'Flat ₹290 Glacier Frost Pass', desc: 'Flat ₹290 deduction on heavyweight thermal hoodies.' },
  { code: 'SPECTRUM295', val: 295, min: 2499, max: 14500, name: 'Flat ₹295 Spectrum Prismatic Token', desc: 'Flat ₹295 savings on holographic streetwear.' },

  // 300-349
  { code: 'AMATERASU300', val: 300, min: 2499, max: 15000, name: 'Flat ₹300 Black Flame Amaterasu', desc: 'Flat ₹300 scorching discount on dark streetwear apparel.' },
  { code: 'ACIDWASH300', val: 300, min: 2599, max: 15000, name: 'Flat ₹300 Mineral Acid-Wash Cut', desc: 'Flat ₹300 off distressed vintage mineral wash tees.' },
  { code: 'MIDNIGHT300', val: 300, min: 2699, max: 16000, name: 'Flat ₹300 Midnight Drop Voucher', desc: 'Flat ₹300 off on midnight streetwear collection.' },
  { code: 'DIAMOND300', val: 300, min: 2799, max: null, name: 'Flat ₹300 Diamond Patron Seal', desc: 'Flat ₹300 luxury discount for Diamond tier shoppers.' },
  { code: 'MONSOON300', val: 300, min: 2599, max: 14000, name: 'Flat ₹300 Monsoon Rain Pass', desc: 'Flat ₹300 off waterproof outerwear and cargoes.' },
  { code: 'MINATO320', val: 320, min: 2699, max: 15000, name: 'Flat ₹320 Flying Thunder God Seal', desc: 'Flat ₹320 instant teleportation savings on hoodies.' },
  { code: 'CYBER320', val: 320, min: 2749, max: 16000, name: 'Flat ₹320 Cyberpunk Akatsuki Grid', desc: 'Flat ₹320 discount on futuristic graphic clothing.' },
  { code: 'VOUCHER320', val: 320, min: 2799, max: null, name: 'Flat ₹320 VIP Collector Voucher', desc: 'Flat ₹320 off curated lookbook fit bundles.' },
  { code: 'SUPREME320', val: 320, min: 2899, max: null, name: 'Flat ₹320 Supreme Street Cred Pass', desc: 'Flat ₹320 discount for supreme streetwear fans.' },
  { code: 'INFERNO320', val: 320, min: 2799, max: 16500, name: 'Flat ₹320 Inferno Dragon Roar', desc: 'Flat ₹320 off high-density graphic boxy tees.' },
  { code: 'PHANTOM330', val: 330, min: 2849, max: 16000, name: 'Flat ₹330 Phantom Curse Cut', desc: 'Flat ₹330 savings on dark streetwear essentials.' },
  { code: 'COVERT340', val: 340, min: 2899, max: 17000, name: 'Flat ₹340 Covert Syndicate Token', desc: 'Flat ₹340 off syndicate collection drops.' },

  // 350-399
  { code: 'SUSANOO350', val: 350, min: 2999, max: 18000, name: 'Flat ₹350 Susanoo Spectral Armor', desc: 'Flat ₹350 armored savings on heavy French terry fits.' },
  { code: 'HEAVYWEIGHT350', val: 350, min: 3099, max: 18000, name: 'Flat ₹350 Heavy Loopback 400GSM', desc: 'Flat ₹350 discount on premium heavyweight fleece.' },
  { code: 'SECRET350', val: 350, min: 3199, max: 19000, name: 'Flat ₹350 Classified Vault Pass', desc: 'Flat ₹350 classified coupon for streetwear enthusiasts.' },
  { code: 'RUBY350', val: 350, min: 3299, max: null, name: 'Flat ₹350 Ruby Patron Privilege', desc: 'Flat ₹350 VIP discount on luxury streetwear drops.' },
  { code: 'FROST350', val: 350, min: 3099, max: 18000, name: 'Flat ₹350 Sub-Zero Arctic Pass', desc: 'Flat ₹350 off winter fleece and cargo silhouettes.' },
  { code: 'KISAME360', val: 360, min: 3199, max: 18500, name: 'Flat ₹360 Samehada Shark Skin Cut', desc: 'Flat ₹360 off textured high-gauge streetwear knits.' },
  { code: 'KIMONO360', val: 360, min: 3249, max: 19000, name: 'Flat ₹360 Modern Street Haori', desc: 'Flat ₹360 off contemporary Japanese haori & kimono shirts.' },
  { code: 'VANGUARD360', val: 360, min: 3349, max: null, name: 'Flat ₹360 Vanguard Street Cred', desc: 'Flat ₹360 discount on vanguard catalog releases.' },
  { code: 'COSMIC360', val: 360, min: 3299, max: 19500, name: 'Flat ₹360 Cosmic Horizon Requisition', desc: 'Flat ₹360 savings on galactic anime streetwear.' },
  { code: 'OROCHIMARU380', val: 380, min: 3399, max: 20000, name: 'Flat ₹380 Reanimation Snake Seal', desc: 'Flat ₹380 off vintage washed streetwear drops.' },
  { code: 'AKIHABARA380', val: 380, min: 3449, max: 20000, name: 'Flat ₹380 Otaku District Pass', desc: 'Flat ₹380 instant discount on anime apparel collections.' },
  { code: 'VAULT380', val: 380, min: 3499, max: null, name: 'Flat ₹380 Obsidian Vault Key', desc: 'Flat ₹380 off high-end streetwear and accessories.' },
  { code: 'THUNDER380', val: 380, min: 3449, max: 21000, name: 'Flat ₹380 Kirin Thunderstrike', desc: 'Flat ₹380 off graphic outerwear and hoodies.' },
  { code: 'IMMORTAL380', val: 380, min: 3599, max: null, name: 'Flat ₹380 Immortal Shinobi Pass', desc: 'Flat ₹380 discount on our highest-rated streetwear.' },

  // 400-449
  { code: 'ITACHI400', val: 400, min: 3599, max: 22000, name: 'Flat ₹400 Itachi Crow Genjutsu', desc: 'Flat ₹400 genjutsu discount on oversized outerwear.' },
  { code: 'CARGO400', val: 400, min: 3699, max: 22000, name: 'Flat ₹400 Multi-Pocket Utility Cargo', desc: 'Flat ₹400 off parachute techwear and tactical pants.' },
  { code: 'SUPERFAN400', val: 400, min: 3799, max: null, name: 'Flat ₹400 Superfan Street Pass', desc: 'Flat ₹400 savings on top-tier streetwear orders.' },
  { code: 'EMERALD400', val: 400, min: 3899, max: null, name: 'Flat ₹400 Emerald Patron Pass', desc: 'Flat ₹400 loyalty reward for Emerald tier shoppers.' },
  { code: 'SOLAR400', val: 400, min: 3699, max: 23000, name: 'Flat ₹400 Solar Flare Requisition', desc: 'Flat ₹400 discount on solar-washed streetwear hoodies.' },
  { code: 'JIRAIYA420', val: 420, min: 3799, max: 24000, name: 'Flat ₹420 Toad Sage Scroll Seal', desc: 'Flat ₹420 off legendary graphic shinobi apparel.' },
  { code: 'TOKYO420', val: 420, min: 3849, max: 24000, name: 'Flat ₹420 Tokyo Midnight Syndicate', desc: 'Flat ₹420 discount on high-density puff graphic hoodies.' },
  { code: 'SAVINGS420', val: 420, min: 3899, max: null, name: 'Flat ₹420 Supreme Savings Pass', desc: 'Flat ₹420 off on streetwear collection purchases.' },
  { code: 'CHAMPION420', val: 420, min: 3999, max: null, name: 'Flat ₹420 Champion Street Cred Pass', desc: 'Flat ₹420 exclusive member cut on outerwear.' },
  { code: 'TEMPEST420', val: 420, min: 3899, max: 25000, name: 'Flat ₹420 Tempest Storm Voucher', desc: 'Flat ₹420 off heavyweight anime graphic fits.' },

  // 450-499
  { code: 'MADARA450', val: 450, min: 3999, max: 25000, name: 'Flat ₹450 Madara Shattered Heaven', desc: 'Flat ₹450 legendary deduction on major apparel orders.' },
  { code: 'BAGGY450', val: 450, min: 4099, max: 26000, name: 'Flat ₹450 Baggy Fit Denim Cut', desc: 'Flat ₹450 off vintage baggy skate and cargo denim.' },
  { code: 'SAPPHIRE450', val: 450, min: 4199, max: null, name: 'Flat ₹450 Sapphire VIP Requisition', desc: 'Flat ₹450 exclusive reward on premium apparel.' },
  { code: 'ECLIPSE450', val: 450, min: 4099, max: 27000, name: 'Flat ₹450 Total Eclipse Seal', desc: 'Flat ₹450 discount on dark techwear streetwear drops.' },
  { code: 'PAIN460', val: 460, min: 4199, max: 28000, name: 'Flat ₹460 Almighty Push Devastation', desc: 'Flat ₹460 almighty savings on premium streetwear.' },
  { code: 'VINTAGE460', val: 460, min: 4249, max: 28000, name: 'Flat ₹460 Vintage Heavy Mineral Wash', desc: 'Flat ₹460 discount on enzyme washed apparel.' },
  { code: 'WARLORD460', val: 460, min: 4349, max: null, name: 'Flat ₹460 Warlord Sovereign Pass', desc: 'Flat ₹460 off major collector lookbook bundles.' },
  { code: 'GALAXY460', val: 460, min: 4299, max: 29000, name: 'Flat ₹460 Galaxy Supernova Pass', desc: 'Flat ₹460 deduction on outer space anime graphics.' },
  { code: 'GAARA480', val: 480, min: 4399, max: 30000, name: 'Flat ₹480 Sand Tsunami Requisition', desc: 'Flat ₹480 discount on desert aesthetic heavyweight pieces.' },
  { code: 'KYOTO480', val: 480, min: 4449, max: 30000, name: 'Flat ₹480 Kyoto Ancient Shrine', desc: 'Flat ₹480 off traditional Japanese modern streetwear.' },
  { code: 'MYSTERY480', val: 480, min: 4499, max: null, name: 'Flat ₹480 Mystery Shinobi Vault', desc: 'Flat ₹480 mystery discount for top cart totals.' },
  { code: 'CELESTIAL480', val: 480, min: 4599, max: null, name: 'Flat ₹480 Celestial Archive Privilege', desc: 'Flat ₹480 luxury deduction on oversized outerwear.' },

  // 500
  { code: 'ITACHI500', val: 500, min: 4499, max: 30000, name: 'Flat ₹500 First Order Discount', desc: 'Flat ₹500 instant discount on oversized drop-shoulder fits.' },
  { code: 'RINNEGAN500', val: 500, min: 4699, max: 32000, name: 'Flat ₹500 Six Paths Rinnegan Seal', desc: 'Flat ₹500 ultimate discount on premium streetwear apparel.' },
  { code: 'RUNWAY500', val: 500, min: 4799, max: null, name: 'Flat ₹500 Tokyo Runway Couture Cut', desc: 'Flat ₹500 deduction on limited haute streetwear drops.' },
  { code: 'FLASH500', val: 500, min: 4599, max: 30000, name: 'Flat ₹500 Flash Frenzy Pass', desc: 'Flat ₹500 flash cash discount for high-tier carts.' },
  { code: 'ONYX500', val: 500, min: 4899, max: null, name: 'Flat ₹500 Onyx Prestige Voucher', desc: 'Flat ₹500 savings for high-spending streetwear connoisseurs.' },
  { code: 'EQUINOX500', val: 500, min: 4699, max: 32000, name: 'Flat ₹500 Solar Equinox Seal', desc: 'Flat ₹500 off seasonal outerwear and matching sets.' },
  { code: 'KAGUYA500', val: 500, min: 4999, max: 35000, name: 'Flat ₹500 Otsutsuki Goddess Descent', desc: 'Flat ₹500 godly reduction on oversized French terry sets.' },
  { code: 'OBSIDIAN500', val: 500, min: 4999, max: null, name: 'Flat ₹500 Obsidian Vault Master Key', desc: 'Flat ₹500 discount on archival collector streetwear.' },
  { code: 'GODSPEED500', val: 500, min: 4899, max: 35000, name: 'Flat ₹500 Godspeed Lightning Pass', desc: 'Flat ₹500 instant savings on full anime streetwear fits.' },
  { code: 'EMPEROR500', val: 500, min: 4999, max: null, name: 'Flat ₹500 Emperor Dynastic Seal', desc: 'Flat ₹500 royal discount on complete streetwear collections.' },
  { code: 'HORIZON500', val: 500, min: 4799, max: null, name: 'Flat ₹500 Neo-Tokyo Horizon Voucher', desc: 'Flat ₹500 discount on flagship drop lookbook bundles.' },
  { code: 'VIP500', val: 500, min: 2499, max: null, name: 'Flat ₹500 VIP Street Cred Reward Voucher', desc: 'Redeemed via Street Cred Loyalty Club (850 Points).' }
];

// Ensure we have exactly 100 flat coupons (or trim/pad safely)
console.log('Total Flat coupons defined:', flatTemplates.length);

// 2. PERCENTAGE DISCOUNT COUPONS (10% TO 50%) WITH PROPER MIN ORDER VALUES
const percentageTemplates = [
  { code: 'STREET10', val: 10, min: 999, max: 8000, maxDisc: 800, name: '10% Off Entire Order', desc: 'Enjoy 10% instant discount across entire streetwear catalog.' },
  { code: 'FITBUNDLE10', val: 10, min: 1499, max: null, maxDisc: 1500, name: '10% Off Complete Lookbook Bundle', desc: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.' },
  { code: 'DRIP12', val: 12, min: 1299, max: 10000, maxDisc: 1200, name: '12% Off Tokyo Street Drip', desc: 'Get 12% off high-density graphic tees and shorts.' },
  { code: 'SHARINGAN15', val: 15, min: 1799, max: 12000, maxDisc: 1800, name: '15% Off Shinobi Relics', desc: 'Receive 15% instant discount on shinobi graphic hoodies & tees.' },
  { code: 'SHIBUYA15', val: 15, min: 1999, max: null, maxDisc: 2000, name: '15% Off Shibuya Underground Fit', desc: 'Exclusive 15% discount on Shibuya street essentials.' },
  { code: 'HOODIE18', val: 18, min: 2299, max: 14000, maxDisc: 2500, name: '18% Off Heavyweight Fleece Line', desc: 'Save 18% on all 400 GSM heavyweight winter hoodies.' },
  { code: 'AMATERASU20', val: 20, min: 2799, max: 20000, maxDisc: 4000, name: '20% Off Black Flame Hoard', desc: 'Unlock 20% discount on high-tier streetwear apparel.' },
  { code: 'GRAPHIC22', val: 22, min: 3299, max: 22000, maxDisc: 4500, name: '22% Off Premium Graphic Archive', desc: 'Save 22% on puff-printed and embroidered anime cuts.' },
  { code: 'TSUKUYOMI25', val: 25, min: 3999, max: null, maxDisc: 6000, name: '25% Off Grand Archive Master Collection', desc: 'Exclusive 25% discount for major streetwear collectors.' },
  { code: 'OVERSIZED28', val: 28, min: 4499, max: 25000, maxDisc: 7000, name: '28% Off Boxy Silhouette Vault', desc: 'Save 28% on signature drop-shoulder aesthetic clothing.' },
  { code: 'ANBU30', val: 30, min: 4999, max: null, maxDisc: 8000, name: '30% Off Black Ops ANBU Pass', desc: 'Elite 30% discount on tactical streetwear and techwear.' },
  { code: 'CHAKRA32', val: 32, min: 5499, max: 28000, maxDisc: 8500, name: '32% Off Nine Tails Chakra Surge', desc: 'Save 32% on premium winter collection drops.' },
  { code: 'KAMUI35', val: 35, min: 6499, max: null, maxDisc: 10000, name: '35% Off Kamui Dimensional Rift', desc: 'Dimensional 35% discount for high-value streetwear hauls.' },
  { code: 'SUSANOO38', val: 38, min: 7299, max: 32000, maxDisc: 11000, name: '38% Off Perfect Susanoo Titan Armor', desc: 'Save 38% on luxury streetwear matching sets.' },
  { code: 'RINNEGAN40', val: 40, min: 7999, max: null, maxDisc: 12000, name: '40% Off Six Paths Celestial Vault', desc: 'Supreme 40% discount for legendary streetwear collectors.' },
  { code: 'REANIMATION42', val: 42, min: 8999, max: 35000, maxDisc: 13000, name: '42% Off Reanimation Archival Collection', desc: 'Exclusive 42% discount on complete lookbook sets.' },
  { code: 'KAGUYA45', val: 45, min: 9999, max: null, maxDisc: 15000, name: '45% Off Otsutsuki Progenitor Pass', desc: 'Monumental 45% discount on high-tier designer streetwear.' },
  { code: 'TENSAI48', val: 48, min: 11499, max: 40000, maxDisc: 18000, name: '48% Off Ninja Prodigy Master Tier', desc: 'Rare 48% off for streetwear connoisseurs and curators.' },
  { code: 'SAGE50', val: 50, min: 12999, max: null, maxDisc: 20000, name: '50% Off Sage of Six Paths Half-Off Vault', desc: 'Mega 50% discount on complete flagship seasonal wardrobe.' },
  { code: 'GODFATHER50', val: 50, min: 14999, max: null, maxDisc: 25000, name: '50% Off Streetwear Syndicate 50% Off Pass', desc: 'Ultimate 50% discount on premier streetwear lookbooks.' }
];

async function seed() {
  await connectMongoDb();
  const col = await getCollection('coupons');
  if (!col) {
    console.error('Coupons collection not available');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const allDocuments = [];

  // 1. Process 100 Flat coupons
  for (const c of flatTemplates) {
    const min = Number(c.min) || 0;
    const max = c.max ? Number(c.max) : null;
    const subText = formatCouponSubText(min, max);

    const doc = {
      code: c.code.toUpperCase(),
      couponName: c.name,
      couponText: c.desc,
      couponSubText: subText,
      title: c.name,
      desc: c.desc,
      subText: subText,
      group: 'flat',
      type: 'flat',
      value: c.val,
      minOrderValue: min,
      maxOrderValue: max,
      maxDiscount: c.val,
      isPublic: true,
      badge: `FLAT ₹${c.val}`,
      status: 'active',
      source: 'mongodb',
      updatedAt: nowIso
    };

    allDocuments.push(doc);
  }

  // 2. Process Percentage coupons (10% to 50%)
  for (const c of percentageTemplates) {
    const min = Number(c.min) || 0;
    const max = c.max ? Number(c.max) : null;
    const subText = formatCouponSubText(min, max);

    const doc = {
      code: c.code.toUpperCase(),
      couponName: c.name,
      couponText: c.desc,
      couponSubText: subText,
      title: c.name,
      desc: c.desc,
      subText: subText,
      group: 'percentage',
      type: 'percentage',
      value: c.val,
      minOrderValue: min,
      maxOrderValue: max,
      maxDiscount: c.maxDisc || null,
      isPublic: true,
      badge: `${c.val}% OFF`,
      status: 'active',
      source: 'mongodb',
      updatedAt: nowIso
    };

    allDocuments.push(doc);
  }

  // 3. Keep any existing one-time loyalty vouchers (e.g. STREETCASH-*)
  const existingVouchers = await col.find({ isOneTimeUse: true }).toArray();
  for (const v of existingVouchers) {
    delete v._id;
    allDocuments.push(v);
  }

  console.log(`Writing ${allDocuments.length} total coupons to MongoDB Atlas...`);

  // Bulk upsert into MongoDB Atlas
  const bulkOps = allDocuments.map(doc => ({
    updateOne: {
      filter: { code: doc.code },
      update: { $set: doc },
      upsert: true
    }
  }));

  await col.bulkWrite(bulkOps);
  console.log('Bulk write completed successfully in MongoDB Atlas.');

  // Update coupons_cache.json
  fs.writeFileSync(CACHE_FILE, JSON.stringify(allDocuments, null, 2), 'utf8');
  console.log(`Saved ${allDocuments.length} coupons to ${CACHE_FILE}`);

  const flatCount = allDocuments.filter(c => c.group === 'flat' && !c.isOneTimeUse).length;
  const percentCount = allDocuments.filter(c => c.group === 'percentage').length;
  console.log(`Verified counts: Flat Coupons = ${flatCount}, Percentage Coupons = ${percentCount}`);

  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
