"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TaskMonthCalendar from "@/components/calendar/task-month-calendar";
import { useTaskCalendarContext } from "@/contexts/task-calendar-context";
import { DATE_KIND_LABEL, CALENDAR_ENTRY_STATUS_LABEL } from "@/lib/calendar/constants";
import EmptyState from "@/components/ui/empty-state";
import { formatYmdLong } from "@/lib/format";
import { buildCalendarDayListRows } from "@/lib/calendar/day-list-rows";
import TaskStatusSelect from "@/components/tasks/task-status-select";
import { useUpdateTaskMutation } from "@/hooks/use-tasks";
import { buildTaskStatusPatch } from "@/lib/calendar/task-status-update";

function CalendarDayTaskRow({
  entry,
  indent,
  isParentHeader,
  pendingTaskId,
  onStatusChange,
}) {
  const href =
    entry.href ||
    (entry.taskId ? `/tasks/${entry.taskId}` : `/financial-records/${entry.recordId}`);
  const statusLabel = entry.status
    ? CALENDAR_ENTRY_STATUS_LABEL[entry.status] || entry.status.replace(/_/g, " ")
    : "";
  const showMeta = !isParentHeader && entry.kind !== "parentHeader";
  const canChangeStatus = Boolean(entry.taskId && showMeta);
  const displayStatus = entry.status || "To Do";

  return (
    <li className={`py-2 text-sm ${indent ? "pl-6" : ""}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={href}
          className="block min-w-0 flex-1 truncate font-medium hover:underline"
          title={entry.title}
        >
          {entry.title}
        </Link>
        {canChangeStatus ? (
          <div className="ml-auto w-32 shrink-0">
            <TaskStatusSelect
              value={displayStatus}
              pending={pendingTaskId === entry.taskId}
              stopPropagation
              className="!w-full h-8 text-xs"
              aria-label={`Status for ${entry.title}`}
              onChange={(status) => onStatusChange(entry, status)}
            />
          </div>
        ) : null}
      </div>
      {showMeta ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canChangeStatus ? null : statusLabel ? `${statusLabel} · ` : ""}
          {entry.detail || DATE_KIND_LABEL[entry.kind] || entry.kind}
          {entry.priority ? ` · ${entry.priority}` : ""}
          {entry.time ? ` · ${entry.time}` : ""}
        </p>
      ) : null}
    </li>
  );
}

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
  const updateTask = useUpdateTaskMutation();
  const [pendingTaskId, setPendingTaskId] = useState(null);

  const onStatusChange = async (entry, status) => {
    if (!entry.taskId) {
      return;
    }
    setPendingTaskId(entry.taskId);
    try {
      await updateTask.mutateAsync({
        id: entry.taskId,
        body: buildTaskStatusPatch(entry, status),
      });
    } catch {
      // API toast
    } finally {
      setPendingTaskId(null);
    }
  };

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
            {selectedDayRows.map(({ entry, indent, isParentHeader }) => (
              <CalendarDayTaskRow
                key={
                  entry.href
                    ? `${entry.href}-${entry.kind}`
                    : entry.taskId
                      ? `${entry.taskId}-${entry.kind}`
                      : `${entry.recordId}-${entry.kind}`
                }
                entry={entry}
                indent={indent}
                isParentHeader={isParentHeader}
                pendingTaskId={pendingTaskId}
                onStatusChange={onStatusChange}
              />
            ))}
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
