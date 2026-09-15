import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useShop } from "../context/ShopContext";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export default function Cart() {
  const { items, removeItem, setQuantity, total } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const { settings } = useShop();

  const changeQuantity = (item, requestedQuantity) => {
    const quantity = Math.min(requestedQuantity, item.stock);
    setQuantity(item.id, quantity);
    if (requestedQuantity < 1)
      setAnnouncement(`${item.name} was removed from your cart.`);
    else if (requestedQuantity > item.stock)
      setAnnouncement(
        `Only ${item.stock} ${item.name} item${item.stock === 1 ? "" : "s"} are available.`,
      );
    else setAnnouncement(`${item.name} quantity is now ${quantity}.`);
  };

  const remove = (item) => {
    removeItem(item.id);
    setAnnouncement(`${item.name} was removed from your cart.`);
  };

  return (
    <section className="cart-section page-section" id="cart">
      <div className="container">
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
        <div className="cart-heading">
          <div>
            <p className="eyebrow">Your order</p>
            <h1>Your cart</h1>
          </div>
          <a className="text-link" href="#catalog">
            Continue shopping <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
        {items.length === 0 ? (
          <div className="empty-cart">
            <i className="fa-solid fa-bag-shopping" />
            <h2>Your cart is waiting.</h2>
            <p>
              Add meals or bakery favorites from the approved menu to begin your
              order.
            </p>
            <a className="btn-brand" href="#catalog">
              Browse menu <i className="fa-solid fa-arrow-right" />
            </a>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="cart-item-info">
                    <span>{item.supplier}</span>
                    <h2>{item.name}</h2>
                    <strong>{peso.format(item.price)}</strong>
                  </div>
                  <div
                    className="quantity-control"
                    aria-label={`Quantity for ${item.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => changeQuantity(item, item.quantity - 1)}
                    >
                      <i className="fa-solid fa-minus" />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={item.quantity >= item.stock}
                      onClick={() => changeQuantity(item, item.quantity + 1)}
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>
                  <strong className="item-subtotal">
                    {peso.format(item.price * item.quantity)}
                  </strong>
                  <button
                    className="remove-item"
                    type="button"
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </article>
              ))}
            </div>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <div>
                <span>Subtotal</span>
                <strong>{peso.format(total)}</strong>
              </div>
              <div>
                <span>Delivery fee</span>
                <span>At checkout</span>
              </div>
              <div className="summary-total">
                <span>Pickup total</span>
                <strong>{peso.format(total)}</strong>
              </div>
              <a href="#checkout" className="btn-brand checkout-button">
                Proceed to checkout <i className="fa-solid fa-arrow-right" />
              </a>
              <p>
                <i className="fa-solid fa-circle-info" />
                Pickup is free. Delivery within Taytay &amp; Cainta adds{" "}
                {peso.format(settings.deliveryFee)} at checkout.
              </p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
