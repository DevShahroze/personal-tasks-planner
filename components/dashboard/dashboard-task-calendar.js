"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TaskMonthCalendar from "@/components/calendar/task-month-calendar";
import { useTaskCalendar } from "@/hooks/use-task-calendar";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { DATE_KIND_LABEL, CALENDAR_ENTRY_STATUS_LABEL } from "@/lib/calendar/constants";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import EmptyState from "@/components/ui/empty-state";
import { formatYmdLong } from "@/lib/format";
import { buildCalendarDayListRows } from "@/lib/calendar/day-list-rows";

export default function DashboardTaskCalendar() {
  const clientToday = useClientTodayYmd();
  const [view, setView] = useState(null);
  const [selectedYmd, setSelectedYmd] = useState("");

  const activeView =
    view || (clientToday ? { year: clientToday.year, month: clientToday.month } : null);

  const calendarQuery = useTaskCalendar(
    activeView?.year,
    activeView?.month,
    DEFAULT_SCHEDULE_TIMEZONE,
    Boolean(clientToday && activeView),
  );

  const todayYmd = clientToday?.ymd || "";
  const selected = selectedYmd || todayYmd;

  const selectedEntries = useMemo(() => {
    if (!selected) {
      return [];
    }
    return calendarQuery.data?.days?.[selected] || [];
  }, [calendarQuery.data?.days, selected]);

  const selectedDayRows = useMemo(
    () => buildCalendarDayListRows(selectedEntries),
    [selectedEntries],
  );

  if (!clientToday || !activeView) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel-header">Task calendar</div>
        <div
          className="dashboard-panel-body h-72 animate-pulse bg-muted/40"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">Task calendar</div>
      <div className="dashboard-panel-body grid gap-4 lg:grid-cols-2">
        <TaskMonthCalendar
          year={activeView.year}
          month={activeView.month}
          onMonthChange={setView}
          selectedYmd={selected}
          onSelectYmd={setSelectedYmd}
          dayEntries={calendarQuery.data?.days || {}}
          todayYmd={todayYmd}
        />

        <div>
          <h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">
            Items on {formatYmdLong(selected)}
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
    </div>
  );
}
