import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { firebaseAuth, storage } from "./firebase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const storageMessage = (error, fallback) => {
  const messages = {
    "storage/unauthorized":
      "Only the active owner account can upload product images.",
    "storage/bucket-not-found":
      "Firebase Storage is not active yet. Create the default bucket in Firebase Console first.",
    "storage/object-not-found": "The selected product image no longer exists.",
    "storage/retry-limit-exceeded":
      "The image upload timed out. Check your connection and try again.",
  };
  return messages[error?.code] || error?.message || fallback;
};

export function validateProductImage(file) {
  if (!file) return "Choose an image file.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES)
    return "Choose an image smaller than 5 MB.";
  return "";
}

export async function uploadProductImage(file, productId) {
  const validationError = validateProductImage(file);
  if (validationError) return { ok: false, error: validationError };
  if (!storage || !firebaseAuth?.currentUser)
    return {
      ok: false,
      error: "Sign in with the owner account before uploading an image.",
    };

  const safeProductId = String(productId || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-");
  if (!safeProductId)
    return { ok: false, error: "Enter the Product ID before uploading." };

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  const uniqueId =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const imageRef = ref(
    storage,
    `products/${safeProductId}/${uniqueId}.${extension}`,
  );

  try {
    const snapshot = await uploadBytes(imageRef, file, {
      cacheControl: "public,max-age=31536000,immutable",
      contentDisposition: "inline",
      contentType: file.type,
      customMetadata: {
        ownerId: firebaseAuth.currentUser.uid,
        productId: safeProductId,
      },
    });
    return {
      ok: true,
      url: await getDownloadURL(snapshot.ref),
      fullPath: snapshot.ref.fullPath,
    };
  } catch (error) {
    return {
      ok: false,
      error: storageMessage(error, "Unable to upload this product image."),
    };
  }
}

export async function deleteProductImage(imageUrl) {
  if (!storage || !imageUrl) return { ok: true, skipped: true };
  try {
    const imageRef = ref(storage, imageUrl);
    if (!imageRef.fullPath.startsWith("products/"))
      return { ok: true, skipped: true };
    await deleteObject(imageRef);
    return { ok: true };
  } catch (error) {
    if (error?.code === "storage/object-not-found") return { ok: true };
    return {
      ok: false,
      error: storageMessage(error, "Unable to remove the old product image."),
    };
  }
}
