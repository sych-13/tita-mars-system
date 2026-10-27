import { useState } from "react";
import { useOrders } from "../context/OrdersContext";
import { useProducts } from "../context/ProductContext";
import { useSession } from "../context/SessionContext";
import { useShop } from "../context/ShopContext";
import { useHashRoute } from "../hooks/useHashRoute";
import { isActiveOrder, peso, prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import Modal from "./Modal";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import PickupVerificationQr from "./PickupVerificationQr";
import OrderReceipt from "./OrderReceipt";
import { OrderListSkeleton } from "./PageSkeleton";
export default function CustomerDashboard() {
  const { orders, isLoading, saveReview, submitPaymentDetails } = useOrders();
  const { products } = useProducts();
  const { user } = useSession();
  const { notify, settings } = useShop();
  const { params, navigate } = useHashRoute();
  const [filter, setFilter] = useState("All");
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    reference: "",
    senderName: "",
    paidAt: "",
    note: "",
  });
  const mine = orders.filter((o) =>
    user ? o.customerId === user.id || !o.customerId : !o.customerId,
  );
  const visible = mine.filter(
    (o) =>
      filter === "All" ||
      (filter === "Active"
        ? isActiveOrder(o.status)
        : o.status === "Completed"),
  );
  const active =
    mine.find((o) => o.id === params.order) ||
    mine.find((o) => isActiveOrder(o.status)) ||
    mine[0];
  const stages =
    active?.orderType === "delivery"
      ? ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Completed"]
      : ["Pending", "Confirmed", "Preparing", "Ready for Pickup", "Completed"];
  const submitReview = async (e) => {
    e.preventDefault();
    const result = await saveReview(review.id, { rating, comment });
    notify(result.ok ? "Thank you for your feedback!" : result.error);
    if (result.ok) setReview(null);
  };
  const openPayment = (order) => {
    setPaymentOrder(order);
    setPaymentForm({
      reference: order.gcashReference || "",
      senderName: order.gcashSenderName || "",
      paidAt: order.gcashPaidAt
        ? new Date(order.gcashPaidAt).toISOString().slice(0, 16)
        : "",
      note: order.gcashPaymentNote || "",
    });
  };
  const submitPayment = async (event) => {
    event.preventDefault();
    setPaymentBusy(true);
    const result = await submitPaymentDetails(paymentOrder.id, paymentForm);
    setPaymentBusy(false);
    notify(result.ok ? "GCash payment details submitted." : result.error);
    if (result.ok) setPaymentOrder(null);
  };
  const imageFor = (item) =>
    products.find((p) => p.id === item.id)?.image || item.image;
  return (
    <section className="container customer-dashboard-section">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Made for you</p>
          <h1>My Orders</h1>
          <p>Good food is on its way. Follow every step here.</p>
        </div>
        <a href="#catalog" className="btn-brand">
          Order again <Icon name="arrow" size={17} />
        </a>
      </header>
      <div className="order-filter-tabs">
        {["All", "Active", "Completed"].map((f) => (
          <button
            key={f}
            className={f === filter ? "selected" : ""}
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="customer-order-grid">
        <div>
          {isLoading ? <OrderListSkeleton /> : visible.map((o) => (
            <article className="simple-card order-history-card" key={o.id}>
              <div className="order-card-top">
                <div>
                  <strong>{o.number}</strong>
                  <small>
                    {prettyDate(o.createdAt)} ·{" "}
                    {o.orderType === "pickup" ? "Pickup" : "Delivery"}
                  </small>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              <div className="order-card-items">
                {o.items.slice(0, 4).map((item) => (
                  <img key={item.id} src={imageFor(item)} alt={item.name} />
                ))}
                <span>
                  {o.items.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>
              {o.payment === "gcash" && (
                <PaymentStatusBadge status={o.paymentStatus} />
              )}
              <div className="order-card-bottom">
                <strong>{peso.format(o.total)}</strong>
                <div>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate("my-orders", { order: o.id })}
                  >
                    View order
                  </button>
                  {o.status === "Completed" && !o.review && (
                    <button
                      className="btn-brand"
                      onClick={() => {
                        setReview(o);
                        setRating(5);
                        setComment("");
                      }}
                    >
                      Rate & Review
                    </button>
                  )}
                </div>
              </div>
              {o.review && (
                <p className="review-saved">
                  <Icon name="star" size={15} weight="fill" /> {o.review.rating}
                  /5 · {o.review.comment || "Thanks for your review!"}
                </p>
              )}
            </article>
          ))}
          {!isLoading && !visible.length && (
            <div className="simple-card dashboard-empty">
              <Icon name="orders" size={42} />
              <h2>
                No {filter === "All" ? "" : filter.toLowerCase() + " "}orders
                yet
              </h2>
              <p>Your next favorite meal is waiting on the menu.</p>
              <a className="btn-brand" href="#catalog">
                Browse Menu
              </a>
            </div>
          )}
        </div>
        <aside>
          {isLoading ? (
            <div className="simple-card tracking-card skeleton-tracking-card" aria-label="Loading order tracking" aria-busy="true">
              <span className="skeleton-block skeleton-line skeleton-line-title" />
              <span className="skeleton-block skeleton-line skeleton-line-medium" />
              <span className="skeleton-block skeleton-timeline" />
              <span className="skeleton-block skeleton-timeline" />
              <span className="skeleton-block skeleton-timeline" />
            </div>
          ) : active ? (
            <div className="simple-card tracking-card">
              <header className="table-toolbar">
                <h2>Track your order</h2>
                <Icon
                  name={active.orderType === "pickup" ? "pickup" : "delivery"}
                  size={22}
                />
              </header>
              <strong>{active.number}</strong>
              {active.payment === "gcash" && (
                <div className="tracking-payment-status">
                  <PaymentStatusBadge status={active.paymentStatus} />
                  {active.paymentStatus !== "Verified" && (
                    <small>
                      Tita Mars will confirm this after checking the GCash
                      transaction.
                    </small>
                  )}
                  {active.paymentStatus !== "Verified" && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openPayment(active)}
                    >
                      {active.gcashReference
                        ? "Update payment details"
                        : "Submit payment details"}
                    </button>
                  )}
                </div>
              )}
              {active.scheduledFor && (
                <p className="scheduled-order-note">
                  <Icon name="calendar" size={18} /> Scheduled for {prettyDate(active.scheduledFor)}
                </p>
              )}
              {active.status === "Cancelled" ? (
                <p>This order has been cancelled by the store.</p>
              ) : (
                <ol className="order-timeline">
                  {stages.map((status, i) => {
                    const history = [...(active.statusHistory || [])]
                      .reverse()
                      .find((entry) => entry.status === status);
                    const reached = i <= stages.indexOf(active.status);
                    return (
                      <li className={reached ? "reached" : ""} key={status}>
                        <Icon
                          name={reached ? "completed" : "pending"}
                          size={22}
                          weight="fill"
                        />
                        <span>
                          {status}
                          {history?.at && (
                            <small>
                              {prettyDate(history.at)}
                              {history.actorName ? ` · ${history.actorName}` : ""}
                            </small>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
              {active.orderType === "pickup" &&
                active.status === "Ready for Pickup" && (
                  <PickupVerificationQr order={active} />
                )}
              <div className="tracking-details">
                {active.items.map((item) => (
                  <div className="summary-row" key={item.id}>
                    <span>
                      {item.quantity} × {item.name}
                      <small style={{ display: "block" }}>
                        {item.supplier}
                      </small>
                    </span>
                    <strong>{peso.format(item.price * item.quantity)}</strong>
                  </div>
                ))}
                <div className="summary-row">
                  <span>Delivery</span>
                  <span>{peso.format(active.deliveryFee || 0)}</span>
                </div>
                <div className="checkout-total">
                  <span>Total</span>
                  <strong>{peso.format(active.total)}</strong>
                </div>
                <p>
                  <strong>
                    {active.payment === "cash" ? "Cash" : "GCash"}
                  </strong>{" "}
                  ·{" "}
                  {active.orderType === "pickup"
                    ? "Pickup at Tita Mars"
                    : active.address}
                </p>
                {active.notes && <p>Notes: {active.notes}</p>}
                <button
                  type="button"
                  className="btn-secondary full-button"
                  onClick={() => setReceiptOrder(active)}
                >
                  <Icon name="receipt" size={17} /> View printable receipt
                </button>
              </div>
            </div>
          ) : (
            <div className="simple-card">
              <h2>Always in the loop.</h2>
              <p>Your order progress will appear here once you check out.</p>
            </div>
          )}
        </aside>
      </div>
      {review && (
        <Modal title="Rate Your Order" onClose={() => setReview(null)}>
          <p>How was your order from Tita Mars?</p>
          <form onSubmit={submitReview}>
            <div className="review-stars" aria-label="Order rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  aria-label={`Rate ${star} stars`}
                  aria-pressed={rating === star}
                  onClick={() => setRating(star)}
                >
                  <Icon
                    name="star"
                    size={32}
                    weight={star <= rating ? "fill" : "regular"}
                  />
                </button>
              ))}
            </div>
            <label>
              Your review
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={600}
                rows="3"
                placeholder="Tell us what you enjoyed..."
              />
            </label>
            <button className="btn-brand full-button">Submit Review</button>
          </form>
        </Modal>
      )}
      {paymentOrder && (
        <Modal
          title="Submit GCash Payment"
          onClose={() => setPaymentOrder(null)}
        >
          <p>
            Enter the transaction details for <strong>{paymentOrder.number}</strong>.
            Tita Mars will verify them manually.
          </p>
          <form className="gcash-customer-form" onSubmit={submitPayment}>
            <label>
              GCash reference number
              <input
                inputMode="numeric"
                pattern="[0-9]{8,20}"
                maxLength="20"
                value={paymentForm.reference}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    reference: event.target.value.replace(/\D/g, ""),
                  })
                }
                required
                placeholder="8–20 digits"
              />
            </label>
            <label>
              Sender name
              <input
                value={paymentForm.senderName}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    senderName: event.target.value,
                  })
                }
                maxLength="120"
                required
              />
            </label>
            <label>
              Date and time paid
              <input
                type="datetime-local"
                value={paymentForm.paidAt}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, paidAt: event.target.value })
                }
                required
              />
            </label>
            <label>
              Note (optional)
              <textarea
                rows="2"
                maxLength="300"
                value={paymentForm.note}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, note: event.target.value })
                }
              />
            </label>
            <button className="btn-brand full-button" disabled={paymentBusy}>
              {paymentBusy ? "Submitting…" : "Submit for verification"}
            </button>
          </form>
        </Modal>
      )}
      {receiptOrder && (
        <OrderReceipt
          order={receiptOrder}
          settings={settings}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </section>
  );
}
