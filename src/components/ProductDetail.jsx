import { useState } from "react";
import { useProducts } from "../context/ProductContext";
import { useCart } from "../context/CartContext";
import { useShop } from "../context/ShopContext";
import { useHashRoute } from "../hooks/useHashRoute";
import { peso } from "../utils/formatters";
import Icon from "./Icon";
export default function ProductDetail() {
  const { params } = useHashRoute();
  const { products } = useProducts();
  const { addItem, items } = useCart();
  const { notify, favorites, toggleFavorite } = useShop();
  const [quantity, setQuantity] = useState(1);
  const product = products.find((p) => p.id === params.id && !p.archived);
  if (!product)
    return (
      <div className="container page-section">
        <h1>Product unavailable</h1>
        <a href="#catalog" className="text-link">
          Back to menu
        </a>
      </div>
    );
  const count = items.find((item) => item.id === product.id)?.quantity || 0;
  const limit = product.stock - count;
  const available = product.available && limit > 0;
  const add = () => {
    for (let i = 0; i < Math.min(quantity, limit); i++) addItem(product);
    notify(`${quantity} × ${product.name} added to your cart.`);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Product link copied.");
    } catch {
      notify("Copy the URL from the address bar to share this product.");
    }
  };
  return (
    <section className="container page-section">
      <div className="breadcrumb">
        <a href="#catalog">Menu</a>
        <Icon name="next" size={13} />
        <span>{product.name}</span>
      </div>
      <div className="product-detail-layout">
        <img src={product.image} alt={product.name} />
        <div className="product-detail-info">
          <p className="eyebrow">{product.supplier}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <strong className="detail-price">{peso.format(product.price)}</strong>
          <span
            className={
              available ? "stock-status available" : "stock-status out"
            }
          >
            {available ? `${product.stock} in stock` : "Unavailable"}
          </span>
          <div className="detail-actions">
            <div className="quantity-control">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
                aria-label="Decrease quantity"
              >
                <Icon name="minus" size={16} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                disabled={quantity >= limit}
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <button className="btn-brand" disabled={!available} onClick={add}>
              Add to Cart <Icon name="cart" size={18} />
            </button>
          </div>
          <div className="detail-links">
            <button
              className="btn-secondary"
              onClick={() => toggleFavorite(product.id)}
            >
              <Icon
                name="heart"
                weight={favorites.includes(product.id) ? "fill" : "regular"}
              />
              {favorites.includes(product.id) ? "Saved" : "Save favorite"}
            </button>
            <button
              className="icon-button"
              onClick={share}
              aria-label="Share product"
            >
              <Icon name="share" />
            </button>
          </div>
          <p className="detail-delivery">
            <Icon name="delivery" />
            Pickup or delivery within Taytay & Cainta
          </p>
          <small>Product ID: {product.id}</small>
        </div>
      </div>
    </section>
  );
}
