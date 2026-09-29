export const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

const toDate = (value) => {
  if (value instanceof Date) return value;

  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (typeof value?.seconds === "number") {
    return new Date(
      value.seconds * 1000 + Number(value.nanoseconds || 0) / 1_000_000,
    );
  }

  if (typeof value !== "string" && typeof value !== "number") return null;
  return new Date(value);
};

export const toIsoDate = (value) => {
  const date = toDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

export const prettyDate = (value) => {
  const date = toDate(value);
  return date && !Number.isNaN(date.getTime())
    ? dateFormatter.format(date)
    : "Not available";
};

export const isActiveOrder = (status) =>
  !["Completed", "Cancelled"].includes(status);
