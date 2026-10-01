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
- Pickup or Taytay/Cainta delivery, Cash or GCash selection, checkout, confirmation, order tracking and completed-order reviews.
- Owner workspace: dashboard, product editor, archive/restore, inventory, reports, CSV export, staff management and settings.
- Staff workspace: order queue, status updates, inventory monitoring and daily sales report.
- Firebase email/password login, customer registration, password-reset emails, and protected role-based workspaces.
- Role-aware return-to-workspace navigation from the storefront and safe modals that do not dismiss on outside clicks.
- Light/dark themes, responsive layouts and temporary food images.

## Catalog and inventory

The seed catalog contains the exact 22 approved products with unchanged names, prices and suppliers. Both Banana Loaf products remain separate: Ribbonette's is PHP 170 and Gabbis is PHP 160. Initial stock is 20 per product.

Finished products only are tracked. Pickup orders move through Pending → Confirmed → Preparing → Ready for Pickup → Completed; delivery orders use Out for Delivery instead. Stock is deducted atomically and only once when an order becomes Completed. Earlier statuses do not deduct stock, while Completed and Cancelled orders are locked. Archived, unavailable and out-of-stock products cannot be ordered.

## Firebase data mode

The app is prepared for Firebase Authentication and Cloud Firestore. When the six `VITE_FIREBASE_*` variables are configured, customer accounts, profiles, products, orders, reviews, order status and completed-order inventory deductions are stored in Firebase and update connected screens in real time.

The app retains a local preview fallback when Firebase variables are not available. Preview workspaces intentionally bypass login. Favorites and cart state remain browser-local for now.

In the deployed Firebase build, Staff and Owner workspaces require a real signed-in profile; preview-role shortcuts are disabled. Product IDs, stock, supplier/category matching, and store settings are validated before saving.

The default deployment is intentionally compatible with Firebase's free Spark plan. It uses Firebase Hosting, Authentication and Cloud Firestore. Product images use bundled assets or a hosted image URL; Firebase Storage uploads and Cloud Functions remain disabled so the project does not require a billing account.

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
customer, staff and owner permissions without reading or changing live data.
GitHub Actions runs both automated test suites before every Pages deployment.

The reusable `scripts/browser-qa.mjs` launches an isolated browser session and tests the catalog, themes, cart, checkout, inventory, accounts, reviews and responsive screens without touching the normal browser profile.

Set `VITE_FIREBASE_DISABLED=true` when starting the QA server so the suite uses isolated browser-local preview data instead of the live Firebase project.
