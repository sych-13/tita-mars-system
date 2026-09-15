import { readStorage, writeStorage } from "./storage";
export const ACCOUNT_KEY = "tita-mars-accounts-v1";
export const getAccounts = () => readStorage(ACCOUNT_KEY, []);
const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}
export async function saveAccount(data, id) {
  const accounts = getAccounts();
  const email = data.email.trim().toLowerCase();
  if (accounts.some((account) => account.email === email && account.id !== id))
    return { ok: false, error: "This email already has an account." };
  const previous = accounts.find((account) => account.id === id);
  if (!previous && (!data.password || data.password.length < 8))
    return { ok: false, error: "Use a password with at least 8 characters." };
  const salt = previous?.salt || crypto.randomUUID();
  const account = {
    id: id || crypto.randomUUID(),
    name: data.name.trim(),
    email,
    phone: data.phone || "",
    address: data.address || "",
    role: data.role || previous?.role || "customer",
    active: data.active ?? previous?.active ?? true,
    salt,
    passwordHash: data.password
      ? await hashPassword(data.password, salt)
      : previous.passwordHash,
    createdAt: previous?.createdAt || new Date().toISOString(),
  };
  writeStorage(
    ACCOUNT_KEY,
    previous
      ? accounts.map((item) => (item.id === id ? account : item))
      : [...accounts, account],
  );
  return { ok: true, account };
}
