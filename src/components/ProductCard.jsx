import Icon from "./Icon";
import { useCart } from "../context/CartContext";
import { useShop } from "../context/ShopContext";
import { peso } from "../utils/formatters";
export default function ProductCard({ product, onAdd, headingLevel = 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { items, addItem } = useCart();
  const { favorites, toggleFavorite, notify } = useShop();
  const quantity = items.find((item) => item.id === product.id)?.quantity || 0;
  const canOrder = product.available && product.stock > 0 && !product.archived;
  const full = quantity >= product.stock;
  const add = () => {
    if (onAdd) onAdd(product);
    else {
      addItem(product);
      notify(`${product.name} added to your cart.`);
    }
  };
  return (
    <article className="product-card">
      <div className="product-photo">
        <a
          href={`#product?id=${product.id}`}
          aria-label={`View ${product.name} from ${product.supplier}`}
        >
          <img
            className="product-image"
            src={product.image}
            alt={product.name}
            loading="lazy"
          />
        </a>
        <button
          className={`favorite-button ${favorites.includes(product.id) ? "selected" : ""}`}
          aria-label={`${favorites.includes(product.id) ? "Remove" : "Save"} ${product.name} favorite`}
          aria-pressed={favorites.includes(product.id)}
          onClick={() => toggleFavorite(product.id)}
        >
          <Icon
            name="heart"
            size={18}
            weight={favorites.includes(product.id) ? "fill" : "regular"}
          />
        </button>
      </div>
      <div className="product-details">
        <span className="product-supplier">{product.supplier}</span>
        <a href={`#product?id=${product.id}`}>
          <Heading className="product-name">{product.name}</Heading>
        </a>
        <div className="product-price-row">
          <strong>{peso.format(product.price)}</strong>
          <small
            className={
              canOrder
                ? product.stock <= 5
                  ? "low-stock"
                  : "in-stock"
                : "out-stock"
            }
          >
            {canOrder
              ? product.stock <= 5
                ? "Low stock"
                : "Available"
              : product.stock === 0
                ? "Out of stock"
                : "Unavailable"}
          </small>
        </div>
        <button
          type="button"
          className="add-button"
          disabled={!canOrder || full}
          onClick={add}
        >
          {!canOrder
            ? "Unavailable"
            : full
              ? "Stock limit reached"
              : "Add to Cart"}
          <Icon name={full ? "check" : "plus"} size={16} />
        </button>
      </div>
    </article>
  );
}
