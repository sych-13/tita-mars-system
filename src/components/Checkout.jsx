import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrdersContext";
import { useSession } from "../context/SessionContext";
import { useShop } from "../context/ShopContext";
import { useHashRoute } from "../hooks/useHashRoute";
import { peso } from "../utils/formatters";
import OrderStatusBadge from "./OrderStatusBadge";
import Icon from "./Icon";
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { orders, createOrder } = useOrders();
  const { user } = useSession();
  const { settings } = useShop();
  const { params, navigate } = useHashRoute();
  const [orderType, setOrderType] = useState("pickup");
  const [payment, setPayment] = useState("cash");
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    address: user?.address || "",
    area: "Taytay",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const confirmationRef = useRef(null);
  const order = orders.find(
    (o) =>
      o.id === params.order &&
      (!user || !o.customerId || o.customerId === user.id),
  );
  const deliveryFee =
    orderType === "delivery" ? Number(settings.deliveryFee) : 0;
  const grandTotal = total + deliveryFee;
  useEffect(() => {
    if (order) confirmationRef.current?.focus();
  }, [order?.id]);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (submitting.current || !items.length) return;
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      (orderType === "delivery" && !form.address.trim())
    ) {
      setError("Please complete your contact and delivery details.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    const result = createOrder({
      customerId: user?.id || null,
      customer: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: orderType === "delivery" ? form.address.trim() : "",
      deliveryArea: orderType === "delivery" ? form.area : "",
      notes: form.notes.trim(),
      orderType,
      payment,
      subtotal: total,
      deliveryFee,
      total: grandTotal,
      items: items.map(
        ({ id, name, supplier, category, image, price, quantity }) => ({
          id,
          name,
          supplier,
          category,
          image,
          price,
          quantity,
        }),
      ),
    });
    if (!result.ok) {
      setError(result.error);
      submitting.current = false;
      setBusy(false);
      return;
    }
    clearCart();
    navigate("checkout", { order: result.order.id });
  };
  if (order)
    return (
      <section className="checkout-section page-section">
        <div className="container">
          <div
            className="order-confirmation"
            ref={confirmationRef}
            tabIndex="-1"
            role="status"
          >
            <span className="confirmation-icon">
              <Icon name="check" size={35} />
            </span>
            <p className="eyebrow">Order received</p>
            <h1>Thank you, {order.customer.split(" ")[0]}!</h1>
            <p>
              Your order <strong>{order.number}</strong> is with Tita Mars.
              We’ll keep you updated every step of the way.
            </p>
            <OrderStatusBadge status={order.status} />
            <div className="confirmation-details">
              <span>
                <Icon
                  name={order.orderType === "pickup" ? "pickup" : "delivery"}
                  size={18}
                />
                {order.orderType === "pickup" ? "Pickup" : "Delivery"}
              </span>
              <span>{order.payment === "cash" ? "Cash" : "GCash"}</span>
              <strong>{peso.format(order.total)}</strong>
            </div>
            {order.payment === "gcash" && (
              <p>
                {settings.gcashNumber
                  ? `GCash: ${settings.gcashName} · ${settings.gcashNumber}. Your payment will be checked by the store.`
                  : "The store will provide GCash payment details when confirming your order."}
              </p>
            )}
            <div className="confirmation-actions">
              <a className="btn-brand" href={`#my-orders?order=${order.id}`}>
                Track my order <Icon name="arrow" size={16} />
              </a>
              <a className="btn-secondary" href="#home">
                Back to home
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  return (
    <section className="checkout-section page-section">
      <div className="container">
        <header className="checkout-heading">
          <div>
            <p className="eyebrow">Almost there</p>
            <h1>Checkout</h1>
            <p>A few details, and we’ll take it from here.</p>
          </div>
          <a href="#cart" className="text-link">
            <Icon name="back" size={15} />
            Back to cart
          </a>
        </header>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!items.length ? (
          <div className="empty-cart">
            <Icon name="cart" size={38} />
            <h2>Your cart is empty.</h2>
            <p>Find something delicious to get started.</p>
            <a className="btn-brand" href="#catalog">
              Browse Menu
            </a>
          </div>
        ) : (
          <form className="checkout-layout" onSubmit={submit}>
            <div className="checkout-form">
              <fieldset>
                <legend>
                  <span>1</span>Customer information
                </legend>
                <div className="form-grid">
                  <label>
                    Full name
                    <input
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={update}
                      required
                      minLength="2"
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={update}
                      required
                      pattern="[+0-9 ]{7,15}"
                      placeholder="09XX XXX XXXX"
                    />
                  </label>
                  <label className="full-width">
                    Email address (optional)
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={update}
                      placeholder="you@example.com"
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  <span>2</span>How would you like your order?
                </legend>
                <div className="order-type-options">
                  {[
                    ["pickup", "Pickup", "Collect from Tita Mars"],
                    ["delivery", "Delivery", "Within Taytay & Cainta"],
                  ].map(([value, label, copy]) => (
                    <label
                      key={value}
                      className={`select-card ${orderType === value ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="order-type"
                        value={value}
                        checked={orderType === value}
                        onChange={() => setOrderType(value)}
                      />
                      <Icon name={value} size={22} />
                      <span>
                        <strong>{label}</strong>
                        <small>{copy}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {orderType === "delivery" && (
                  <div className="delivery-fields">
                    <label>
                      Delivery area
                      <select name="area" value={form.area} onChange={update}>
                        <option>Taytay</option>
                        <option>Cainta</option>
                      </select>
                    </label>
                    <label>
                      Complete delivery address
                      <textarea
                        name="address"
                        required
                        rows="2"
                        value={form.address}
                        onChange={update}
                        autoComplete="street-address"
                        placeholder="House / unit, street, barangay"
                      />
                    </label>
                    <small>Delivery fee: {peso.format(deliveryFee)}</small>
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend>
                  <span>3</span>Payment method
                </legend>
                <div className="payment-options">
                  {[
                    [
                      "cash",
                      "cash",
                      "Cash",
                      orderType === "pickup"
                        ? "Pay on pickup"
                        : "Cash on delivery",
                    ],
                    ["gcash", "card", "GCash", "Pay with your mobile wallet"],
                  ].map(([value, icon, label, copy]) => (
                    <label
                      key={value}
                      className={payment === value ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === value}
                        onChange={() => setPayment(value)}
                      />
                      <Icon name={icon} size={22} />
                      <span>
                        <strong>{label}</strong>
                        <small>{copy}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {payment === "gcash" && (
                  <div className="gcash-info">
                    <strong>{settings.gcashName || "Pay with GCash"}</strong>
                    <p>
                      {settings.gcashNumber ||
                        "Payment details will be provided by the store when your order is confirmed."}
                    </p>
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend>
                  <span>4</span>Order notes <small>(optional)</small>
                </legend>
                <label>
                  <span className="visually-hidden">Order notes</span>
                  <textarea
                    name="notes"
                    rows="2"
                    value={form.notes}
                    onChange={update}
                    placeholder="Anything we should know?"
                  />
                </label>
              </fieldset>
            </div>
            <aside className="checkout-summary">
              <h2>Order Summary</h2>
              {items.map((item) => (
                <div className="checkout-summary-item" key={item.id}>
                  <img src={item.image} alt="" />
                  <span>
                    {item.quantity} × {item.name}
                    <small>{item.supplier}</small>
                  </span>
                  <strong>{peso.format(item.price * item.quantity)}</strong>
                </div>
              ))}
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{peso.format(total)}</span>
              </div>
              <div className="summary-row">
                <span>
                  {orderType === "pickup" ? "Pickup" : "Delivery fee"}
                </span>
                <span>
                  {orderType === "pickup" ? "Free" : peso.format(deliveryFee)}
                </span>
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <strong>{peso.format(grandTotal)}</strong>
              </div>
              <button className="btn-brand full-button" disabled={busy}>
                {busy ? "Placing your order…" : "Place Order"}
                <Icon name="arrow" size={18} />
              </button>
              <p>
                <Icon name="shield" size={16} />
                Your order is confirmed by the store before preparation.
              </p>
            </aside>
          </form>
        )}
      </div>
    </section>
  );
}
