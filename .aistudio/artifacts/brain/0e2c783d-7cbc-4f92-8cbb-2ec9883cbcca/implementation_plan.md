# Automated FamPay UPI Payment Verification via Gmail OAuth

Automates order payment confirmation by connecting the merchant's Google account with read-only Gmail access to detect incoming FamPay UPI receipt emails matching the order amount within the 9:59-minute payment window, with an automated polling indicator and manual UTR fallback.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions were confirmed during the interactive clarification phase:

- **Authentication Method**: Google OAuth with `https://www.googleapis.com/auth/gmail.readonly` permission. No plain-text passwords will ever be requested, stored, or exposed.
- **Matching Rules**: The system will inspect recent emails received in the connected merchant account (`aniruddhanag780@gmail.com` or authenticated user) within the active 9:59-minute payment window and match by exact order amount (e.g. `₹1,599`) and FamPay/UPI payment keywords.
- **Customer Experience**: The UPI QR modal will display a live checking status indicator ("Listening for FamPay payment confirmation...") while polling. As soon as the receipt is detected, it automatically confirms the order and routes to Step 4 Order Confirmation. The manual 12-digit UTR entry link remains accessible as an instant fallback.

---

### 1. Overview & Core Concept

- **What It Does**: Replaces manual verification with an automated receipt-detection pipeline. When a customer scans the UPI QR code and completes their payment through FamPay or any UPI app, FamPay delivers a transaction notification email to the merchant. The app queries the Gmail API for recent receipt messages matching the exact order amount and timestamp, confirming the purchase without human delay.
- **Target Audience / Persona**: Customers paying via UPI on The Street Co storefront and the store merchant seeking seamless, friction-free order fulfillment.
- **Key Value**: Eliminates the delay of manual transaction confirmation, ensures maximum security without collecting passwords, and prevents fraudulent orders by checking real transaction receipts.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Merchant Setup Flow (One-Time Setup)**:
   - In the Merchant Integration section (or Admin Setup modal), the merchant authenticates once via the official "Sign in with Google" button to grant read-only access to transaction receipt emails.
   - The OAuth token is safely retained in memory / session for verification requests.
2. **Customer Checkout & Payment Flow**:
   - Customer adds items to bag, proceeds to checkout, and clicks UPI payment.
   - The UPI modal opens immediately displaying the dynamic amount (e.g., `₹1,599`), order reference (e.g., `ORD-169396`), 09:59 countdown timer, and UPI QR code.
   - Below the QR code, an animated verification radar / live polling status shows:
     `● Checking for payment confirmation... (Auto-verifies upon FamPay receipt)`
   - Customer completes the payment in FamPay or any UPI app.
   - FamPay sends a payment receipt to the merchant's Gmail account.
   - The polling routine detects the email within 2–5 seconds, displays a success pulse ("Payment Received!"), marks the order status as `PAID`, records it in Zoho / local storage, and advances immediately to Step 4 Order Confirmation.
3. **Manual Fallback Flow**:
   - If the customer prefers or if email delivery is delayed, the user can click *"Paid from another app? Enter 12-digit UTR manually"* to reveal the UTR drawer and confirm instantly.

#### Visual Identity & Theme
- **Surface**: Warm paper background (`#F6F4F0`) matching the brand's aesthetic.
- **Card**: Clean pure white card (`#FFFFFF`) with 16px soft radius and subtle elevation.
- **Typography**: Editorial Cinzel and clean geometric sans-serif for headings, monospaced tabular numerals for prices and countdown timers.
- **Colors**: Solid black (`#000000`) for headers, primary CTA, and links. Subtle emerald green (`#16a34a`) for the live polling beacon to signify active verification.
- **Zero-Pill Discipline**: Status and timestamps rendered as clean unboxed text with typographic dot separators (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Google OAuth with Gmail Readonly vs. Raw Password Storage**
  - *Chosen Approach*: Official Google OAuth with `https://www.googleapis.com/auth/gmail.readonly` scope via Firebase Auth / Google Identity Services.
  - *Why*: Google strictly blocks third-party username/password login due to 2FA and security policies. OAuth is the only reliable, industry-standard mechanism that Google permits.
  - *Alternatives Considered*: IMAP password login (rejected: requires 2FA app passwords, fragile, and violates platform security standards).
- **Decision 2: Matching Criteria (Amount + 9:59 Time Window)**
  - *Chosen Approach*: Match incoming messages within the last 10 minutes that contain the exact currency value (e.g. `₹1,599` or `1599`) and payment keywords (`FamPay`, `UPI`, `Received`, `credited`).
  - *Why*: Robust against varying UPI transaction memo formats while preventing false positives from past transactions.
- **Decision 3: Dual Verification Path (Automated Polling + Manual UTR)**
  - *Chosen Approach*: Keep the manual 12-digit UTR entry drawer as a secondary fallback beneath the live status.
  - *Why*: Guarantees zero order drop-off even if email delivery by telecom/email providers is temporarily delayed.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  Checkout Flow        │       │  UPI QR Modal         │  │
│  │  (Address -> Payment) │ ────> │  • Dynamic QR Code    │  │
│  └───────────────────────┘       │  • 09:59 Countdown    │  │
│                                  │  • Live Polling Radar │  │
│                                  │  • Fallback UTR Form  │  │
│                                  └───────────┬───────────┘  │
│                                              │              │
│                                              ▼              │
│                                  ┌───────────────────────┐  │
│                                  │  Verification Engine  │  │
│                                  │  (Polls every 4s)     │  │
│                                  └───────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                               Bearer Token    │  GET /api/verify-payment
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GET /api/verify-payment                              │  │
│  │  • Queries: https://gmail.googleapis.com/gmail/v1/... │  │
│  │  • Filter: `q=after:{timestamp} (FamPay OR UPI) 1599` │  │
│  │  • Parses snippet & snippet body for credit receipt   │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google Workspace Gmail API                  │
│                                                             │
│  • Returns recent matching receipt messages                 │
│  • Validates transaction credited to merchant               │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoints & Verification Logic
1. **OAuth Setup via System Tool**:
   - Initiate `set_up_oauth` with scope `https://www.googleapis.com/auth/gmail.readonly` and title `"Use Gmail to verify FamPay payment receipts"`.
2. **Server-Side Verification Proxy (`/api/verify-payment`)**:
   - Accepts `amount`, `orderId`, `sinceTimestamp`, and `Authorization: Bearer <accessToken>`.
   - Queries Gmail API:
     `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:{epochSeconds} (FamPay OR UPI OR "payment received") {amount}`
   - Inspects found message snippets/body for confirmation of receipt.
   - Responds with `{ verified: true, messageId, snippet }` or `{ verified: false }`.
3. **Frontend Polling Routine**:
   - Starts when the UPI payment modal opens.
   - Polls every 4 seconds.
   - Upon success, stops polling, triggers visual success feedback, marks the session payment as verified, records the order in Zoho, and transitions to Step 4 Order Confirmation.
