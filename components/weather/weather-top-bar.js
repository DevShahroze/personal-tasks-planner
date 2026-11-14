"use client";

import Button from "@/components/ui/button";
import { useWeather } from "@/contexts/weather-context";
import { smogLevelFromPm25, usAqiCategory } from "@/lib/weather/air-quality.js";

function formatTemp(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Math.round(Number(value))}°`;
}

function WeatherNavChip({ children, title, ariaLabel, className = "" }) {
  return (
    <div
      className={`hidden h-8 max-w-[min(100%,21rem)] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-border bg-muted/60 px-2 shadow-sm sm:inline-flex ${className}`}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

function ChipDivider() {
  return <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden />;
}

export default function WeatherTopBar() {
  const { locationStatus, refreshLocation, forecast, forecastQuery } = useWeather();

  if (locationStatus === "requesting" || (forecastQuery.isLoading && !forecast)) {
    return (
      <WeatherNavChip ariaLabel="Loading weather">
        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
          Wx
        </span>
        <span className="text-[0.6875rem] text-muted-foreground" aria-live="polite">
          …
        </span>
      </WeatherNavChip>
    );
  }

  if (
    (locationStatus === "denied" || locationStatus === "unavailable") &&
    !forecast
  ) {
    return (
      <WeatherNavChip title="Enable location to see local weather" ariaLabel="Weather location">
        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
          Wx
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-6 px-1.5 text-[0.6875rem]"
          onClick={refreshLocation}
        >
          Enable location
        </Button>
      </WeatherNavChip>
    );
  }

  if (!forecast?.current) {
    return null;
  }

  const { symbol, label, temperature } = forecast.current;
  const place =
    forecast.place?.label ||
    (locationStatus === "cached-denied" ? "Saved location" : "Your location");
  const rain = forecast.rainExpectations;
  const aq = forecast.airQuality?.current;
  const aqiCat = aq?.usAqi != null ? usAqiCategory(aq.usAqi) : null;
  const smog = aq?.pm25 != null ? smogLevelFromPm25(aq.pm25) : null;
  const rainChance = rain?.todayMaxChance;

  const titleParts = [
    `${place} · ${label}`,
    rainChance != null ? `Rain today up to ${Math.round(rainChance)}%` : null,
    aq?.usAqi != null ? `AQI ${Math.round(aq.usAqi)} (${aqiCat?.label})` : null,
    smog ? `Smog: ${smog.label}` : null,
  ].filter(Boolean);

  return (
    <WeatherNavChip
      title={titleParts.join(" · ")}
      ariaLabel={`Weather in ${place}: ${label}, ${formatTemp(temperature)}`}
    >
      <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Wx
      </span>
      <ChipDivider />
      <span className="text-base leading-none" aria-hidden>
        {symbol}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">
        {formatTemp(temperature)}
      </span>
      <span className="hidden min-w-0 truncate text-muted-foreground md:inline">
        {label}
      </span>
      {rainChance != null && rainChance >= 20 ? (
        <>
          <ChipDivider />
          <span
            className="shrink-0 tabular-nums text-muted-foreground"
            title="Max rain chance today"
          >
            🌧 {Math.round(rainChance)}%
          </span>
        </>
      ) : null}
      {aq?.usAqi != null ? (
        <>
          <ChipDivider />
          <span
            className="hidden shrink-0 tabular-nums text-muted-foreground lg:inline"
            title={`Air quality: ${aqiCat?.label}`}
          >
            AQI {Math.round(aq.usAqi)}
          </span>
        </>
      ) : null}
      {smog && smog.tone !== "good" && smog.tone !== "muted" ? (
        <>
          <ChipDivider />
          <span
            className="hidden shrink-0 truncate text-muted-foreground xl:inline"
            title={smog.detail || smog.label}
          >
            Smog {smog.label}
          </span>
        </>
      ) : null}
    </WeatherNavChip>
  );
}