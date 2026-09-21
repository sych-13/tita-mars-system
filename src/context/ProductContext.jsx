import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { seedProducts } from "../data/products";
import { imageForProduct } from "../data/productImages";
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
    writeStorage(STORAGE_KEY, products);
  }, [products]);

  const updateProduct = useCallback(
    (id, changes) => {
      commitProducts((current) =>
        current.map((product) => {
          if (product.id !== id) return product;
          const resolvedChanges =
            typeof changes === "function" ? changes(product) : changes;
          const next = formatProduct({
            ...product,
            ...resolvedChanges,
            updatedAt: new Date().toISOString(),
          });
          if (next.stock === 0) next.available = false;
          return next;
        }),
      );
    },
    [commitProducts],
  );

  const addProduct = useCallback(
    (data) => {
      const id = data.id?.trim() || `TM-${Date.now().toString().slice(-6)}`;
      if (productsRef.current.some((product) => product.id === id))
        return { ok: false, error: "That Product ID is already in use." };
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (!product.name || !product.supplier)
        return { ok: false, error: "Product name and supplier are required." };
      commitProducts((current) => [...current, product]);
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
      if (product)
        updateProduct(id, { archived: false, available: product.stock > 0 });
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
            // Preserve a manual hidden/unavailable setting. Zero stock always disables ordering.
            available: stock > 0 ? product.available : false,
            updatedAt: timestamp,
          };
        }),
      );
      return { ok: true, deductedAt: timestamp };
    },
    [commitProducts, validateOrderItems],
  );

  const value = useMemo(
    () => ({
      products,
      lowStockLimit: LOW_STOCK_LIMIT,
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
