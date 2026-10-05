const MANILA_TIME_ZONE = "Asia/Manila";

const minutesFor = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const manilaParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

export const formatBusinessTime = (value) => {
  const minutes = minutesFor(value);
  if (minutes === null) return value || "";
  const date = new Date(2020, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const storeHoursLabel = (settings) => {
  if (!settings.orderingEnabled) return "Online ordering paused";
  if (settings.openingTime === settings.closingTime) return "Open 24 hours";
  return `${formatBusinessTime(settings.openingTime)} – ${formatBusinessTime(settings.closingTime)}`;
};

export const isStoreOpen = (settings, at = new Date()) => {
  if (!settings.orderingEnabled) return false;
  const opens = minutesFor(settings.openingTime);
  const closes = minutesFor(settings.closingTime);
  if (opens === null || closes === null || opens === closes) return true;
  const parts = manilaParts(at);
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  return opens < closes
    ? current >= opens && current < closes
    : current >= opens || current < closes;
};

export const validateOrderSchedule = (
  settings,
  fulfillmentTiming,
  scheduledFor,
  now = new Date(),
) => {
  if (!settings.orderingEnabled)
    return { ok: false, error: "Online ordering is currently paused." };
  if (fulfillmentTiming !== "scheduled") {
    if (!isStoreOpen(settings, now))
      return {
        ok: false,
        error: settings.allowScheduledOrders
          ? "The store is closed right now. Choose a scheduled pickup or delivery time."
          : `The store is currently closed. Ordering hours are ${storeHoursLabel(settings)}.`,
      };
    return { ok: true, scheduledFor: null };
  }
  if (!settings.allowScheduledOrders)
    return { ok: false, error: "Scheduled orders are not enabled." };
  const scheduled = new Date(scheduledFor);
  if (!scheduledFor || Number.isNaN(scheduled.getTime()))
    return { ok: false, error: "Choose a valid order date and time." };
  if (scheduled.getTime() < now.getTime() + 15 * 60 * 1000)
    return {
      ok: false,
      error: "Scheduled orders must be at least 15 minutes from now.",
    };
  const maxDays = Math.min(
    30,
    Math.max(1, Number(settings.maxScheduleDays) || 7),
  );
  if (scheduled.getTime() > now.getTime() + maxDays * 86400000)
    return {
      ok: false,
      error: `Choose a schedule within the next ${maxDays} days.`,
    };
  if (!isStoreOpen(settings, scheduled))
    return {
      ok: false,
      error: `Choose a time within store hours: ${storeHoursLabel(settings)}.`,
    };
  return { ok: true, scheduledFor: scheduled.toISOString() };
};

export const dateTimeLocalValue = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const scheduleInputBounds = (settings, now = new Date()) => {
  const minimum = new Date(now.getTime() + 15 * 60 * 1000);
  minimum.setMinutes(Math.ceil(minimum.getMinutes() / 15) * 15, 0, 0);
  const maximum = new Date(
    now.getTime() +
      Math.min(30, Math.max(1, Number(settings.maxScheduleDays) || 7)) *
        86400000,
  );
  const suggested = new Date(minimum);
  while (suggested <= maximum && !isStoreOpen(settings, suggested)) {
    suggested.setMinutes(suggested.getMinutes() + 15);
  }
  return {
    min: dateTimeLocalValue(minimum),
    max: dateTimeLocalValue(maximum),
    suggested: dateTimeLocalValue(
      suggested <= maximum ? suggested : minimum,
    ),
  };
};

export { MANILA_TIME_ZONE };
