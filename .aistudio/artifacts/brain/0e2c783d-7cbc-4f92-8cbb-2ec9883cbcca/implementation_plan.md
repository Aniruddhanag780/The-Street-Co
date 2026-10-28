# The Street Co — Next-Gen Storefront Experience Suite

Elevate **The Street Co** from a product catalog into a high-conversion, full-lifecycle luxury streetwear platform by adding five integrated shopping, sizing, drop-culture, loyalty, and post-purchase experiences.

## User Review & Critical Decisions

> [!IMPORTANT]
> All five selected capabilities will be accessible across three unified touchpoints: dedicated homepage editorial sections, top-header navigation links & quick-access action triggers, and interactive slide-over drawers/modals, backed by both instant client-side browser storage and server-side JSON persistence with Email/SMS notifications.

- **Confirmed Feature Suite**:
  1. **Interactive Shop-the-Fit Lookbook & Outfit Builder**
  2. **Smart Fit Finder & Size Recommendation Quiz**
  3. **Live Flash Drop Countdown & Waitlist Vault**
  4. **VIP Street Cred Loyalty Points & Referral Rewards Club**
  5. **Self-Service Order Lookup & 7-Day Size Exchange Portal**
- **Confirmed Placement Strategy**: Multi-access integration combining curated homepage sections, top navigation/header triggers, and slide-over drawers/modals (including PDP & Checkout integration).
- **Confirmed Data & Notification Strategy**: Hybrid persistence combining instant `localStorage` state with backend Express API endpoints, persistent JSON stores, and automated Gmail/Twilio alerts.

---

## 1. Overview & Core Concept

- **What It Does**: Adds complete pre-purchase discovery (Lookbook Hotspots & Smart Size Quiz), high-urgency drop culture (Live Countdown Vault & Waitlist Registration), customer retention (Tiered VIP Loyalty Points & Referral Rewards redeemable at checkout), and post-purchase self-service (Order History Lookup, GST Invoice Download, and 7-Day Size Exchange Portal).
- **Target Audience / Persona**: Discerning streetwear and modern luxury shoppers in India who value heavyweight fabric craftsmanship, accurate oversized vs. tailored sizing, exclusive limited-edition drops, and frictionless post-order support.
- **Key Value**: Eliminates sizing hesitation, increases average order value (AOV) via full-outfit bundling, captures high-intent leads on upcoming drops, rewards repeat buyers automatically, and automates size exchanges without manual support overhead.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Interactive Shop-the-Fit Lookbook & Outfit Builder**:
   - Shoppers browse curated editorial outfit cards on the homepage or open the Lookbook modal from the navigation bar.
   - Hovering or tapping numbered hotspot pins (`01`, `02`, `03`) on each model photo highlights the exact garment (e.g., *Heavyweight Oversized Hoodie*, *Tactical Cargo Pant*, *Crossbody Utility Bag*) with live price and size selector.
   - Clicking **"Add Complete Fit to Bag (Save 10%)"** adds all selected pieces in the outfit to the shopping bag in one click and automatically applies a bundle discount.

2. **Smart Fit Finder & Size Calculator Quiz**:
   - Accessible directly from the Product Detail Page (next to the Size Selector), header/floating quick-tool, or Size Guide modal.
   - Users enter Height (cm or ft/in), Weight (kg), Body Build (Lean, Athletic, Broad), and Preferred Drape (Tailored, Signature Street, Boxy Oversized).
   - Calculates the exact recommended size (`S` through `XXL`) with a confidence breakdown, chest/shoulder fit notes, and a one-click **"Select My Size"** button that auto-selects the size across the store.

3. **Live Flash Drop Countdown & Waitlist Vault**:
   - A dedicated **Drop Vault** showcase displays upcoming limited-edition releases with a live ticking countdown (`DD : HH : MM : SS`), edition numbers (e.g., *Limited to 150 Pieces*), and real-time waitlist demand counters.
   - Shoppers click **"Join Drop Waitlist"**, enter their Email and WhatsApp/SMS phone number, and select their preferred size to reserve early access and receive an instant confirmation dispatch.

4. **VIP Loyalty Points ("Street Cred") & Referral Rewards Club**:
   - Accessible via the header **VIP Club** trigger and floating rewards drawer.
   - Displays the shopper's current points balance, membership tier (*Initiate* → *Vanguard* → *Syndicate* → *Obsidian VIP*), ways to earn points (purchases, newsletter signup, reviews, lookbook shares), and a unique referral link (`+250 pts`).
   - Points can be converted into instant rupee discount vouchers (`₹100` to `₹1,000 OFF`) and applied with a single click inside the Shopping Bag and Checkout flow.

5. **Self-Service Order Lookup & 7-Day Size Exchange Portal**:
   - Accessible from the header/footer **Orders & Exchanges** link or post-checkout view.
   - Customers look up their orders by Order ID, Phone Number, or Email to view live status, itemized summary, and one-click printable GST Tax Invoice.
   - Eligible orders include a **"Request 7-Day Size Exchange / Return"** workflow where customers choose the item, select the replacement size (`S–XXL`) or return reason, and receive an instant Exchange Reference ID with pickup scheduling details.

### Visual Identity & Theme

- **Aesthetic Direction**: Minimalist luxury streetwear meeting high-contrast editorial tailoring—clean architectural framing, generous whitespace, and zero visual clutter.
- **Color Palette & Mood**:
  - **60% Dominant Canvas**: Crisp warm ivory (`#FAF8F5`) for editorial/catalog surfaces paired with deep obsidian (`#0E0E11`) for the Drop Vault and VIP Club showcase.
  - **30% Structural Surfaces**: Subtle travertine/stone cards (`#F3EFEA`), dark charcoal drawers (`#16161B`), and hairline `1px` borders (`rgba(14,14,17,0.08)`).
  - **10% Accent Budget**: Signature crimson (`#C0121F`) and brushed gold (`#C9A84C`) reserved strictly for primary interactive CTAs, active hotspot pins, and VIP tier progress bars.
- **Typography & Hierarchy**:
  - *Display Headings*: `Playfair Display` & `Cinzel` with `text-wrap: balance` and controlled proportions (`clamp(1.75rem, 3vw, 2.75rem)`).
  - *Body & UI Controls*: `Plus Jakarta Sans` (400 Regular / 600 SemiBold) with single-line (`whitespace-nowrap`) button and tab labels.
  - *Numeric Data & Timers*: Tabular numerals (`font-variant-numeric: tabular-nums`) on all prices, countdown timers, loyalty points, and sizing measurements.
- **Interactive Feedback & Motion**:
  - Fast, responsive micro-interactions ($\le 200\text{ms}$) using compositor-only `transform` and `opacity` transitions.
  - Unboxed metadata separated by clean typographic dots (`·`)—no decorative status dots or badge clutter.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Experience Hub + Contextual Entry Points**
  - *Chosen Approach*: Place the **Interactive Lookbook** and **Live Drop Vault** as high-impact homepage sections, while exposing **Smart Fit Finder**, **VIP Rewards**, and **Order & Exchange Portal** as slide-over drawers/modals triggered from the header, PDP, checkout, and floating quick-bar.
  - *Why*: Keeps the homepage editorial and uncrowded while making utility tools (sizing, rewards, exchanges) immediately reachable from any scroll position or product view.
  - *Alternatives Considered*: Putting all 5 tools as stacked homepage forms, which would create excessive vertical scrolling and dilute the storefront focus.

- **Decision 2: Hybrid Client + Server Persistence with Instant Synchronized State**
  - *Chosen Approach*: Persist fit profiles, loyalty points, waitlist registrations, and exchange requests in `localStorage` for zero-latency UI updates while syncing them asynchronously to Express JSON endpoints (`/api/waitlist`, `/api/loyalty`, `/api/exchanges`, `/api/orders/lookup`) with automated email/SMS confirmation support.
  - *Why*: Ensures instant responsiveness even offline/on slow connections while maintaining durable server-side records and real transactional notifications.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         THE STREET CO — CLIENT STOREFRONT                    │
├───────────────────────┬──────────────────────────┬───────────────────────────┤
│   HOMEPAGE SECTIONS   │  HEADER & FLOATING HUB   │   PDP & CHECKOUT HOOKS    │
│ ┌───────────────────┐ │ ┌──────────────────────┐ │ ┌───────────────────────┐ │
│ │ Shop-the-Fit      │ │ │ VIP Street Cred      │ │ │ Smart Fit Finder      │ │
│ │ Lookbook Studio   │ │ │ Rewards Drawer       │ │ │ Size Quiz Modal       │ │
│ └─────────┬─────────┘ │ └──────────┬───────────┘ │ └───────────┬───────────┘ │
│           │           │            │             │             │             │
│ ┌─────────▼─────────┐ │ ┌──────────▼───────────┐ │ ┌───────────▼───────────┐ │
│ │ Live Flash Drop   │ │ │ Self-Service Order & │ │ │ Loyalty Voucher &     │ │
│ │ Countdown Vault   │ │ │ 7-Day Exchange Modal │ │ │ Bundle Discount Hook  │ │
│ └─────────┬─────────┘ │ └──────────┬───────────┘ │ └───────────┬───────────┘ │
└───────────┼───────────┴────────────┼─────────────┴─────────────┼─────────────┘
            │                        │                           │
            ▼                        ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               CLIENT STATE MANAGER (localStorage + Live Events)              │
│   • Saved Fit Profile (Height/Weight/Recommended Size)                       │
│   • VIP Points Ledger, Tier Status & Active Reward Vouchers                  │
│   • Shopping Bag Bundle Pricing & Waitlist Reservations                      │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │ REST JSON API (/api/*)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER & PERSISTENCE LAYER                      │
│  • POST /api/drop-waitlist      ──► Waitlist Store + Email/SMS Alert         │
│  • GET/POST /api/loyalty        ──► VIP Points & Referral Ledger             │
│  • GET /api/orders/lookup       ──► Order History & GST Invoice Lookup       │
│  • POST /api/exchanges/create   ──► 7-Day Size Exchange Ticket & Dispatch    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Lookbook Outfits**: Curated multi-item ensembles containing `lookId`, `title`, `aestheticNote`, `bundleDiscountPct` (10%), and an array of `hotspots` (`x%`, `y%`, `productId`, `role`, `defaultSize`).
- **Smart Fit Profile**: `{ heightCm, weightKg, buildType, fitPreference, recommendedSize, confidencePct, updatedAt }` persisted locally and automatically highlighted on all Product Detail Pages.
- **Drop Vault Waitlist Entry**: `{ id, dropId, dropTitle, email, phone, preferredSize, createdAt }` synced to server storage and confirmed via notification dispatch.
- **VIP Loyalty Account**: `{ memberId, email, phone, pointsBalance, lifetimePoints, tier, referralCode, history[], redeemedCoupons[] }` synced between client and server and wired directly into the Checkout promo engine.
- **Size Exchange / Return Request**: `{ exchangeId, orderCode, customerPhone, customerEmail, itemTitle, currentSize, requestedSize, reason, resolutionType, status, createdAt }` persisted on the server and linked to the order record.

### Interactive Component & State Mapping

- **Hotspot Selection & Bundle Add**: Clicking any hotspot pin on a Lookbook image updates the active garment preview card; clicking *"Add Complete Fit"* iterates all items in the look, adds them to the cart with their selected sizes, applies the 10% outfit bundle discount, and opens the Cart Drawer with a toast confirmation.
- **Fit Quiz Calculation**: Submitting the 4-parameter Fit Finder runs a deterministic BMI + shoulder-frame + drape-offset matrix, displays the tailored size badge (`S`–`XXL`), saves the badge to the PDP size buttons (`"Recommended for You"`), and lets the user apply it in one click.
- **Drop Countdown & Waitlist**: A `1000ms` interval updates tabular countdown digits for each upcoming release; submitting the waitlist form validates email/phone, posts to `/api/drop-waitlist`, increments the live waitlist counter, and switches the card state to *"Reserved on Waitlist"*.
- **VIP Points Redemption**: Clicking *"Redeem Points"* in the VIP Drawer generates a verified discount voucher and automatically populates and applies it in the Checkout summary calculation.
- **Order Lookup & 7-Day Exchange**: Entering an Order ID or Phone/Email queries `/api/orders/lookup` (falling back seamlessly to local order history), renders order cards with GST Invoice links, and opens an interactive 7-Day Size Exchange form that submits to `/api/exchanges/create` and returns a live Exchange Tracking Code.
