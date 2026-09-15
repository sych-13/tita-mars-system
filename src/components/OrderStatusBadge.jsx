import Icon from "./Icon";
const statusIcons = {
  Pending: "pending",
  Confirmed: "completed",
  Preparing: "preparing",
  "Ready for Pickup": "pickup",
  "Out for Delivery": "delivery",
  Completed: "completed",
  Cancelled: "cancelled",
};
const tones = {
  Pending: "pending",
  Confirmed: "confirmed",
  Preparing: "preparing",
  "Ready for Pickup": "ready",
  "Out for Delivery": "delivery",
  Completed: "completed",
  Cancelled: "cancelled",
};
export default function OrderStatusBadge({ status }) {
  return (
    <span className={`status-badge ${tones[status] || "pending"}`}>
      <Icon name={statusIcons[status] || "pending"} size={14} weight="fill" />
      {status}
    </span>
  );
}
