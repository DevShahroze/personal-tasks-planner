"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Spinner from "@/components/ui/spinner";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { useWeather } from "@/contexts/weather-context";
import { wmoWeatherSymbol } from "@/lib/weather/wmo.js";
import {
  formatPm,
  smogLevelFromPm25,
  usAqiCategory,
} from "@/lib/weather/air-quality.js";

function formatTemp(value) {
  if (value == null) {
    return "—";
  }
  return `${Math.round(value)}°`;
}

export default function WeatherToolPanel() {
  const chartTheme = useChartTheme();
  const { locationStatus, refreshLocation, forecast, forecastQuery } = useWeather();
  const [view, setView] = useState("today");

  if (locationStatus === "requesting") {
    return <Spinner label="Finding your location…" />;
  }

  if ((locationStatus === "denied" || locationStatus === "unavailable") && !forecast) {
    return (
      <EmptyState
        title="Location needed"
        description="Allow browser location access to load weather for where you are. You can try again if you previously blocked it."
        action={
          <Button type="button" onClick={refreshLocation}>
            Use my location
          </Button>
        }
      />
    );
  }

  if (forecastQuery.isLoading && !forecast) {
    return <Spinner label="Loading weather…" />;
  }

  if (forecastQuery.isError && !forecast) {
    return (
      <EmptyState
        title="Weather unavailable"
        description="The forecast could not be loaded. Check your connection and try again."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => forecastQuery.refetch()}
          >
            Retry
          </Button>
        }
      />
    );
  }

  if (!forecast) {
    return null;
  }

  const current = forecast.current;
  const placeLabel = forecast.place?.label || "Your location";
  const todayHourly = forecast.todayHourly || [];
  const daily = forecast.daily || [];
  const rain = forecast.rainExpectations || {};
  const airQuality = forecast.airQuality;
  const aqCurrent = airQuality?.current;
  const aqiCat = aqCurrent?.usAqi != null ? usAqiCategory(aqCurrent.usAqi) : null;
  const smog = aqCurrent?.pm25 != null ? smogLevelFromPm25(aqCurrent.pm25) : null;
  const aqHourly = airQuality?.todayHourly || [];

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">{placeLabel}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl" aria-hidden>
            {current.symbol}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {formatTemp(current.temperature)}
          </span>
          <span className="text-sm text-muted-foreground">{current.label}</span>
        </div>
        <p className="mt-2 text-[0.6875rem] text-muted-foreground">
          Feels like {formatTemp(current.apparentTemperature)} · Humidity{" "}
          {current.humidity ?? "—"}% · Wind{" "}
          {current.windSpeed != null ? `${Math.round(current.windSpeed)} km/h` : "—"}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <StatTile
            title="Rain today"
            value={
              rain.todayMaxChance != null
                ? `Up to ${Math.round(rain.todayMaxChance)}%`
                : "—"
            }
            detail={
              rain.todayAmountMm != null
                ? `${rain.todayAmountMm.toFixed(1)} mm expected`
                : "No measurable rain forecast"
            }
          />
          <StatTile
            title="Air quality (US AQI)"
            value={aqCurrent?.usAqi != null ? Math.round(aqCurrent.usAqi) : "—"}
            detail={aqiCat ? aqiCat.label : "Unavailable for this area"}
          />
          <StatTile
            title="Smog (PM2.5)"
            value={smog ? smog.label : "—"}
            detail={
              aqCurrent
                ? `${formatPm(aqCurrent.pm25)} · PM10 ${formatPm(aqCurrent.pm10)}${
                    smog?.detail ? ` — ${smog.detail}` : ""
                  }`
                : "Unavailable for this area"
            }
          />
        </div>
        {rain.upcomingWetHours?.length ? (
          <p className="mt-2 text-[0.6875rem] text-muted-foreground">
            Rain likely around:{" "}
            {rain.upcomingWetHours
              .slice(0, 6)
              .map((h) =>
                h.chance != null ? `${h.label} (${Math.round(h.chance)}%)` : h.label,
              )
              .join(", ")}
          </p>
        ) : null}
        {locationStatus === "cached-denied" ? (
          <p className="mt-2 text-[0.6875rem] text-muted-foreground">
            Using last known location.{" "}
            <button
              type="button"
              className="font-medium text-foreground underline"
              onClick={refreshLocation}
            >
              Update location
            </button>
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={view === "today" ? "primary" : "secondary"}
          className="text-xs"
          onClick={() => setView("today")}
        >
          Today
        </Button>
        <Button
          type="button"
          variant={view === "week" ? "primary" : "secondary"}
          className="text-xs"
          onClick={() => setView("week")}
        >
          7 days
        </Button>
      </div>

      {view === "today" ? (
        <>
          <ChartPanel title="Rain expectations (today)">
            {!todayHourly.length ? (
              <p className="text-xs text-muted-foreground">No hourly rain data.</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={todayHourly}>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="pct"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      unit="%"
                      width={40}
                      domain={[0, 100]}
                    />
                    <YAxis
                      yAxisId="mm"
                      orientation="right"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: chartTheme.text, fontSize: 11 }} />
                    <Bar
                      yAxisId="pct"
                      dataKey="precipitationProbability"
                      fill={chartTheme.primary}
                      opacity={0.45}
                      name="Chance %"
                      barSize={8}
                      radius={[2, 2, 0, 0]}
                    />
                    <Line
                      yAxisId="mm"
                      type="monotone"
                      dataKey="precipitation"
                      stroke={chartTheme.success}
                      strokeWidth={2}
                      dot={false}
                      name="Rain mm"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>

          <ChartPanel title="Hourly temperature">
            {!todayHourly.length ? (
              <p className="text-xs text-muted-foreground">No hourly data for today.</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={todayHourly}>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      unit="°"
                      width={36}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${v}°`, "Temp"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke={chartTheme.primary}
                      strokeWidth={2}
                      dot={false}
                      name="Temperature"
                    />
                    <Legend wrapperStyle={{ color: chartTheme.text, fontSize: 11 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>

          {aqHourly.length ? (
            <ChartPanel title="Air quality & smog (today)">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={aqHourly}>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="aqi"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      width={40}
                    />
                    <YAxis
                      yAxisId="pm"
                      orientation="right"
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11 }}
                      width={44}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: chartTheme.text, fontSize: 11 }} />
                    <Line
                      yAxisId="aqi"
                      type="monotone"
                      dataKey="usAqi"
                      stroke={chartTheme.primary}
                      strokeWidth={2}
                      dot={false}
                      name="US AQI"
                    />
                    <Line
                      yAxisId="pm"
                      type="monotone"
                      dataKey="pm25"
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      dot={false}
                      name="PM2.5 smog"
                    />
                    <Line
                      yAxisId="pm"
                      type="monotone"
                      dataKey="pm10"
                      stroke={chartTheme.success}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name="PM10"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          ) : (
            <ChartPanel title="Air quality & smog">
              <p className="text-xs text-muted-foreground">
                Air quality data is not available for this location.
              </p>
            </ChartPanel>
          )}
        </>
      ) : (
        <ChartPanel title="Daily high & low">
          {!daily.length ? (
            <p className="text-xs text-muted-foreground">
              No daily forecast available.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} barGap={2}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    stroke={chartTheme.text}
                    tick={{ fill: chartTheme.text, fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    stroke={chartTheme.text}
                    tick={{ fill: chartTheme.text, fontSize: 11 }}
                    unit="°"
                    width={36}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: chartTheme.text, fontSize: 11 }} />
                  <Bar
                    dataKey="tempMax"
                    fill={chartTheme.primary}
                    name="High"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="tempMin"
                    fill={chartTheme.success}
                    name="Low"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      )}

      {view === "week" && rain.weeklyRain?.length ? (
        <ChartPanel title="Rain expectations (7 days)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rain.weeklyRain}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  yAxisId="pct"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  unit="%"
                  width={40}
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="mm"
                  orientation="right"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  width={40}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: chartTheme.text, fontSize: 11 }} />
                <Bar
                  yAxisId="pct"
                  dataKey="chanceMax"
                  fill={chartTheme.primary}
                  opacity={0.5}
                  name="Max chance %"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  yAxisId="mm"
                  dataKey="amountMm"
                  fill={chartTheme.success}
                  name="Rain mm"
                  radius={[3, 3, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      ) : null}

      {view === "week" && daily.length ? (
        <ul className="divide-y divide-border rounded-md border border-border text-xs">
          {daily.map((day) => (
            <li
              key={day.date}
              className="flex items-center justify-between gap-2 px-3 py-2 first:pt-2 last:pb-2"
            >
              <span className="min-w-0 truncate font-medium">{day.label}</span>
              <span className="shrink-0" aria-hidden>
                {wmoWeatherSymbol(day.weatherCode)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {day.precipitationProbabilityMax != null
                  ? `${Math.round(day.precipitationProbabilityMax)}% rain · `
                  : ""}
                {day.precipitationSum != null
                  ? `${day.precipitationSum.toFixed(1)} mm · `
                  : ""}
                {formatTemp(day.tempMin)} / {formatTemp(day.tempMax)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatTile({ title, value, detail }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 text-[0.625rem] leading-snug text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">{title}</div>
      <div className="dashboard-panel-body">{children}</div>
    </div>
  );
}
