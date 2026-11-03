# Future feature: Delivery QR or OTP confirmation

## Goal

Provide an optional proof-of-delivery handoff for delivery orders. This is separate from the current Pickup Verification QR and is not enabled yet.

## Recommended default

Use a short, one-time delivery OTP as the primary method. It works on any phone and does not require the rider to install a scanner app. A delivery QR may be offered as an optional convenience.

## Proposed flow

1. Customer order reaches `Out for Delivery`.
2. The customer receives a delivery OTP in the order view.
3. Rider or Staff asks the customer for the OTP at handoff.
4. Staff enters the OTP in the protected order screen, or scans the optional delivery QR.
5. The system validates the order, expiry, and one-time-use marker.
6. The order is recorded as delivered/completed with timestamp and verifier ID.

## Delivery QR option

- QR should contain only an opaque, short-lived token.
- It must not expose the customer's address, phone, payment details, or full order data.
- It should be invalid after successful delivery confirmation or expiration.
- A delivery QR should never be treated as proof that payment was received; GCash verification remains a separate staff action.

## Acceptance criteria

- Pickup and delivery confirmation flows remain separate.
- An expired or already-used OTP/QR cannot complete an order.
- Staff/Owner role checks happen before order details are shown.
- Customer can see confirmation status after a successful handoff.
- Failed attempts are rate-limited and written to the audit log.
