/** Pin unpaid planning due dates to today (current or previous month, or any past due). */
export function previousCalendarMonthYm(todayYmd) {
  const ym = todayYmd?.slice(0, 7);
  if (!ym) {
    return null;
  }
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function planningDueCalendarYmd(dueYmd, todayYmd) {
  if (!dueYmd) {
    return null;
  }
  if (!todayYmd) {
    return dueYmd;
  }
  const dueYm = dueYmd.slice(0, 7);
  const todayYm = todayYmd.slice(0, 7);
  const prevYm = previousCalendarMonthYm(todayYmd);
  if (dueYm === todayYm || dueYm === prevYm || dueYmd <= todayYmd) {
    return todayYmd;
  }
  return dueYmd;
}

/** Installments/subscriptions: pin only when due on or before today, or still in the previous month. */
export function planningBillingDueCalendarYmd(dueYmd, todayYmd) {
  if (!dueYmd) {
    return null;
  }
  if (!todayYmd) {
    return dueYmd;
  }
  const dueYm = dueYmd.slice(0, 7);
  const prevYm = previousCalendarMonthYm(todayYmd);
  if (dueYmd <= todayYmd || dueYm === prevYm) {
    return todayYmd;
  }
  return dueYmd;
}

export function ymdMonthLabel(ymd) {
  if (!ymd) {
    return null;
  }
  const [y, m] = ymd.split("-").map(Number);
  if (!y || !m) {
    return null;
  }
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
