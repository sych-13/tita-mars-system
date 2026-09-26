import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { seedProducts } from "../data/products";
import { imageForProduct } from "../data/productImages";
import { firebaseConfigured, firestore } from "../lib/firebase";
import { normalizeAssetUrl } from "../utils/assets";
import { readStorage, writeStorage } from "../utils/storage";

const ProductContext = createContext();
const STORAGE_KEY = "tita-mars-products-v2";
const LOW_STOCK_LIMIT = 5;

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
    return onSnapshot(collection(firestore, "products"), (snapshot) => {
        const next = snapshot.docs
          .map((item) => formatProduct({ id: item.id, ...item.data() }))
          .sort((a, b) => a.id.localeCompare(b.id));
        if (next.length) commitProducts(next);
      });
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
      const next = formatProduct({
        ...current,
        ...resolvedChanges,
        updatedAt: new Date().toISOString(),
      });
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
      const id = data.id?.trim() || `TM-${Date.now().toString().slice(-6)}`;
      if (productsRef.current.some((product) => product.id === id))
        return { ok: false, error: "That Product ID is already in use." };
      const timestamp = new Date().toISOString();
      const product = formatProduct({
        id,
        name: data.name?.trim(),
        category: data.category,
        supplier: data.supplier?.trim(),
        price: Math.max(0, Number(data.price) || 0),
        stock: Math.max(0, Number(data.stock) || 0),
        available: data.available !== false,
        archived: false,
        image: data.image?.trim() || seedProducts[0].image,
        description: data.description?.trim() || "Available from Tita Mars.",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (!product.name || !product.supplier)
        return { ok: false, error: "Product name and supplier are required." };
      if (firebaseConfigured && product.image.startsWith("data:"))
        return {
          ok: false,
          error:
            "Image file uploads need Firebase Storage. Use an image URL for now.",
        };

      if (firebaseConfigured && firestore) {
        try {
          await setDoc(doc(firestore, "products", id), product);
          return { ok: true, product };
        } catch (error) {
          return { ok: false, error: productError(error, "Unable to add this product.") };
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
    if (!Array.isArray(items) || !items.length)
      return { ok: false, error: "Your cart is empty." };
    const required = items.reduce(
      (all, item) => ({
        ...all,
        [item.id]: (all[item.id] || 0) + Number(item.quantity || 0),
      }),
      {},
    );
    const invalidItem = Object.entries(required).find(([id, quantity]) => {
      const product = productsRef.current.find((item) => item.id === id);
      return (
        !Number.isFinite(quantity) ||
        quantity < 1 ||
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
    return { ok: true, required };
  }, []);

  const deductInventory = useCallback(
    (items) => {
      if (firebaseConfigured)
        return {
          ok: false,
          error: "Inventory is recorded with the order transaction.",
        };
      if (!Array.isArray(items) || !items.length)
        return { ok: false, error: "This order has no items to deduct." };
      const required = items.reduce(
        (all, item) => ({
          ...all,
          [item.id]: (all[item.id] || 0) + Number(item.quantity || 0),
        }),
        {},
      );
      const invalidItem = Object.entries(required).find(([id, quantity]) => {
        const product = productsRef.current.find((item) => item.id === id);
        return (
          !Number.isFinite(quantity) ||
          quantity < 1 ||
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
          const quantity = required[product.id] || 0;
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
