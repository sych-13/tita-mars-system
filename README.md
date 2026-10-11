# Tita Mars Eatery & Bakery

Responsive React/Vite storefront and owner/staff workspace based on the supplied Tita Mars design references.

Live deployments:

- Firebase Hosting: https://tita-mars-system-202609.web.app
- GitHub Pages: https://sych-13.github.io/tita-mars-system/

## Run locally

Use Node.js 20.19 or newer (Node.js 22.12+ is also supported).

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open http://127.0.0.1:4173/. Do not open `dist/index.html` directly; the app needs an HTTP server.

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

## Implemented

- Customer storefront, supplier-filtered catalog, search, favorites, product details and persistent cart.
- Pickup or Taytay/Cainta delivery, Cash or manual GCash QR payment, staff/owner payment verification, checkout, confirmation, order tracking and completed-order reviews.
- Customers can record their GCash reference number, sender name and payment time during checkout or later from My Orders; staff can review those details before verification.
- ASAP and scheduled pickup/delivery ordering follows the owner-configured opening time, closing time, booking window and ordering pause control.
- A real-time in-app notification center surfaces new orders, GCash payments, order updates, and low/out-of-stock products.
- Printable order receipts can be opened by customers and staff/owners and saved as PDF through the browser print dialog.
- A unique pickup-verification QR is shown when a pickup order reaches **Ready for Pickup**. Scanning it opens that order in the protected staff/owner workspace.
- Owner workspace: dashboard, product editor, archive/restore, inventory movement ledger, low-stock alerts, detailed audit log, preset or custom-date sales reports, filtered CSV export, staff management and settings.
- Staff workspace: order queue, status updates, finished-product restocking, inventory monitoring and daily sales report.
- Firebase email/password login with a one-time Gmail sign-in link on every Firebase login, required email verification for new accounts, password-reset emails, and protected role-based workspaces.
- Store location preview and one-click Google Maps directions based on the address in Settings.
- Role-aware return-to-workspace navigation from the storefront and safe modals that do not dismiss on outside clicks.
- Light/dark themes, responsive layouts and temporary food images.

## Catalog and inventory

The seed catalog contains the exact 22 approved products with unchanged names, prices and suppliers. Both Banana Loaf products remain separate: Ribbonette's is PHP 170 and Gabbis is PHP 160. Initial stock is 20 per product.

Finished products only are tracked. Every restock, manual stock adjustment and completed-order deduction creates an inventory movement record with before/after quantity, reason, actor and timestamp. Pickup orders move through Pending → Confirmed → Preparing → Ready for Pickup → Completed; delivery orders use Out for Delivery instead. Every status change records its actor and timestamp. Stock is deducted atomically and only once when an order becomes Completed. Earlier statuses do not deduct stock, while Completed and Cancelled orders are locked. Archived, unavailable and out-of-stock products cannot be ordered.

## Firebase data mode

The app is prepared for Firebase Authentication and Cloud Firestore. When the six `VITE_FIREBASE_*` variables are configured, customer accounts, profiles, products, orders, GCash references, status histories, reviews, inventory movements, audit logs and store schedules are stored in Firebase and update connected screens in real time.

The app retains a local preview fallback when Firebase variables are not available. Preview workspaces intentionally bypass login. Favorites and cart state remain browser-local for now.

In the deployed Firebase build, Staff and Owner workspaces require a real signed-in profile; preview-role shortcuts are disabled. New customer, staff and owner accounts must verify their email first. After the password and role are checked, every login sends a single-use Firebase sign-in link to that email. Opening the link completes the session; opening it on another device asks for the matching email without putting the address in the link. Product IDs, stock, supplier/category matching, and store settings are validated before saving.

Google and Facebook are also supported as Firebase social sign-in providers. A first-time social user is always created as a customer; social login can never assign a staff or owner role. Existing staff and owner users must first sign in with their current method and connect Google or Facebook from **My Profile -> Connected accounts**. Google sign-in is configured by `firebase.json`. Facebook requires a one-time Meta app setup before its button can complete login.

The default deployment is intentionally compatible with Firebase's free Spark plan. It uses Firebase Hosting, Authentication and Cloud Firestore. Manual GCash verification is protected by Firestore roles and updates the customer view in real time. Product images use bundled assets or a hosted image URL; Firebase Storage uploads and Cloud Functions remain disabled so the project does not require a billing account. The Spark-compatible rules also protect append-only inventory movements and owner/staff audit records.

Order-confirmation and order-status emails are not active yet. Firebase currently sends account-verification, one-time sign-in and password-reset emails. A separate mail provider and a trusted server/Cloud Function are still required for order emails so provider credentials are never exposed in the browser. The project also does not currently run a separate Laravel/REST backend; Firebase Authentication and Cloud Firestore are its active application APIs.

### Gmail verification and one-time sign-in links

In **Firebase Console → Authentication → Sign-in method → Email/Password**, keep Email/Password enabled and enable **Email link (passwordless sign-in)**. Both deployed domains must appear in **Authentication → Settings → Authorized domains**:

- `tita-mars-system-202609.web.app`
- `sych-13.github.io`

These settings are already active in the current Firebase project. Add `localhost` manually only for temporary local Firebase testing; it is not required by the isolated browser QA suite.

### Social sign-in setup

Google sign-in is enabled by the Firebase Auth deployment configuration. Deploy provider changes with:

```powershell
npx.cmd firebase-tools deploy --only auth
```

Facebook login additionally requires a Meta for Developers app. In the Meta app, enable Facebook Login and add this Valid OAuth Redirect URI:

```text
https://tita-mars-system-202609.firebaseapp.com/__/auth/handler
```

Then open **Firebase Console -> Authentication -> Sign-in method -> Facebook**, enable it, and enter the Meta App ID and App Secret. Keep the secret only in Firebase/Meta; never place it in `.env`, source code, GitHub, or a chat message. Until that setup is complete, Firebase will reject Facebook login as a disabled provider while Google and email login continue to work.

### Deploy to Firebase Hosting on the free Spark plan

Build and deploy the site at the Firebase domain:

```powershell
npx.cmd firebase-tools deploy --only hosting
```

The hosting predeploy step builds Vite with `/` as its base path. The existing GitHub Pages build continues to use `/tita-mars-system/`.

### Optional Blaze-only features

The repository also contains prepared owner-only Firebase Storage uploads for JPG, PNG and WebP product images up to 5 MB, plus callable Cloud Functions for server-authoritative order totals, status transitions and exactly-once inventory deduction. They are not used by the free deployment.

If the project is upgraded later, create the default Storage bucket, install the backend dependencies, and deploy using the optional configuration:

```powershell
npm.cmd install --prefix functions
npx.cmd firebase-tools deploy --config firebase.trusted.json --only storage,functions
```

After both functions are live, deploy the prepared trusted Firestore rules. This disables direct client order creation and staff status writes; only the Admin SDK functions can perform them.

```powershell
npx.cmd firebase-tools deploy --config firebase.trusted.json --only firestore:rules
```
Then set `VITE_FIREBASE_STORAGE_ENABLED=true` and `VITE_TRUSTED_BACKEND_ENABLED=true`. Keep both values `false` for the free-only setup.

### Configure GitHub Pages

Add these repository secrets in **GitHub -> Settings -> Secrets and variables -> Actions**, copying the values from your local `.env.local` file:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_TRUSTED_BACKEND_ENABLED` (set to `true` only after the callable functions are deployed)

The GitHub Pages workflow uses these values only during the production build. A push to `main` builds and deploys automatically.

### First owner and staff roles

Customer registration is public, while owner and staff roles are deliberately not self-assignable. Create the first owner in Firebase Authentication, then create the matching `profiles/{Firebase Auth UID}` document in Firestore:

```json
{
  "name": "Owner or staff name",
  "email": "account@example.com",
  "phone": "",
  "address": "",
  "role": "owner",
  "active": true,
  "createdAt": "2026-09-27T00:00:00.000Z",
  "updatedAt": "2026-09-27T00:00:00.000Z"
}
```

After the first owner signs in, staff accounts can be created from **Owner Dashboard → Staff → Add Staff**. The app creates the Firebase Authentication user and its owner-protected `staff` profile together. Deactivated staff profiles cannot access the staff workspace.

## Verification

Run the production build before deployment:

```powershell
npm test
npm run test:rules
npm run build
```

`npm run test:rules` starts the local Firestore emulator and verifies public,
customer, staff and owner permissions, including GCash detail submission, inventory movement/audit records and staff restocking restrictions,
without reading or changing live data.
GitHub Actions runs both automated test suites before every Pages deployment.

The reusable `scripts/browser-qa.mjs` launches an isolated browser session and tests the catalog, themes, cart, scheduled checkout, GCash references and verification, printable receipt, notifications, pickup QR, custom reports, inventory ledger, audit log, accounts, reviews and responsive screens without touching the normal browser profile.

Set `VITE_FIREBASE_DISABLED=true` when starting the QA server so the suite uses isolated browser-local preview data instead of the live Firebase project.
