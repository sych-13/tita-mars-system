# Future system enhancements

This document lists possible improvements for the Tita Mars Eatery and Bakery system. These are recommendations only; writing them here does not enable a feature.

## Current status note

The basic in-app delivery OTP confirmation is already implemented separately in `02_DELIVERY_QR_OTP_CONFIRMATION.md`. The distance-based delivery fee described below remains planning-only. All other items are future work unless the current application UI already provides a limited version of the feature.

## Priority guide

- **P0 — Production safety:** security, data integrity, recovery, and payment correctness
- **P1 — Business operations:** features that reduce manual work for the owner and staff
- **P2 — Customer experience:** convenience, communication, and retention
- **P3 — Growth:** analytics, automation, and advanced integrations

## P0 — Production safety and reliability

### 1. Server-authoritative order processing

Move final price, delivery fee, product availability, stock validation, and order creation to trusted Cloud Functions. The browser should submit customer choices, while the server calculates the authoritative total from Firestore.

Benefits:

- Prevents modified browser totals.
- Prevents ordering archived or unavailable products.
- Provides one transaction for stock reservation and order creation.
- Keeps payment and inventory decisions auditable.

Requirement: Firebase Blaze billing and deployed callable Functions.

### 2. Automated Firestore backups and recovery drills

Schedule exports of Firestore data and document a restore procedure. Keep retention rules for profiles, products, orders, inventory movements, and audit logs.

Important: test restoring a backup to a separate project before relying on it.

### 3. Abuse protection and monitoring

Add Firebase App Check where compatible, rate-limit sensitive actions, and monitor failed login, order, QR, and payment-verification attempts. Set alerts for unusual traffic, Firestore reads/writes, and function errors.

### 4. Account lifecycle controls

Add owner-only deactivation, reactivation, and permanent deletion workflows. Keep a clear distinction between deleting a Firestore profile and deleting the Firebase Authentication user.

### 5. Privacy and compliance pages

Add a privacy policy, terms of service, data deletion instructions, and a contact channel. Explain what customer, address, payment-reference, and order data is stored and for how long.

## P1 — Owner and staff operations

### 6. Product image upload with Firebase Storage

Enable the prepared owner-only Storage upload flow for JPG, PNG, and WebP files. Validate file type and size, replace old images safely, and delete orphaned files.

Requirement: Blaze billing and an active Storage bucket.

### 7. Stock reservation and low-stock workflow

Add optional stock reservation while an order is being prepared, with automatic release after cancellation or expiry. Add configurable low-stock thresholds and owner notifications.

The current business rule remains: final inventory deduction occurs once when the order is Completed.

### 8. Staff permissions by task

Replace the broad staff role with optional permissions such as:

- View orders
- Update order status
- Verify GCash payments
- View inventory
- Restock inventory
- View reports

Owner remains the only role allowed to assign permissions.

### 9. Shift and staff activity tracking

Add optional staff shift start/end, active staff list, and daily activity summaries. Keep the existing audit log as the source of truth for sensitive actions.

### 10. Better order operations

Add kitchen queue views, preparation time estimates, scheduled-order reminders, printable packing slips, and a customer-notes flag for allergy or fulfillment instructions.

## P2 — Customer experience

### 11. Transactional order notifications

Send email notifications for:

- Order received
- Payment verified or rejected
- Order confirmed
- Preparing
- Ready for Pickup
- Out for Delivery
- Completed
- Cancelled

Use a trusted email provider or Cloud Functions. Do not place provider secrets in the React frontend.

### 12. Real GCash payment gateway

Replace or complement manual QR payment with a supported Philippine payment gateway. Verify payment through signed webhooks, not through a browser callback alone.

Keep manual GCash verification as a fallback if the gateway is unavailable.

### 13. Customer review and moderation system

Add a public reviews section using completed orders only. Include owner moderation, report/hide controls, rating summaries, and protection against duplicate reviews.

### 14. Customer favorites and reorder

Sync favorites to Firebase for signed-in customers and add a **Buy again** action from order history. Keep the local-storage fallback for offline preview mode.

### 15. Better delivery experience

Add delivery address validation, saved addresses, optional map pin, directions link, and clearer Taytay/Cainta delivery boundaries. Never expose a customer's address in a public QR code.

### 16. Installable mobile experience

Complete PWA support with an install prompt, app icon sizes, offline shell, cached catalog assets, and a clear offline message. Authentication, checkout, and payment still require internet access.

### 21. Distance-based delivery fees

Replace the current fixed delivery fee with a transparent distance-based calculation:

- Up to and including 2 km: regular base fee.
- More than 2 km: base fee plus a ₱5 surcharge.

Customer-side checkout should show the selected address/map pin, estimated distance, surcharge, and final fee before order confirmation. The final calculation must be repeated in a trusted backend or protected transaction so a customer cannot edit the submitted total. See `06_DISTANCE_BASED_DELIVERY_FEES.md` for the data model, location options, and edge cases.

## P3 — Growth and analytics

### 17. Advanced reporting

Add custom date ranges, product/category/supplier filters, CSV export, gross sales versus net sales, cancelled-order totals, payment-method totals, and inventory valuation.

### 18. Business analytics dashboard

Track repeat customers, average order value, peak ordering hours, popular products, supplier performance, and pickup versus delivery mix. Use aggregated data and avoid unnecessary personal-data retention.

### 19. Promotions and loyalty

Add owner-created discount codes, minimum spend rules, product exclusions, customer loyalty points, and campaign start/end dates. Validate all discounts on the trusted backend.

### 20. Multi-location readiness

If the business expands, add store IDs to products, inventory, orders, schedules, and staff permissions. Do this before duplicating the database for another branch.

## Quality and maintenance improvements

- Add end-to-end tests for customer, staff, owner, payment, inventory, and QR flows.
- Add mobile viewport tests for 320px, 375px, 390px, and 430px widths.
- Add accessibility checks for keyboard navigation, focus states, contrast, labels, and screen readers.
- Add dependency update checks and security scanning to GitHub Actions.
- Add a staging Firebase project so new rules and functions are tested before production.
- Keep a release checklist and rollback procedure for every deployment.

## Recommended implementation order

1. Backups, monitoring, App Check, and account lifecycle controls.
2. Trusted order totals and inventory validation.
3. Transactional email notifications.
4. Firebase Storage product-image uploads.
5. In-app Pickup QR Scanner and secure one-time tokens.
6. Customer reviews, reorder, and saved addresses.
7. GCash gateway integration.
8. Advanced reporting, promotions, PWA, and multi-location support.

## Decision rule

Before starting a feature, document its data model, role permissions, failure behavior, cost impact, test cases, and rollback plan. Features involving payment, identity, inventory, or personal data should be validated server-side before production release.
