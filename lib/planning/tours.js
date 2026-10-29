import { roundMoney } from "../finance/balance.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { inclusiveDurationDays } from "../schedules/frequency.js";

export function sumTourExpenses(expenses) {
  return roundMoney(
    (expenses || []).reduce((total, item) => total + roundMoney(item.amount), 0),
  );
}

export function syncTour(doc) {
  doc.actualTotalExpenses = sumTourExpenses(doc.expenses);
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const startYmd = dateToYmd(doc.startDate, timeZone);
  const endYmd = dateToYmd(doc.endDate, timeZone);
  doc.durationDays = inclusiveDurationDays(startYmd, endYmd);
  return doc;
}
