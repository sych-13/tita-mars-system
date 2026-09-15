import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProducts } from "./ProductContext";
import { readStorage, writeStorage } from "../utils/storage";

const CartContext = createContext();
const STORAGE_KEY = "tita-mars-cart";

export function CartProvider({ children }) {
  const { products } = useProducts();
  const [items, setItems] = useState(() => readStorage(STORAGE_KEY, []));

  useEffect(() => writeStorage(STORAGE_KEY, items), [items]);
  useEffect(() => {
    setItems((current) =>
      current.flatMap((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        if (
          !product ||
          product.archived ||
          !product.available ||
          product.stock < 1
        )
          return [];
        return [
          { ...product, quantity: Math.min(item.quantity, product.stock) },
        ];
      }),
    );
  }, [products]);

  const addItem = (product) =>
    setItems((current) => {
      const liveProduct = products.find(
        (candidate) => candidate.id === product.id,
      );
      if (
        !liveProduct ||
        liveProduct.archived ||
        !liveProduct.available ||
        liveProduct.stock < 1
      )
        return current;
      const existing = current.find((item) => item.id === liveProduct.id);
      if (existing)
        return current.map((item) =>
          item.id === liveProduct.id
            ? {
                ...liveProduct,
                quantity: Math.min(item.quantity + 1, liveProduct.stock),
              }
            : item,
        );
      return [...current, { ...liveProduct, quantity: 1 }];
    });

  const setQuantity = (id, quantity) =>
    setItems((current) => {
      const product = products.find((candidate) => candidate.id === id);
      if (!product || quantity < 1)
        return current.filter((item) => item.id !== id);
      return current.map((item) =>
        item.id === id
          ? { ...product, quantity: Math.min(quantity, product.stock) }
          : item,
      );
    });

  const removeItem = (id) =>
    setItems((current) => current.filter((item) => item.id !== id));
  const clearCart = () => setItems([]);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const value = useMemo(
    () => ({
      items,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      total,
    }),
    [items, itemCount, total],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
