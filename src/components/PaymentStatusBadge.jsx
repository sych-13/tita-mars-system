import Icon from "./Icon";

const details = {
  "Not Required": {
    className: "cash",
    icon: "cash",
    label: "Cash payment",
  },
  "Pending Verification": {
    className: "pending",
    icon: "clock",
    label: "Pending verification",
  },
  Verified: {
    className: "verified",
    icon: "completed",
    label: "Payment verified",
  },
};

export default function PaymentStatusBadge({ status = "Not Required" }) {
  const current = details[status] || details["Pending Verification"];
  return (
    <span className={`payment-status-badge ${current.className}`}>
      <Icon name={current.icon} size={14} weight="fill" />
      {current.label}
    </span>
  );
}
