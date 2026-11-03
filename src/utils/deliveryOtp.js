const OTP_LENGTH = 6;
const OTP_WINDOW_MS = 30 * 60 * 1000;

export const createDeliveryOtp = () => {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return String(100000 + (values[0] % 900000));
  }
  return String(100000 + Math.floor(Math.random() * 900000));
};

export const deliveryOtpExpiresAt = (now = Date.now()) =>
  new Date(now + OTP_WINDOW_MS).toISOString();

export const normalizeDeliveryOtp = (value) =>
  String(value || "").replace(/\D/g, "").slice(0, OTP_LENGTH);

export const isValidDeliveryOtp = (value) =>
  /^\d{6}$/.test(normalizeDeliveryOtp(value));

export const isDeliveryOtpExpired = (expiresAt, now = Date.now()) => {
  const expiry = new Date(expiresAt || 0).getTime();
  return !Number.isFinite(expiry) || expiry <= now;
};

export const DELIVERY_OTP_WINDOW_MINUTES = OTP_WINDOW_MS / 60000;
