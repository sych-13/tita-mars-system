# Future implementation roadmap

This roadmap does not change the current system. It records the recommended order for future work.

## Phase 1 — Scanner UX

- Add Staff/Owner **Scan pickup QR** entry point.
- Implement camera permission, scanner frame, cancel action, and manual order-number fallback.
- Keep the current protected route behavior while testing the UI.

## Phase 2 — Trusted pickup validation

- Add one-time pickup token creation and consumption through Cloud Functions.
- Move QR validation and handoff writes out of the browser.
- Add duplicate-scan, expired-token, and unauthorized-role tests.

## Phase 3 — Delivery confirmation

- Delivery OTP is implemented as a free in-app/manual handoff flow.
- Keep expiry, one-time-use, role checks, and audit logging tests as the flow evolves.
- Add optional delivery QR only if the business workflow needs it.
- Record verifier, time, and audit history without exposing customer data.

## Phase 4 — Production hardening

- Enable Firebase App Check where compatible.
- Add rate limiting and monitoring.
- Configure Cloud Functions and Storage only after Blaze billing approval.
- Add automated browser tests for mobile camera permissions and failure states.

## Phase 4 — Delivery pricing and customer experience

- Add optional map-pin selection and address validation.
- Show estimated distance and the proposed base fee plus ₱5 surcharge when the destination exceeds 2 km.
- Recalculate and store the final delivery fee in a trusted backend or protected transaction.
- Keep a manual address fallback and service-area validation for Taytay/Cainta.

## Phase 5 — Production hardening

- Enable Firebase App Check where compatible.
- Add rate limiting and monitoring.
- Configure Cloud Functions and Storage only after Blaze billing approval.
- Add automated browser tests for mobile camera permissions and failure states.

## Definition of done

- Pickup and delivery flows are clearly separated.
- Payment verification, pickup confirmation, and delivery confirmation are independent audit events.
- No QR or OTP can be reused after successful consumption.
- Role checks and server-side validation pass security-rule and integration tests.
