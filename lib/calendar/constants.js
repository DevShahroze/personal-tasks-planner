export const PRIORITY_MARKER_CLASS = {
  Low: "calendar-marker-low",
  Medium: "calendar-marker-medium",
  High: "calendar-marker-high",
  Urgent: "calendar-marker-urgent",
};

export const PRIORITY_LABEL = {
  Low: "Low priority",
  Medium: "Medium priority",
  High: "High priority",
  Urgent: "Urgent priority",
};

export const DATE_KIND_LABEL = {
  taskDate: "Task date",
  scheduled: "Scheduled",
  deadline: "Deadline",
  recurringDue: "Recurring due",
  orderPlaced: "Order placed",
  expectedReceive: "Expected receive",
  orderReceived: "Received",
  subtask: "Subtask",
  financialExpected: "Expected payment/receipt",
  installmentDue: "Installment due",
  kametiContributionDue: "Kameti contribution due",
  kametiPayoutExpected: "Expected Kameti payout",
  subscriptionBilling: "Subscription billing",
  insurancePremiumDue: "Insurance premium due",
  applicationDeadline: "Application deadline",
  tourStart: "Tour starts",
  tourEnd: "Tour ends",
  tourDay: "Tour day",
};

/** Shown on calendar day lists — omit internal plan statuses (active, payout_received, …). */
export const CALENDAR_ENTRY_STATUS_LABEL = {
  overdue: "Overdue",
};

export const CALENDAR_MARKER_FINANCIAL = "calendar-marker-financial";

export const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function monthBounds(year, month) {
  const firstDay = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  return { firstDay, lastDay, daysInMonth };
}

export function buildMonthCells(year, month) {
  const { daysInMonth } = monthBounds(year, month);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayBased = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells = [];

  for (let i = 0; i < mondayBased; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const ymd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(ymd);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function shiftMonth(year, month, delta) {
  let y = year;
  let m = month + delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}
