import test from "node:test";
import assert from "node:assert/strict";
import {
  createDeliveryOtp,
  deliveryOtpExpiresAt,
  isDeliveryOtpExpired,
  isValidDeliveryOtp,
  normalizeDeliveryOtp,
} from "../src/utils/deliveryOtp.js";

test("delivery OTPs are six numeric digits", () => {
  const otp = createDeliveryOtp();
  assert.match(otp, /^\d{6}$/);
  assert.equal(isValidDeliveryOtp(otp), true);
});

test("delivery OTP input is normalized to six digits", () => {
  assert.equal(normalizeDeliveryOtp(" 12-34 56abc"), "123456");
  assert.equal(isValidDeliveryOtp("12345"), false);
});

test("delivery OTP expires after the verification window", () => {
  const now = Date.parse("2026-11-04T12:00:00.000Z");
  const expires = deliveryOtpExpiresAt(now);
  assert.equal(isDeliveryOtpExpired(expires, now + 29 * 60 * 1000), false);
  assert.equal(isDeliveryOtpExpired(expires, now + 30 * 60 * 1000), true);
});
