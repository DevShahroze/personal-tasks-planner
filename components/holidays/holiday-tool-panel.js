"use client";

import { useMemo, useState } from "react";
import { useHolidaysContext, useHolidaysForYear } from "@/contexts/holidays-context";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";

const COUNTRY_LABEL = {
  PK: "Pakistan",
  US: "United States",
};

function monthKey(dateYmd) {
  return dateYmd.slice(0, 7);
}

function monthTitle(ym) {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function HolidayToolPanel() {
  const {
    loadedYears,
    isLoading: bundleLoading,
    todayYmd: bundleTodayYmd,
  } = useHolidaysContext();
  const yearOptions = loadedYears();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const query = useHolidaysForYear(year);

  const grouped = useMemo(() => {
    const holidays = query.data?.holidays || [];
    const map = new Map();
    for (const item of holidays) {
      const key = monthKey(item.date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [query.data?.holidays]);

  const todayYmd = bundleTodayYmd || new Date().toISOString().slice(0, 10);

  if (bundleLoading || query.isLoading) {
    return <Spinner label="Loading holidays…" />;
  }

  if (query.isError && !query.data) {
    return (
      <EmptyState
        title="Holidays unavailable"
        description="The public holiday service could not be reached. Try again later."
        action={
          <Button type="button" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const errors = query.data?.errors || {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Islamic holidays in Pakistan and US public holidays in one list.
      </p>

      <HolidayYearNav
        year={year}
        setYear={setYear}
        currentYear={currentYear}
        minYear={yearOptions[0] ?? currentYear}
        maxYear={yearOptions[yearOptions.length - 1] ?? currentYear}
      />

      {Object.keys(errors).length ? (
        <div className="space-y-2">
          {Object.entries(errors).map(([code, message]) => (
            <Alert key={code} variant="error">
              {COUNTRY_LABEL[code] || code}: {message}
            </Alert>
          ))}
        </div>
      ) : null}

      {!yearOptions.includes(year) ? (
        <EmptyState
          title="Year not loaded"
          description="Holiday data was loaded for adjacent years only. Choose another year above."
        />
      ) : null}

      {yearOptions.includes(year) && !grouped.length ? (
        <EmptyState
          title="No holidays"
          description="No public holidays found for this year."
        />
      ) : null}

      {yearOptions.includes(year) && grouped.length ? (
        <div className="space-y-5">
          {grouped.map(([ym, items]) => (
            <section key={ym}>
              <h3 className="text-sm font-semibold tracking-tight">{monthTitle(ym)}</h3>
              <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                {items.map((item, index) => {
                  const isToday = item.date === todayYmd;
                  return (
                    <li
                      key={`${item.date}-${item.countryCode}-${item.name}-${index}`}
                      className={`flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm ${
                        isToday ? "bg-primary/10" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium">
                          {item.localName && item.localName !== item.name
                            ? `${item.localName} (${item.name})`
                            : item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.date)}
                          {isToday ? " · Today" : ""}
                        </p>
                      </div>
                      <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                        {COUNTRY_LABEL[item.countryCode] || item.countryCode}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        US:{" "}
        <a
          href="https://date.nager.at"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nager.Date
        </a>
        . Pakistan (Islamic): Google&apos;s &quot;Holidays in Pakistan&quot; plus the
        global Islamic holidays calendar when Pakistan dates are not published yet.
      </p>
    </div>
  );
}

function HolidayYearNav({ year, setYear, currentYear, minYear, maxYear }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={year <= minYear}
          onClick={() => setYear((value) => value - 1)}
        >
          Previous year
        </Button>
        <span className="text-sm font-semibold tabular-nums">{year}</span>
        <Button
          type="button"
          variant="secondary"
          disabled={year >= maxYear}
          onClick={() => setYear((value) => value + 1)}
        >
          Next year
        </Button>
      </div>
      {year !== currentYear ? (
        <Button type="button" variant="secondary" onClick={() => setYear(currentYear)}>
          This year
        </Button>
      ) : null}
    </div>
  );
}
