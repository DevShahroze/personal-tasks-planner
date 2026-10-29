import {
  PRIORITY_MARKER_CLASS,
  PRIORITY_LABEL,
  DATE_KIND_LABEL,
  CALENDAR_MARKER_FINANCIAL,
} from "@/lib/calendar/constants";

export default function CalendarLegend() {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Legend</p>
      <ul className="flex flex-wrap gap-3">
        {Object.entries(PRIORITY_MARKER_CLASS).map(([priority, className]) => (
          <li key={priority} className="inline-flex items-center gap-1.5">
            <span className={`calendar-marker ${className}`} aria-hidden />
            <span>{PRIORITY_LABEL[priority]}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-3">
        {Object.entries(DATE_KIND_LABEL).map(([kind, label]) => (
          <li key={kind}>{label}</li>
        ))}
      </ul>
      <p className="inline-flex items-center gap-1.5">
        <span className={`calendar-marker ${CALENDAR_MARKER_FINANCIAL}`} aria-hidden />
        <span>Expected payment or receipt</span>
      </p>
    </div>
  );
}
