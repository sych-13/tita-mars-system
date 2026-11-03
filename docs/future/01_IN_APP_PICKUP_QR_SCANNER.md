# Future feature: in-app Pickup QR Scanner

## Goal

Allow an authenticated Staff or Owner user to scan a customer's Pickup Verification QR directly inside the Tita Mars workspace. This is a planning document only; the current app still uses the phone camera, Google Lens, or another QR scanner app.

## Current state

- Customers receive a Pickup Verification QR when a pickup order reaches `Ready for Pickup`.
- The QR currently opens the protected `manage-orders` route for that order.
- The app does not currently request camera access or scan QR codes itself.

## Proposed user flow

1. Staff or Owner opens **Orders → Scan pickup QR**.
2. The app explains why camera permission is needed.
3. Staff grants camera access.
4. The scanner reads the QR and stops the camera immediately.
5. The app validates the token and opens the matching order.
6. Staff confirms the customer name and items.
7. Staff marks the order as picked up/completed according to the normal status rules.

## Required UI states

- Camera permission request
- Scanner loading state
- Scanning state with a visible scan frame
- Valid pickup QR result
- Invalid or expired QR
- Order is not `Ready for Pickup`
- Camera unavailable or permission denied
- Manual order-number fallback
- Close scanner and return to Orders

## Technical options

- Prefer `BarcodeDetector` when available.
- Add a maintained fallback such as `@zxing/browser` or `html5-qrcode` for browsers without `BarcodeDetector`.
- Camera access requires HTTPS in production; Firebase Hosting already provides HTTPS. `localhost` is also permitted for development.
- Stop all camera tracks when the scanner closes or a result is found.

## Acceptance criteria

- Only Staff and Owner can open the scanner.
- Customer accounts cannot start the scanner or read staff order details.
- A valid QR opens only its own order.
- Invalid, expired, completed, cancelled, or delivery-order QRs are rejected.
- Camera streams are stopped after success, cancel, or route change.
- Manual order-number lookup remains available as a fallback.
- Mobile layout works in both light and dark themes.
