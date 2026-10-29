import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { zonedDateTimeToUtc } from "@/lib/scheduling/time";
import { isValidTimeZone } from "@/lib/scheduling/time";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants.js";
import { monthBounds } from "@/lib/calendar/constants.js";
import { indexEntriesByYmd } from "@/lib/calendar/task-entries.js";
import { indexFinancialEntriesByYmd } from "@/lib/calendar/financial-entries.js";
import {
  indexPlanningEntriesByYmd,
  mergeAllPlanningCalendarMaps,
  buildInstallmentCalendarEntries,
  buildKametiCalendarEntries,
  buildSubscriptionCalendarEntries,
  buildApplicationCalendarEntries,
  buildTourCalendarEntries,
} from "@/lib/calendar/planning-entries.js";
import { TOP_LEVEL_PARENT_FILTER } from "@/lib/subtasks/constants";
import Task from "@/models/Task";
import FinancialRecord from "@/models/FinancialRecord";
import InstallmentCommitment from "@/models/InstallmentCommitment";
import KametiPlan from "@/models/KametiPlan";
import Subscription from "@/models/Subscription";
import UniversityApplication from "@/models/UniversityApplication";
import Tour from "@/models/Tour";

const calendarProjection = {
  title: 1,
  status: 1,
  priority: 1,
  taskDate: 1,
  schedule: 1,
  recurrence: 1,
  parentTaskId: 1,
};

const rangeOr = (field, rangeStart, rangeEnd) => ({
  [field]: { $gte: rangeStart, $lte: rangeEnd },
});

function parseYearMonth(searchParams) {
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const ym = parseYearMonth(searchParams);
  if (!ym) {
    return jsonError("Invalid year or month", 400);
  }

  let timeZone = searchParams.get("timeZone") || DEFAULT_SCHEDULE_TIMEZONE;
  if (!isValidTimeZone(timeZone)) {
    return jsonError("Invalid timezone", 400);
  }

  const { firstDay, lastDay } = monthBounds(ym.year, ym.month);
  const rangeStart = zonedDateTimeToUtc(firstDay, "00:00", timeZone);
  const rangeEnd = zonedDateTimeToUtc(lastDay, "23:59", timeZone);
  if (!rangeStart || !rangeEnd) {
    return jsonError("Could not build calendar range", 400);
  }

  await connectDB();

  const [
    tasks,
    financialRecords,
    installments,
    kametiPlans,
    subscriptions,
    applications,
    tours,
  ] = await Promise.all([
    Task.find(
      {
        $and: [
          TOP_LEVEL_PARENT_FILTER,
          { status: { $ne: "Cancelled" } },
          {
            $or: [
              rangeOr("taskDate", rangeStart, rangeEnd),
              rangeOr("schedule.scheduledStart", rangeStart, rangeEnd),
              rangeOr("schedule.dueDate", rangeStart, rangeEnd),
              rangeOr("recurrence.nextDueDate", rangeStart, rangeEnd),
            ],
          },
        ],
      },
      calendarProjection,
    ).lean(),
    FinancialRecord.find(
      {
        expectedDate: { $gte: rangeStart, $lte: rangeEnd },
        status: { $ne: "settled" },
        outstandingBalance: { $gt: 0 },
      },
      { type: 1, partyName: 1, expectedDate: 1, outstandingBalance: 1, status: 1 },
    ).lean(),
    InstallmentCommitment.find({
      status: { $nin: ["cancelled", "completed"] },
      nextDueDate: { $gte: rangeStart, $lte: rangeEnd },
    }).lean(),
    KametiPlan.find({
      status: { $ne: "cancelled" },
      $or: [
        { nextContributionDueDate: { $gte: rangeStart, $lte: rangeEnd } },
        { expectedPayoutDate: { $gte: rangeStart, $lte: rangeEnd } },
      ],
    }).lean(),
    Subscription.find({
      status: { $in: ["active", "paused"] },
      nextBillingDate: { $gte: rangeStart, $lte: rangeEnd },
    }).lean(),
    UniversityApplication.find({
      applicationDeadline: { $gte: rangeStart, $lte: rangeEnd },
    }).lean(),
    Tour.find({
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart },
    }).lean(),
  ]);

  const days = mergeAllPlanningCalendarMaps(
    indexEntriesByYmd(tasks),
    indexFinancialEntriesByYmd(financialRecords),
    indexPlanningEntriesByYmd(installments, buildInstallmentCalendarEntries),
    indexPlanningEntriesByYmd(kametiPlans, buildKametiCalendarEntries),
    indexPlanningEntriesByYmd(subscriptions, buildSubscriptionCalendarEntries),
    indexPlanningEntriesByYmd(applications, buildApplicationCalendarEntries),
    indexPlanningEntriesByYmd(tours, buildTourCalendarEntries),
  );

  return jsonOk({
    year: ym.year,
    month: ym.month,
    timeZone,
    days,
  });
}
