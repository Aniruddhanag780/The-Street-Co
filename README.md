# The Street Co — Elevated Streetwear & Modern Essentials

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-7.7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Firebase](https://img.shields.io/badge/Firebase_Auth-OTP-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Zoho Inventory](https://img.shields.io/badge/Zoho_Inventory-Suite-E42528?style=for-the-badge&logo=zoho&logoColor=white)](https://www.zoho.com/inventory/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **The Street Co** is a full-stack Direct-to-Consumer (D2C) e-commerce progressive web application engineered for modern streetwear culture. Featuring live Delhivery reverse-courier logistics, 7-day doorstep size exchange & refund returns, automated Zoho Inventory sales invoices, MongoDB Atlas cloud storage, and **The Street Cash** gamified loyalty reward engine.

---

## Key Features

### 🛒 D2C Storefront & Product Engine
- **Curated Streetwear Drops**: Heavyweight oversized t-shirts, tactical cargo joggers, drop-shoulder hoodies, and collector jackets.
- **Dynamic Sizing System**: Interactive size selector (`XS`, `S`, `M`, `L`, `XL`, `XXL`) with live inventory availability checks.
- **Delhivery Pincode Checker**: Instant pincode serviceability calculator checking courier availability and dynamic 3-day estimated delivery dates.
- **Price Drop Alerts**: Targeted email notification subscription modal alerting customers whenever their favorite garments drop in price.
- **High-Resolution Gallery Lightbox**: Edge-to-edge product zoom viewer with crisp white text labels and mobile tap support.

### 🔄 7-Day Doorstep Returns & Exchanges
- **Free Size Exchange**: Request a replacement size (`XS`–`XXL`) with doorstep courier reverse collection.
- **Full Purchase Refund**: Return items directly for a 100% refund without requiring a replacement size.
- **Automated Reverse Logistics**: Instant generation of reverse courier tracking numbers (`STC-REV-*****`).
- **One-Click Cancellation**: Full server-backed cancellation via `POST /api/returns/cancel`, automatically synchronizing MongoDB Atlas, local caches, and order cards.

### 💰 "The Street Cash" Loyalty Club
- **Automated Earn Rate**: Automatically earn ₹199 Street Cash for every ₹1,000 spent on confirmed orders.
- **Milestone Rewards**: Reach 499 points to unlock ₹499 instant discount vouchers on checkout.
- **Gamified Missions**: Complete onboarding steps (Account Creation: +75 pts, Profile Setup: +25 pts) to build point balance.

### 🔐 Multi-Channel Customer Authentication
- **Phone OTP Verification**: Direct Firebase phone number verification badge.
- **Email OTP Verification**: 6-digit email confirmation code dispatched via Gmail SMTP.
- **Multi-Address Management**: Saved shipping book with default address designation and pincode auto-fill.

### ⚡ Enterprise Integrations
- **Zoho Inventory & Invoice**: Automatic sales order syncing, official Zoho invoice generation (`#INV`), and sales return dispatching.
- **MongoDB Atlas Persistence**: Cloud document database for orders, users, address books, and return records with zero data loss.
- **Delhivery Express Integration**: Real-time reverse pickup scheduling and parcel dispatch tracking.
- **Google Gmail SMTP**: Transactional email dispatch for order confirmations, exchange approvals, and price-drop notifications.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla JavaScript (ESModules), Semantic HTML5, Tailwind CSS, Modern Flex/Grid Layouts |
| **Mobile & PWA** | Service Worker (`sw.js`), Web App Manifest (`manifest.json`), Apple Touch Icons, Offline Cache |
| **Backend** | Node.js (v20+), Express.js REST API |
| **Database** | MongoDB Atlas (`mongodb` driver v7.7), File-backed fallback cache (`orders_cache.json`) |
| **Authentication** | Firebase Authentication (Phone OTP, Email Verification) |
| **Logistics & ERP** | Zoho Inventory API, Zoho Invoice, Delhivery Reverse Logistics |
| **Communications** | Nodemailer (Gmail SMTP), Twilio SMS Gateway |

---

## Project Structure

```
the-street-co/
├── public/                       # Static public assets, favicons, PWA icons
│   └── img/                      # Brand, product, and partner icons
├── admin-og.html                 # Social preview & OpenGraph banner generator
├── admin-zoho.html               # Zoho Inventory synchronization dashboard
├── email-preview.html            # Transactional email template previewer
├── env.example                   # Environment variable template
├── firebase-auth.js              # Client-side Firebase authentication logic
├── firebase-blueprint.json       # Firebase schema blueprint
├── firestore.rules               # Firestore security rules
├── index.html                    # Main single-page application entry point
├── main.js                       # Frontend store logic, cart, accounts & return modal
├── manifest.json                 # PWA Progressive Web App manifest
├── metadata.json                 # Application metadata & capabilities
├── mongoDb.js                    # MongoDB Atlas connection pool & queries
├── package.json                  # NPM dependencies and run scripts
├── server.js                     # Express server & REST API endpoints
├── style.css                     # Global stylesheet with responsive Tailwind utilities
├── sw.js                         # Service worker for offline asset caching
└── zohoInventory.js              # Zoho Inventory OAuth2 client & sales order sync
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (optional; in-memory/file fallback included)
- A [Zoho Inventory](https://www.zoho.com/inventory/) account (optional for ERP sync)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/the-street-co.git
   cd the-street-co
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and fill in your credentials:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/
   MONGODB_DB_NAME=thestreetco

   # Gmail SMTP Email Dispatch
   GMAIL_SMTP_USER=your-email@gmail.com
   GMAIL_SMTP_PASS=your-app-password
   GMAIL_SENDER_NAME=The Street Co

   # Zoho Inventory (Optional)
   ZOHO_INVENTORY_CLIENT_ID=your_client_id
   ZOHO_INVENTORY_CLIENT_SECRET=your_client_secret
   ZOHO_INVENTORY_REFRESH_TOKEN=your_refresh_token
   ZOHO_INVENTORY_ORG_ID=your_org_id

   # Server Port
   PORT=3000
   NODE_ENV=production
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

5. **Open in browser:**
   Navigate to `http://localhost:3000` to browse the store.

---

## API Reference

### Orders
- `POST /api/orders` — Create a new order (calculates totals, awards Street Cash, dispatches email).
- `GET /api/account/orders?phone=<10_DIGITS>` — Retrieve order history for a customer's phone number from MongoDB Atlas.
- `POST /api/orders/lookup` — Query order status by order code.

### Returns & Exchanges
- `POST /api/returns/create` — Initiate a 7-day size exchange or full refund return with reverse AWB tracking.
- `POST /api/returns/cancel` — Cancel an active return/exchange request across MongoDB Atlas and local caches.
- `GET /api/returns` — List all registered return/exchange requests (merchant admin).
- `POST /api/returns/:id/confirm` — Approve return and schedule Delhivery doorstep courier.
- `POST /api/returns/:id/mark-refund-done` — Confirm customer refund and dispatch payment receipt.

### Logistics & Store Utility
- `GET /api/pincode/check?pincode=<PIN>` — Check Delhivery courier serviceability and estimated delivery arrival.
- `POST /api/newsletter/subscribe` — Register an email address for limited-drop alerts and price drop updates.
- `GET /api/zoho-inventory/status` — Inspect live Zoho Inventory OAuth token status and cached product inventory.

---



## License

This project is licensed under the [MIT License](LICENSE). Built with craftsmanship for streetwear enthusiasts.
