"use client";

import { useUpcomingHolidays } from "@/contexts/holidays-context";
import { formatYmdLong } from "@/lib/format";

const COUNTRY_SHORT = {
  PK: "PK",
  US: "US",
};

function daysUntilLabel(todayYmd, dateYmd) {
  if (!todayYmd || !dateYmd) {
    return null;
  }
  const start = new Date(`${todayYmd}T12:00:00.000Z`).getTime();
  const end = new Date(`${dateYmd}T12:00:00.000Z`).getTime();
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "tomorrow";
  }
  if (days > 0) {
    return `in ${days}d`;
  }
  return null;
}

function displayName(item) {
  const raw =
    item.localName && item.localName !== item.name ? item.localName : item.name;
  return raw.length > 28 ? `${raw.slice(0, 26)}…` : raw;
}

export default function NavUpcomingHoliday() {
  const query = useUpcomingHolidays(1);
  const item = query.data?.holidays?.[0];
  const todayYmd = query.data?.todayYmd;

  if (query.isLoading) {
    return (
      <NavHolidayChip ariaLabel="Loading next holiday">
        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
          Holiday
        </span>
        <span className="text-[0.6875rem] text-muted-foreground">…</span>
      </NavHolidayChip>
    );
  }

  if (!item) {
    return null;
  }

  const when = daysUntilLabel(todayYmd, item.date);
  const country = COUNTRY_SHORT[item.countryCode] || item.countryCode;
  const fullTitle = `${item.localName && item.localName !== item.name ? `${item.localName} (${item.name})` : item.name} · ${country} · ${formatYmdLong(item.date)}${when ? ` · ${when}` : ""}`;

  return (
    <NavHolidayChip title={fullTitle} ariaLabel={`Next holiday: ${fullTitle}`}>
      <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
        Holiday
      </span>
      <span className="truncate text-[0.6875rem] font-medium text-foreground">
        {displayName(item)}
      </span>
      <span className="shrink-0 text-[0.625rem] text-muted-foreground">
        {country}
        {when ? ` · ${when}` : ""}
      </span>
    </NavHolidayChip>
  );
}

function NavHolidayChip({ children, ariaLabel, title }) {
  return (
    <div
      className="hidden h-8 max-w-[min(100%,20rem)] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-border bg-muted/60 px-2 shadow-sm sm:inline-flex"
      title={title}
      aria-label={ariaLabel}
      role="status"
    >
      {children}
    </div>
  );
}
