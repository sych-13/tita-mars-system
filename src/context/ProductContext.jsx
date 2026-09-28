import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { catalogCategories, seedProducts } from "../data/products";
import { imageForProduct } from "../data/productImages";
import { firebaseConfigured, firestore } from "../lib/firebase";
import { normalizeAssetUrl } from "../utils/assets";
import { summarizeOrderItems } from "../utils/orderFlow";
import { readStorage, writeStorage } from "../utils/storage";

const ProductContext = createContext();
const STORAGE_KEY = "tita-mars-products-v2";
const LOW_STOCK_LIMIT = 5;
const PRODUCT_CATEGORIES = catalogCategories.slice(1);
const PRODUCT_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;

const cloneSeedProducts = () => seedProducts.map((product) => ({ ...product }));
const formatProduct = (product) => {
  const stock = Math.max(0, Number(product.stock) || 0);
  return {
    ...product,
    image: product.image?.includes("images.unsplash.com/")
      ? imageForProduct(product.id) || product.image
      : normalizeAssetUrl(product.image),
    price: Math.max(0, Number(product.price) || 0),
    stock,
    available: stock > 0 && product.available !== false,
    archived: Boolean(product.archived),
  };
};

const getInitialProducts = () => {
  const stored = readStorage(STORAGE_KEY, null);
  return Array.isArray(stored) && stored.length
    ? stored.map(formatProduct)
    : cloneSeedProducts();
};

const productError = (error, fallback) =>
  error?.code === "permission-denied" ||
  error?.code === "firestore/permission-denied"
    ? "Your account does not have permission to change products."
    : fallback;

const validateProduct = (product) => {
  if (!PRODUCT_ID_PATTERN.test(product.id || ""))
    return "Use 2–40 letters, numbers, hyphens, or underscores for the Product ID.";
  if (!product.name?.trim()) return "Product name is required.";
  if (!PRODUCT_CATEGORIES.includes(product.category))
    return "Choose a valid product category.";
  if (product.supplier !== product.category)
    return "The supplier must match the selected product category.";
  if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0)
    return "Enter a valid non-negative price.";
  if (!Number.isSafeInteger(Number(product.stock)) || Number(product.stock) < 0)
    return "Stock quantity must be a non-negative whole number.";
  if (firebaseConfigured && product.image?.startsWith("data:"))
    return "Paste a hosted image URL for now. Firebase Storage upload is not configured yet.";
  return "";
};

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(getInitialProducts);
  const productsRef = useRef(products);

  const commitProducts = useCallback((updater) => {
    const current = productsRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    productsRef.current = next;
    setProducts(next);
    return next;
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (!firebaseConfigured || !firestore) return undefined;
    return onSnapshot(
      collection(firestore, "products"),
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => formatProduct({ id: item.id, ...item.data() }))
          .sort((a, b) => a.id.localeCompare(b.id));
        commitProducts(next);
      },
      () => commitProducts([]),
    );
  }, [commitProducts]);

  useEffect(() => {
    if (!firebaseConfigured) writeStorage(STORAGE_KEY, products);
  }, [products]);

  const updateProduct = useCallback(
    async (id, changes) => {
      const current = productsRef.current.find((product) => product.id === id);
      if (!current) return { ok: false, error: "Product not found." };
      const resolvedChanges =
        typeof changes === "function" ? changes(current) : changes;
      const candidate = {
        ...current,
        ...resolvedChanges,
        id: current.id,
        name: (resolvedChanges.name ?? current.name)?.trim(),
        supplier: resolvedChanges.category ?? current.category,
        description:
          (resolvedChanges.description ?? current.description)?.trim().slice(0, 600) ||
          "Available from Tita Mars.",
        updatedAt: new Date().toISOString(),
      };
      const validationError = validateProduct(candidate);
      if (validationError) return { ok: false, error: validationError };
      const next = formatProduct(candidate);
      if (next.stock === 0) next.available = false;

      if (firebaseConfigured && firestore) {
        try {
          await updateDoc(doc(firestore, "products", id), next);
          return { ok: true, product: next };
        } catch (error) {
          return { ok: false, error: productError(error, "Unable to update this product.") };
        }
      }

      commitProducts((items) =>
        items.map((product) => (product.id === id ? next : product)),
      );
      return { ok: true, product: next };
    },
    [commitProducts],
  );

  const addProduct = useCallback(
    async (data) => {
      const id =
        data.id?.trim().toUpperCase() || `TM-${Date.now().toString().slice(-6)}`;
      if (productsRef.current.some((product) => product.id === id))
        return { ok: false, error: "That Product ID is already in use." };
      const timestamp = new Date().toISOString();
      const candidate = {
        id,
        name: data.name?.trim(),
        category: data.category,
        supplier: data.category,
        price: Number(data.price),
        stock: Number(data.stock),
        available: data.available !== false,
        archived: false,
        image: data.image?.trim() || seedProducts[0].image,
        description:
          data.description?.trim().slice(0, 600) || "Available from Tita Mars.",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const validationError = validateProduct(candidate);
      if (validationError) return { ok: false, error: validationError };
      const product = formatProduct(candidate);

      if (firebaseConfigured && firestore) {
        try {
          await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, "products", id);
            const snapshot = await transaction.get(productRef);
            if (snapshot.exists())
              throw new Error("That Product ID is already in use.");
            transaction.set(productRef, product);
          });
          return { ok: true, product };
        } catch (error) {
          return {
            ok: false,
            error:
              error?.message === "That Product ID is already in use."
                ? error.message
                : productError(error, "Unable to add this product."),
          };
        }
      }

      commitProducts((items) => [...items, product]);
      return { ok: true, product };
    },
    [commitProducts],
  );

  const archiveProduct = useCallback(
    (id) => updateProduct(id, { archived: true, available: false }),
    [updateProduct],
  );
  const restoreProduct = useCallback(
    (id) => {
      const product = productsRef.current.find((item) => item.id === id);
      return product
        ? updateProduct(id, { archived: false, available: product.stock > 0 })
        : Promise.resolve({ ok: false, error: "Product not found." });
    },
    [updateProduct],
  );

  const validateOrderItems = useCallback((items) => {
    const summary = summarizeOrderItems(items);
    if (!summary.ok)
      return {
        ok: false,
        error:
          Array.isArray(items) && items.length
            ? "Your cart contains an invalid item quantity."
            : "Your cart is empty.",
      };
    const invalidItem = [...summary.quantities].find(([id, quantity]) => {
      const product = productsRef.current.find((item) => item.id === id);
      return (
        !product ||
        product.archived ||
        !product.available ||
        product.stock < quantity
      );
    });
    if (invalidItem)
      return {
        ok: false,
        error:
          "One or more items are no longer available in the requested quantity. Please review your cart.",
      };
    return { ok: true, required: summary.quantities };
  }, []);

  const deductInventory = useCallback(
    (items) => {
      if (firebaseConfigured)
        return {
          ok: false,
          error: "Inventory is recorded with the order transaction.",
        };
      const summary = summarizeOrderItems(items);
      if (!summary.ok)
        return { ok: false, error: "This order has no items to deduct." };
      const invalidItem = [...summary.quantities].find(([id, quantity]) => {
        const product = productsRef.current.find((item) => item.id === id);
        return (
          !product ||
          product.stock < quantity
        );
      });
      if (invalidItem)
        return {
          ok: false,
          error:
            "A product no longer has enough finished-product stock to complete this order.",
        };
      const timestamp = new Date().toISOString();
      commitProducts((current) =>
        current.map((product) => {
          const quantity = summary.quantities.get(product.id) || 0;
          if (!quantity) return product;
          const stock = product.stock - quantity;
          return {
            ...product,
            stock,
            available: stock > 0 ? product.available : false,
            updatedAt: timestamp,
          };
        }),
      );
      return { ok: true, deductedAt: timestamp };
    },
    [commitProducts],
  );

  const value = useMemo(
    () => ({
      products,
      lowStockLimit: LOW_STOCK_LIMIT,
      usingFirebase: firebaseConfigured,
      updateProduct,
      addProduct,
      archiveProduct,
      restoreProduct,
      validateOrderItems,
      deductInventory,
    }),
    [
      addProduct,
      archiveProduct,
      deductInventory,
      products,
      restoreProduct,
      updateProduct,
      validateOrderItems,
    ],
  );
  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

export const useProducts = () => useContext(ProductContext);
