# Future feature: secure QR validation backend

## Why a backend is recommended

The current free-plan app protects the order route with Firebase Authentication and Firestore Rules, but the QR URL contains the order identifier. For stronger one-time validation, the server should issue and consume an opaque token.

## Proposed data model

Add a short-lived field or subcollection owned by the order, for example:

```text
orders/{orderId}/verification/pickup
  tokenHash
  purpose: "pickup"
  expiresAt
  usedAt
  usedBy
```

Store a hash of the token rather than the raw token. Keep the raw token only in the QR payload.

## Callable functions

Add trusted functions such as:

- `createPickupVerificationToken`
- `validatePickupVerificationToken`
- `consumePickupVerificationToken`
- `createDeliveryConfirmationToken` (optional)
- `consumeDeliveryConfirmationOtp` (optional)

Each function must verify the Firebase Auth user, role, order state, token purpose, expiry, and one-time-use condition. Use a transaction when consuming a token so duplicate scans cannot confirm the same handoff.

## Rules and security requirements

- Customers may read only their own QR/token display data.
- Staff and Owner may validate tokens through the trusted function.
- Clients must not be allowed to write `usedAt`, `usedBy`, or a completed handoff marker directly.
- Keep personal data out of QR payloads and URLs.
- Add rate limits and audit events for failed and successful scans.

## Cost and deployment note

The current deployment is Spark-plan compatible. Cloud Functions and Firebase Storage require the Blaze billing plan for the production version. Do not enable this plan or deploy these functions until billing and budget alerts are approved.
