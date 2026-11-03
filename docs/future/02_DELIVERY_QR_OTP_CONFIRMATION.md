# Future feature: Delivery QR or OTP confirmation

## Goal

Provide an optional proof-of-delivery handoff for delivery orders. The free in-app OTP flow is now enabled; the QR option remains future work.

## Recommended default

Use a short, one-time delivery OTP as the primary method. It works on any phone and does not require the rider to install a scanner app. A delivery QR may be offered as an optional convenience.

## Current implemented flow

1. Customer order reaches `Out for Delivery`.
2. The customer sees a generated 6-digit delivery OTP in the order view.
3. Rider or Staff asks the customer for the OTP at handoff.
4. Staff enters the OTP in the protected order screen.
5. The system validates the order, 30-minute expiry, role, and one-time-use marker.
6. The order is recorded as delivered/completed with timestamp and verifier ID.

## Delivery QR option

- QR should contain only an opaque, short-lived token.
- It must not expose the customer's address, phone, payment details, or full order data.
- It should be invalid after successful delivery confirmation or expiration.
- A delivery QR should never be treated as proof that payment was received; GCash verification remains a separate staff action.

## Current implementation notes

- No SMS, email service, Storage bucket, or paid gateway is required.
- The code is generated when a delivery order is created and is only displayed while the order is `Out for Delivery`.
- A delivery cannot be marked `Completed` until Staff/Owner verifies the code.
- Firestore rules and the optional trusted callable backend enforce the verification marker.
- This is an in-app/manual handoff code, not an automatic SMS OTP. It should be upgraded to a server-only hashed token and rate-limited endpoint before high-volume production use.

## Acceptance criteria

- Pickup and delivery confirmation flows remain separate.
- An expired or already-used OTP/QR cannot complete an order.
- Staff/Owner role checks happen before verification is accepted.
- Customer can see confirmation status after a successful handoff.
- Failed attempts are rate-limited and written to the audit log.
