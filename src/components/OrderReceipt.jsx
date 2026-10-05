import { peso, prettyDate } from "../utils/formatters";
import Icon from "./Icon";
import Modal from "./Modal";

export default function OrderReceipt({ order, settings, onClose }) {
  if (!order) return null;
  return (
    <Modal title="Order Receipt" onClose={onClose} className="receipt-modal">
      <article className="order-receipt">
        <header>
          <div>
            <span className="eyebrow">Tita Mars Eatery & Bakery</span>
            <h2>Order receipt</h2>
          </div>
          <strong>{order.number}</strong>
        </header>
        <div className="receipt-meta">
          <span>Ordered: {prettyDate(order.createdAt)}</span>
          <span>Status: {order.status}</span>
          <span>
            Fulfillment: {order.orderType === "pickup" ? "Pickup" : "Delivery"}
          </span>
          {order.scheduledFor && (
            <span>Scheduled: {prettyDate(order.scheduledFor)}</span>
          )}
        </div>
        <section>
          <strong>{order.customer}</strong>
          <span>{order.phone}</span>
          {order.email && <span>{order.email}</span>}
          <span>
            {order.orderType === "delivery"
              ? `${order.address}${order.deliveryArea ? `, ${order.deliveryArea}` : ""}`
              : settings.address}
          </span>
        </section>
        <div className="receipt-items">
          {order.items.map((item) => (
            <div key={item.id}>
              <span>
                {item.quantity} × {item.name}
                <small>{item.supplier}</small>
              </span>
              <strong>{peso.format(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-totals">
          <span>
            Subtotal <b>{peso.format(order.subtotal)}</b>
          </span>
          <span>
            Delivery <b>{peso.format(order.deliveryFee || 0)}</b>
          </span>
          <strong>
            Total <b>{peso.format(order.total)}</b>
          </strong>
        </div>
        <footer>
          <span>
            Payment: {order.payment === "gcash" ? "GCash" : "Cash"} ·{" "}
            {order.paymentStatus}
          </span>
          {order.gcashReference && (
            <span>GCash reference: {order.gcashReference}</span>
          )}
          <small>{settings.name} · {settings.address}</small>
        </footer>
      </article>
      <button
        type="button"
        className="btn-brand full-button receipt-print-button"
        onClick={() => window.print()}
      >
        <Icon name="receipt" size={18} /> Print or Save as PDF
      </button>
    </Modal>
  );
}
