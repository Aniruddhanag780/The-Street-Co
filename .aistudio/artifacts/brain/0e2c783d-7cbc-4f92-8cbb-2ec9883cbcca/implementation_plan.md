# Implementation Plan: VIP Loyalty Points — "The Street Cash"

A luxury VIP Loyalty Program for **The Street Co** named **"The Street Cash"** with an earn rate of 0.199 points per 1 Rs spent (strictly displayed as **"Per 1,000 Rs spent will give you 199 The Street Cash"**), minimum 499 points redemption for a ₹499 OFF single-use coupon, Gemini AI Concierge styling integration, and persistent MongoDB Atlas storage.

## User Requirements Checklist
- [x] **Naming:** Exclusively named **"The Street Cash"**.
- [x] **Rate Notice Constraint:** Strict copy discipline — NEVER state "0.199 points per 1 Rs". All banners and cards strictly display: **"Per 1,000 Rs spent will give you 199 The Street Cash"**.
- [x] **Redemption Minimum & Value:** Minimum **499 The Street Cash** to redeem, yielding a **₹499 OFF** coupon.
- [x] **Same-Page AI Integration:** AI Concierge & Streetwear Stylist recommends pairing outfits with the minted ₹499 voucher directly on the loyalty hub.
- [x] **MongoDB Persistence:** Stores minted coupons in MongoDB Atlas in the `coupons` collection and user ledger in `users`.
- [x] **One-Time Use Only:** Vouchers are strictly single-use; burned and marked `used` upon order placement.
- [x] **VIP Onboarding Missions & Boosts:** Card displaying:
  - New Account Creation: **+75 The Street Cash**
  - Name Upload in My Account: **+25 The Street Cash**
  - Email Added in My Account: **+35 The Street Cash**
  - 1st Order Milestone: **+49 The Street Cash**
- [x] **Automatic Checkbox Ticks & "Go →" Navigation:** Checkboxes auto-tick upon successful completion; "Go →" links guide users directly to sign-in, profile settings, email verification, or catalog.
- [x] **Real-Time Points & SMS Notification:** Dispatches SMS (`sendStreetCashSms`) and displays toast notifications whenever Street Cash points are earned.

## Verified Implementation
1. `mongoDb.js`: Added `getUserStreetCash`, `awardStreetCashForOrder`, `redeemStreetCashCoupon`, `findCouponInMongo`, `burnOneTimeCoupon`, `awardStreetCashBonus`, and `syncUserOnboardingBonuses`.
2. `server.js`:
   - `GET /api/loyalty/status`: returns live balance, milestone progress, tier, active coupons, rate notice, and syncs onboarding mission bonuses.
   - `POST /api/loyalty/sync-missions`: explicitly checks, awards, and returns onboarding mission statuses.
   - `POST /api/account/verify-phone-otp`: automatically credits +75 points for account creation and dispatches SMS.
   - `POST /api/account/profile`: automatically credits +25 points for name and +35 points for email, and dispatches SMS.
   - `POST /api/account/change-email/verify-otp`: automatically credits +35 points for email verification and dispatches SMS.
   - `POST /api/orders`: credits +49 points bonus on user's first order (plus standard 199 pts per ₹1,000 spent) and dispatches SMS.
3. `index.html` & `main.js`:
   - "VIP Member Missions & Boosts" card in creamy white and champagne gold.
   - Auto-ticking green checkmark boxes upon completion, replacing "Go →" with "Claimed ✓".
   - `window.handleMissionGo(key)` seamlessly navigates to auth, profile name, email, or collection catalog.
   - `window.notifyStreetCashReceived(points, reason, newBalance)` triggers celebratory toast on points credited.
