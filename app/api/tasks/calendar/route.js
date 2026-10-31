import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { zonedDateTimeToUtc } from "@/lib/scheduling/time";
import { isValidTimeZone, ymdInTimeZone } from "@/lib/scheduling/time";
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
  buildInsuranceCalendarEntries,
  buildApplicationCalendarEntries,
  buildTourCalendarEntries,
} from "@/lib/calendar/planning-entries.js";
import { TOP_LEVEL_PARENT_FILTER } from "@/lib/subtasks/constants";
import Task from "@/models/Task";
import FinancialRecord from "@/models/FinancialRecord";
import InstallmentCommitment from "@/models/InstallmentCommitment";
import KametiPlan from "@/models/KametiPlan";
import Subscription from "@/models/Subscription";
import InsurancePolicy from "@/models/InsurancePolicy";
import UniversityApplication from "@/models/UniversityApplication";
import Tour from "@/models/Tour";

const calendarProjection = {
  title: 1,
  status: 1,
  priority: 1,
  taskDate: 1,
  orderPlacedDate: 1,
  expectedReceiveDate: 1,
  receivedDate: 1,
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

  const todayYmd = ymdInTimeZone(new Date(), timeZone);
  const todayStart = zonedDateTimeToUtc(todayYmd, "00:00", timeZone);
  const financialCalendarOr = [{ expectedDate: { $gte: rangeStart, $lte: rangeEnd } }];
  if (todayStart && todayStart >= rangeStart && todayStart <= rangeEnd) {
    financialCalendarOr.push({
      type: { $in: ["money_lent", "money_borrowed"] },
      expectedDate: { $lt: todayStart },
    });
  }

  const kametiCalendarOr = [
    { nextContributionDueDate: { $gte: rangeStart, $lte: rangeEnd } },
    { expectedPayoutDate: { $gte: rangeStart, $lte: rangeEnd } },
  ];
  if (todayStart && todayStart >= rangeStart && todayStart <= rangeEnd) {
    kametiCalendarOr.push({
      remainingContributionsOwed: { $gt: 0 },
      nextContributionDueDate: { $lt: todayStart },
    });
  }

  const planningCalendarOptions = {
    timeZone,
    todayYmd,
    monthFirstYmd: firstDay,
    monthLastYmd: lastDay,
  };

  const installmentCalendarOr = [{ nextDueDate: { $gte: rangeStart, $lte: rangeEnd } }];
  if (todayStart && todayStart >= rangeStart && todayStart <= rangeEnd) {
    installmentCalendarOr.push({
      status: { $nin: ["cancelled", "completed", "paused"] },
      $or: [{ outstandingBalance: { $gt: 0 } }, { openEnded: true }],
      nextDueDate: { $lt: todayStart },
    });
  }

  const subscriptionCalendarOr = [
    { nextBillingDate: { $gte: rangeStart, $lte: rangeEnd } },
  ];
  if (todayStart && todayStart >= rangeStart && todayStart <= rangeEnd) {
    subscriptionCalendarOr.push({
      status: "active",
      nextBillingDate: { $lt: todayStart },
    });
  }

  await connectDB();

  const [
    tasks,
    financialRecords,
    installments,
    kametiPlans,
    subscriptions,
    insurancePolicies,
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
              rangeOr("orderPlacedDate", rangeStart, rangeEnd),
              rangeOr("expectedReceiveDate", rangeStart, rangeEnd),
              rangeOr("receivedDate", rangeStart, rangeEnd),
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
        status: { $ne: "settled" },
        outstandingBalance: { $gt: 0 },
        $or: financialCalendarOr,
      },
      { type: 1, partyName: 1, expectedDate: 1, outstandingBalance: 1, status: 1 },
    ).lean(),
    InstallmentCommitment.find({
      status: { $nin: ["cancelled", "completed", "paused"] },
      $or: installmentCalendarOr,
    }).lean(),
    KametiPlan.find({
      status: { $nin: ["cancelled", "paused"] },
      $or: kametiCalendarOr,
    }).lean(),
    Subscription.find({
      status: "active",
      $or: subscriptionCalendarOr,
    }).lean(),
    InsurancePolicy.find({
      status: { $nin: ["cancelled", "completed"] },
      nextDueDate: { $gte: rangeStart, $lte: rangeEnd },
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
    indexEntriesByYmd(tasks, {
      monthFirstYmd: firstDay,
      monthLastYmd: lastDay,
    }),
    indexFinancialEntriesByYmd(financialRecords, {
      timeZone,
      todayYmd,
      monthFirstYmd: firstDay,
      monthLastYmd: lastDay,
    }),
    indexPlanningEntriesByYmd(
      installments,
      buildInstallmentCalendarEntries,
      planningCalendarOptions,
    ),
    indexPlanningEntriesByYmd(
      kametiPlans,
      buildKametiCalendarEntries,
      planningCalendarOptions,
    ),
    indexPlanningEntriesByYmd(
      subscriptions,
      buildSubscriptionCalendarEntries,
      planningCalendarOptions,
    ),
    indexPlanningEntriesByYmd(insurancePolicies, buildInsuranceCalendarEntries),
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
