"use client";

import { useMemo } from "react";
import {
  formatCurrency,
  formatDate,
  formatAvailabilityHours,
  formatHm12,
} from "@/lib/format";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import {
  formStateFromSchedule,
  formatScheduleInstant,
  visitAvailabilityEnabledFromSchedule,
} from "@/lib/scheduling/client-form";
import { normalizeRecurrence } from "@/lib/recurrence/defaults";
import { calculateNextDueDate } from "@/lib/recurrence/calculate";
import {
  TASK_DECISION_STATUS_LABEL,
  TASK_INTENT_LABEL,
} from "@/lib/task-commerce/constants";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/constants";

const WEEKDAY_LABELS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function ViewSection({ title, children }) {
  if (!children) {
    return null;
  }
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function DetailGrid({ rows }) {
  const visible = rows.filter((row) => row.value);
  if (!visible.length) {
    return null;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((row) => (
        <div key={row.label} className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatTaskDate(task, timeZone) {
  const tz = timeZone || DEFAULT_SCHEDULE_TIMEZONE;
  if (task.taskDate) {
    return formatDate(task.taskDate, tz);
  }
  if (task.schedule?.scheduledStart) {
    return formatDate(task.schedule.scheduledStart, tz);
  }
  return null;
}

function recurrenceHasProcedureDetails(recurrence) {
  if (!recurrence?.enabled) {
    return false;
  }
  return Boolean(
    recurrence.procedureDetails?.trim() ||
    recurrence.procedureStatus === "decided" ||
    recurrence.nextAppointmentDate ||
    recurrence.lastProcedureDate,
  );
}

export default function TaskDetailView({ task }) {
  const scheduleView = useMemo(
    () => formStateFromSchedule(task.schedule),
    [task.schedule],
  );
  const displayTimeZone = scheduleView.timezone || DEFAULT_SCHEDULE_TIMEZONE;
  const visitEnabled = visitAvailabilityEnabledFromSchedule(task.schedule);

  const nextRecurrence = useMemo(() => {
    const normalized = normalizeRecurrence(task.recurrence);
    if (!normalized.enabled) {
      return null;
    }
    return calculateNextDueDate(normalized, scheduleView.timezone);
  }, [task.recurrence, scheduleView.timezone]);

  const categoryName =
    task.category?.name ||
    (typeof task.category === "string" ? task.category : null) ||
    UNASSIGNED_CATEGORY_NAME;

  const weekdaySummary = scheduleView.daysOfWeek
    .map((day) => WEEKDAY_LABELS[day] || day)
    .join(", ");

  const hasCommerceEstimate =
    task.intent && task.intent !== "none" && task.intent !== undefined;

  return (
    <div className="flex flex-col gap-5">
      <ViewSection title="Basics">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Title</p>
            <p className="text-sm font-medium">{task.title}</p>
          </div>
          {task.description ? (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </div>
          ) : null}
        </div>
      </ViewSection>

      <ViewSection title="Details & dates">
        <DetailGrid
          rows={[
            { label: "Status", value: task.status },
            { label: "Priority", value: task.priority },
            { label: "Category", value: categoryName },
            { label: "Task date", value: formatTaskDate(task, displayTimeZone) },
            {
              label: "Start time",
              value: scheduleView.scheduledStartTime
                ? `${formatHm12(scheduleView.scheduledStartTime)} (${displayTimeZone})`
                : null,
            },
            {
              label: "End time",
              value: scheduleView.scheduledEndTime
                ? `${formatHm12(scheduleView.scheduledEndTime)} (${displayTimeZone})`
                : null,
            },
            {
              label: "Timeline start",
              value: task.timelineStart ? formatDate(task.timelineStart) : null,
            },
            {
              label: "Timeline end",
              value: task.timelineEnd ? formatDate(task.timelineEnd) : null,
            },
          ]}
        />
        {task.schedule?.scheduledStart && !scheduleView.scheduledStartTime ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Scheduled:{" "}
            {formatScheduleInstant(task.schedule.scheduledStart, displayTimeZone)}
            {task.schedule.scheduledEnd
              ? ` – ${formatScheduleInstant(task.schedule.scheduledEnd, displayTimeZone)}`
              : null}
          </p>
        ) : null}
      </ViewSection>

      {task.amountSpent != null && task.amountSpent !== "" ? (
        <ViewSection title="Spending record">
          <DetailGrid
            rows={[
              {
                label: "Amount spent",
                value: formatCurrency(task.amountSpent, task.currency),
              },
            ]}
          />
        </ViewSection>
      ) : null}

      {hasCommerceEstimate ? (
        <ViewSection title="Purchase / sale estimate">
          <DetailGrid
            rows={[
              {
                label: "Intent",
                value: TASK_INTENT_LABEL[task.intent] || task.intent,
              },
              {
                label: "Decision",
                value:
                  TASK_DECISION_STATUS_LABEL[task.decisionStatus] ||
                  task.decisionStatus,
              },
              {
                label: "Estimated value",
                value:
                  task.estimatedValue != null
                    ? formatCurrency(task.estimatedValue, task.currency)
                    : null,
              },
              {
                label: "Actual value",
                value:
                  task.actualValue != null
                    ? formatCurrency(task.actualValue, task.currency)
                    : null,
              },
            ]}
          />
        </ViewSection>
      ) : null}

      {task.recurrence?.enabled ? (
        <ViewSection title="Recurrence">
          <DetailGrid
            rows={[
              {
                label: "Repeats",
                value: `Every ${task.recurrence.interval} ${task.recurrence.unit}`,
              },
              {
                label: "Last completed",
                value: task.recurrence.lastCompletedDate
                  ? formatDate(task.recurrence.lastCompletedDate)
                  : null,
              },
              {
                label: "Recurrence end",
                value: task.recurrence.endDate
                  ? formatDate(task.recurrence.endDate)
                  : null,
              },
              {
                label: "Next due",
                value: nextRecurrence?.nextDueDate
                  ? formatScheduleInstant(
                      nextRecurrence.nextDueDate,
                      scheduleView.timezone,
                    )
                  : null,
              },
              ...(recurrenceHasProcedureDetails(task.recurrence)
                ? [
                    {
                      label: "Last procedure / visit",
                      value: task.recurrence.lastProcedureDate
                        ? formatDate(task.recurrence.lastProcedureDate)
                        : null,
                    },
                    {
                      label: "Procedure status",
                      value: task.recurrence.procedureStatus || null,
                    },
                    {
                      label: "Next appointment",
                      value: task.recurrence.nextAppointmentDate
                        ? formatDate(task.recurrence.nextAppointmentDate)
                        : null,
                    },
                  ]
                : []),
            ]}
          />
          {task.recurrence.procedureDetails ? (
            <p className="mt-3 whitespace-pre-wrap text-sm">
              {task.recurrence.procedureDetails}
            </p>
          ) : null}
        </ViewSection>
      ) : null}

      {visitEnabled ? (
        <ViewSection title="Visit availability">
          <DetailGrid
            rows={[
              { label: "Allowed weekdays", value: weekdaySummary || null },
              ...(scheduleView.timeSlots?.length
                ? [
                    {
                      label: "Time slots",
                      value: scheduleView.timeSlots
                        .map(
                          (slot) =>
                            `${formatHm12(slot.startTime)} – ${formatHm12(slot.endTime)}`,
                        )
                        .join(", "),
                    },
                  ]
                : [
                    {
                      label: "Allowed hours",
                      value: formatAvailabilityHours(
                        scheduleView.startTime,
                        scheduleView.endTime,
                        displayTimeZone,
                      ),
                    },
                  ]),
              {
                label: "Exclude public holidays",
                value: scheduleView.excludePublicHolidays ? "Yes" : "No",
              },
              {
                label: "Avoid conflicts",
                value: scheduleView.avoidConflicts ? "Yes" : "No",
              },
            ]}
          />
        </ViewSection>
      ) : null}
    </div>
  );
}
