"use client";

import { useMemo } from "react";
import Link from "next/link";
import TaskMonthCalendar from "@/components/calendar/task-month-calendar";
import { useTaskCalendarContext } from "@/contexts/task-calendar-context";
import { DATE_KIND_LABEL, CALENDAR_ENTRY_STATUS_LABEL } from "@/lib/calendar/constants";
import EmptyState from "@/components/ui/empty-state";
import { formatYmdLong } from "@/lib/format";
import { buildCalendarDayListRows } from "@/lib/calendar/day-list-rows";

export default function TaskCalendarPanel({ variant = "dashboard" }) {
  const {
    clientToday,
    activeView,
    setView,
    selectedYmd,
    setSelectedYmd,
    todayYmd,
    dayEntries,
  } = useTaskCalendarContext();

  const selectedEntries = useMemo(() => {
    if (!selectedYmd) {
      return [];
    }
    return dayEntries[selectedYmd] || [];
  }, [dayEntries, selectedYmd]);

  const selectedDayRows = useMemo(
    () => buildCalendarDayListRows(selectedEntries),
    [selectedEntries],
  );

  if (!clientToday || !activeView) {
    const skeleton = (
      <div
        className={
          variant === "dashboard"
            ? "h-72 animate-pulse bg-muted/40"
            : "h-64 animate-pulse bg-muted/40 rounded-md"
        }
        aria-hidden
      />
    );
    if (variant === "dashboard") {
      return (
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">Task calendar</div>
          <div className="dashboard-panel-body">{skeleton}</div>
        </div>
      );
    }
    return skeleton;
  }

  const grid = (
    <div className="grid gap-4 lg:grid-cols-2">
      <TaskMonthCalendar
        year={activeView.year}
        month={activeView.month}
        onMonthChange={setView}
        selectedYmd={selectedYmd}
        onSelectYmd={setSelectedYmd}
        dayEntries={dayEntries}
        todayYmd={todayYmd}
      />

      <div>
        <h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">
          Items on {formatYmdLong(selectedYmd)}
        </h2>
        {!selectedEntries.length ? (
          <div className="mt-3">
            <EmptyState
              title="No tasks on this date"
              description="Create or schedule tasks to see them here."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {selectedDayRows.map(({ entry, indent, isParentHeader }) => {
              const href =
                entry.href ||
                (entry.taskId
                  ? `/tasks/${entry.taskId}`
                  : `/financial-records/${entry.recordId}`);
              const key = entry.href
                ? `${entry.href}-${entry.kind}`
                : entry.taskId
                  ? `${entry.taskId}-${entry.kind}`
                  : `${entry.recordId}-${entry.kind}`;
              const statusLabel = entry.status
                ? CALENDAR_ENTRY_STATUS_LABEL[entry.status] ||
                  entry.status.replace(/_/g, " ")
                : "";
              const showMeta = !isParentHeader && entry.kind !== "parentHeader";
              return (
                <li key={key} className={`py-2 text-sm ${indent ? "pl-6" : ""}`}>
                  <Link href={href} className="font-medium hover:underline">
                    {entry.title}
                  </Link>
                  {showMeta ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {statusLabel ? `${statusLabel} · ` : ""}
                      {entry.detail || DATE_KIND_LABEL[entry.kind] || entry.kind}
                      {entry.priority ? ` · ${entry.priority}` : ""}
                      {entry.time ? ` · ${entry.time}` : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  if (variant === "modal") {
    return grid;
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">Task calendar</div>
      <div className="dashboard-panel-body">{grid}</div>
    </div>
  );
}
