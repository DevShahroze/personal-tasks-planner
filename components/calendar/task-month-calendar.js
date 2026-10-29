"use client";

import {
  WEEKDAY_HEADERS,
  buildMonthCells,
  shiftMonth,
  PRIORITY_MARKER_CLASS,
  PRIORITY_LABEL,
  CALENDAR_MARKER_FINANCIAL,
} from "@/lib/calendar/constants";
import { uniqueDayMarkers } from "@/lib/calendar/task-entries";
import Button from "@/components/ui/button";
import CalendarLegend from "@/components/calendar/calendar-legend";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function TaskMonthCalendar({
  year,
  month,
  onMonthChange,
  selectedYmd,
  onSelectYmd,
  dayEntries = {},
  todayYmd,
  compact = false,
  restrictionByYmd = {},
  ariaLabel = "Task calendar",
}) {
  const cells = buildMonthCells(year, month);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(year, month, -1))}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(year, month, 1))}
          >
            ›
          </Button>
          <p className="text-sm font-medium" aria-live="polite">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        {todayYmd ? (
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={() => {
              const [y, m] = todayYmd.split("-").map(Number);
              onMonthChange({ year: y, month: m });
              onSelectYmd?.(todayYmd);
            }}
          >
            Today
          </Button>
        ) : null}
      </div>

      <div
        className="rounded-md border border-border p-2"
        role="grid"
        aria-label={ariaLabel}
      >
        <div className="grid grid-cols-7 gap-1 text-center text-[0.625rem] font-medium text-muted-foreground">
          {WEEKDAY_HEADERS.map((label) => (
            <div key={label} role="columnheader">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((ymd, index) => {
            if (!ymd) {
              return <div key={`empty-${index}`} className="h-9" aria-hidden />;
            }

            const entries = dayEntries[ymd] || [];
            const markers = uniqueDayMarkers(entries);
            const selected = selectedYmd === ymd;
            const isToday = todayYmd === ymd;
            const restriction = restrictionByYmd[ymd];

            return (
              <button
                key={ymd}
                type="button"
                role="gridcell"
                aria-label={`${ymd}${entries.length ? `, ${entries.length} items` : ""}`}
                aria-selected={selected}
                onClick={() => onSelectYmd?.(ymd)}
                className={`relative flex h-9 flex-col items-center justify-start rounded border px-0.5 pt-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? "border-ring bg-accent text-accent-foreground"
                    : "border-transparent hover:border-border hover:bg-muted"
                } ${isToday ? "font-semibold underline decoration-primary decoration-2 underline-offset-2" : ""}`}
              >
                <span>{Number(ymd.slice(-2))}</span>
                <span className="mt-0.5 flex max-w-full flex-wrap justify-center gap-0.5">
                  {markers.map((marker, markerIndex) => (
                    <span
                      key={`${ymd}-marker-${markerIndex}`}
                      className={`calendar-marker ${
                        marker.financial
                          ? CALENDAR_MARKER_FINANCIAL
                          : PRIORITY_MARKER_CLASS[marker.priority] ||
                            "calendar-marker-medium"
                      }`}
                      title={
                        marker.financial
                          ? "Expected payment or receipt"
                          : `${PRIORITY_LABEL[marker.priority] || marker.priority} task activity`
                      }
                      aria-hidden
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!compact ? <CalendarLegend /> : null}

      {selectedYmd && restrictionByYmd[selectedYmd] ? (
        <p className="text-xs text-destructive" role="alert">
          {restrictionByYmd[selectedYmd]}
        </p>
      ) : null}
    </div>
  );
}
