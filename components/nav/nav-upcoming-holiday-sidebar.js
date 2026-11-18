"use client";

import { useUpcomingHolidays } from "@/contexts/holidays-context";
import { formatYmdLong } from "@/lib/format";

const COUNTRY_LABEL = {
  PK: "Pakistan",
  US: "United States",
};

function daysUntilLabel(todayYmd, dateYmd) {
  if (!todayYmd || !dateYmd) {
    return null;
  }
  const start = new Date(`${todayYmd}T12:00:00.000Z`).getTime();
  const end = new Date(`${dateYmd}T12:00:00.000Z`).getTime();
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  if (days > 0) {
    return `In ${days} days`;
  }
  return null;
}

export default function NavUpcomingHolidaySidebar() {
  const query = useUpcomingHolidays(1);
  const item = query.data?.holidays?.[0];
  const todayYmd = query.data?.todayYmd;

  if (query.isLoading) {
    return (
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Next holiday…
      </p>
    );
  }

  if (!item) {
    return (
      <p className="text-xs text-muted-foreground">
        No upcoming Pakistan (Islamic) or US holidays.
      </p>
    );
  }

  const when = daysUntilLabel(todayYmd, item.date);
  const name =
    item.localName && item.localName !== item.name
      ? `${item.localName} (${item.name})`
      : item.name;

  return (
    <div
      className="rounded-md border border-border bg-muted/40 p-2 text-xs"
      role="status"
      aria-label={`Next holiday: ${name}`}
    >
      <p className="font-medium text-foreground">Next holiday</p>
      <p className="mt-1 text-foreground">{name}</p>
      <p className="mt-0.5 text-muted-foreground">
        {COUNTRY_LABEL[item.countryCode] || item.countryCode} ·{" "}
        {formatYmdLong(item.date)}
        {when ? ` · ${when}` : ""}
      </p>
    </div>
  );
}
