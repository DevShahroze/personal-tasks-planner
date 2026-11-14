"use client";

import { useEffect, useState } from "react";

function formatClockParts(date) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { time, dateLabel, tz };
}

export default function NavClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { time, dateLabel, tz } = now
    ? formatClockParts(now)
    : { time: "--:--:--", dateLabel: "", tz: "" };

  return (
    <div
      className="hidden h-8 max-w-[min(100%,14rem)] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-border bg-muted/60 px-2 shadow-sm sm:inline-flex"
      title={tz ? `Local time · ${tz}` : "Local time"}
      aria-label={now ? `Local time ${time}` : "Local time"}
    >
      <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Time
      </span>
      <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden />
      <time
        className="shrink-0 font-semibold tabular-nums tracking-tight text-foreground"
        dateTime={now ? now.toISOString() : undefined}
        suppressHydrationWarning
      >
        {time}
      </time>
      {dateLabel ? (
        <span className="hidden min-w-0 truncate text-[0.6875rem] text-muted-foreground md:inline">
          {dateLabel}
        </span>
      ) : null}
    </div>
  );
}