"use client";

import { useUpcomingHolidays } from "@/contexts/holidays-context";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDate, formatYmdLong } from "@/lib/format";

const COUNTRY_LABEL = {
  PK: "Pakistan",
  US: "United States",
};

function daysUntil(todayYmd, dateYmd) {
  if (!todayYmd || !dateYmd) {
    return null;
  }
  const start = new Date(`${todayYmd}T12:00:00.000Z`).getTime();
  const end = new Date(`${dateYmd}T12:00:00.000Z`).getTime();
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return days;
}

export default function DashboardUpcomingHolidays() {
  const query = useUpcomingHolidays(8);
  const todayYmd = query.data?.todayYmd;
  const holidays = query.data?.holidays || [];

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        Upcoming holidays (Pakistan — Islamic &amp; US)
      </div>
      <div className="dashboard-panel-body">
        {query.isLoading ? <Spinner label="Loading holidays…" /> : null}

        {query.isError && !holidays.length ? (
          <EmptyState
            title="Holidays unavailable"
            description="Could not load upcoming holidays right now."
          />
        ) : null}

        {!query.isLoading && !query.isError && !holidays.length ? (
          <EmptyState
            title="No upcoming holidays"
            description="No Pakistan or US holidays ahead in the loaded range."
          />
        ) : null}

        {holidays.length ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {holidays.map((item, index) => {
              const days = daysUntil(todayYmd, item.date);
              const countdown =
                days === 0
                  ? "Today"
                  : days === 1
                    ? "Tomorrow"
                    : days != null
                      ? `In ${days} days`
                      : null;
              return (
                <li
                  key={`${item.date}-${item.countryCode}-${item.name}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {item.localName && item.localName !== item.name
                        ? `${item.localName} (${item.name})`
                        : item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatYmdLong(item.date)} · {formatDate(item.date)}
                      {countdown ? ` · ${countdown}` : ""}
                    </p>
                  </div>
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                    {COUNTRY_LABEL[item.countryCode] || item.countryCode}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
