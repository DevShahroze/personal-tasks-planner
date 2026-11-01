"use client";

import { useState } from "react";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import TaskMonthCalendar from "@/components/calendar/task-month-calendar";

/** Month grid for picking a date only — no task markers or calendar API. */
export default function SimpleYmdCalendar({
  selectedYmd,
  onSelectYmd,
  ariaLabel = "Choose date",
  validateYmd,
}) {
  const clientToday = useClientTodayYmd();
  const [view, setView] = useState(null);
  const [validationError, setValidationError] = useState("");

  const initialYmd = selectedYmd || clientToday?.ymd || "";
  const activeView =
    view ||
    (initialYmd && /^\d{4}-\d{2}-\d{2}$/.test(initialYmd)
      ? {
          year: Number(initialYmd.slice(0, 4)),
          month: Number(initialYmd.slice(5, 7)),
        }
      : clientToday
        ? { year: clientToday.year, month: clientToday.month }
        : null);

  if (!clientToday || !activeView) {
    return (
      <div
        className="h-40 max-w-xs rounded-md border border-border bg-muted/30"
        aria-hidden
      />
    );
  }

  return (
    <div className="max-w-xs">
      <TaskMonthCalendar
        compact
        year={activeView.year}
        month={activeView.month}
        onMonthChange={setView}
        selectedYmd={selectedYmd}
        onSelectYmd={(ymd) => {
          if (validateYmd) {
            const result = validateYmd(ymd);
            if (!result.ok) {
              setValidationError(result.message || "Date not allowed");
              return;
            }
          }
          setValidationError("");
          onSelectYmd(ymd);
        }}
        dayEntries={{}}
        todayYmd={clientToday.ymd}
        restrictionByYmd={{}}
        ariaLabel={ariaLabel}
      />
      {validationError ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
