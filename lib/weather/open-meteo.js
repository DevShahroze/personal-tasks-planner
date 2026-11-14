import { wmoWeatherLabel, wmoWeatherSymbol } from "./wmo.js";

const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1/reverse";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    throw new Error("Weather service unavailable");
  }
  return response.json();
}

function formatShortTime(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

function formatDayLabel(ymd, timeZone) {
  try {
    const date = new Date(`${ymd}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(date);
  } catch {
    return ymd;
  }
}

export function normalizeOpenMeteoForecast(raw, place) {
  const timeZone = raw.timezone || "UTC";
  const current = raw.current || {};
  const hourly = raw.hourly || {};
  const daily = raw.daily || {};

  const hourlyRows = (hourly.time || []).map((time, index) => ({
    time,
    label: formatShortTime(time, timeZone),
    temperature: hourly.temperature_2m?.[index] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    precipitation: hourly.precipitation?.[index] ?? null,
    weatherCode: hourly.weather_code?.[index] ?? null,
  }));

  const todayPrefix = (raw.current?.time || hourly.time?.[0] || "").slice(0, 10);
  const todayHourly = todayPrefix
    ? hourlyRows.filter((row) => row.time.startsWith(todayPrefix))
    : hourlyRows.slice(0, 24);

  const dailyRows = (daily.time || []).map((date, index) => ({
    date,
    label: formatDayLabel(date, timeZone),
    weatherCode: daily.weather_code?.[index] ?? null,
    tempMax: daily.temperature_2m_max?.[index] ?? null,
    tempMin: daily.temperature_2m_min?.[index] ?? null,
    precipitationSum: daily.precipitation_sum?.[index] ?? null,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[index] ?? null,
  }));

  const weatherCode = current.weather_code ?? null;

  const rainExpectations = buildRainExpectations(todayHourly, dailyRows);

  return {
    place,
    timeZone,
    current: {
      time: current.time || null,
      temperature: current.temperature_2m ?? null,
      apparentTemperature: current.apparent_temperature ?? null,
      humidity: current.relative_humidity_2m ?? null,
      windSpeed: current.wind_speed_10m ?? null,
      weatherCode,
      label: wmoWeatherLabel(weatherCode),
      symbol: wmoWeatherSymbol(weatherCode),
    },
    rainExpectations,
    todayHourly,
    daily: dailyRows,
    airQuality: raw.airQuality || null,
  };
}

function buildRainExpectations(todayHourly, dailyRows) {
  const today = dailyRows[0];
  const todayMaxChance =
    today?.precipitationProbabilityMax ??
    (todayHourly.length
      ? Math.max(...todayHourly.map((h) => h.precipitationProbability ?? 0))
      : null);
  const todayAmount = today?.precipitationSum ?? null;

  const upcomingWetHours = todayHourly
    .filter(
      (h) => (h.precipitationProbability ?? 0) >= 30 || (h.precipitation ?? 0) > 0,
    )
    .map((h) => ({
      label: h.label,
      chance: h.precipitationProbability,
      amountMm: h.precipitation,
    }));

  const weeklyRain = dailyRows.map((d) => ({
    date: d.date,
    label: d.label,
    chanceMax: d.precipitationProbabilityMax,
    amountMm: d.precipitationSum,
  }));

  return {
    todayMaxChance,
    todayAmountMm: todayAmount,
    upcomingWetHours,
    weeklyRain,
  };
}

export function normalizeOpenMeteoAirQuality(raw) {
  const current = raw.current || {};
  const hourly = raw.hourly || {};
  const timeZone = raw.timezone || "UTC";

  const hourlyRows = (hourly.time || []).map((time, index) => ({
    time,
    label: formatShortTime(time, timeZone),
    usAqi: hourly.us_aqi?.[index] ?? null,
    pm25: hourly.pm2_5?.[index] ?? null,
    pm10: hourly.pm10?.[index] ?? null,
  }));

  const todayPrefix = (current.time || hourly.time?.[0] || "").slice(0, 10);
  const todayHourly = todayPrefix
    ? hourlyRows.filter((row) => row.time.startsWith(todayPrefix))
    : hourlyRows.slice(0, 24);

  return {
    timeZone,
    current: {
      usAqi: current.us_aqi ?? null,
      europeanAqi: current.european_aqi ?? null,
      pm25: current.pm2_5 ?? null,
      pm10: current.pm10 ?? null,
    },
    todayHourly,
  };
}

export async function fetchWeatherForCoordinates(latitude, longitude) {
  const forecastUrl = new URL(FORECAST_BASE);
  forecastUrl.searchParams.set("latitude", String(latitude));
  forecastUrl.searchParams.set("longitude", String(longitude));
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  );
  forecastUrl.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,precipitation,weather_code",
  );
  forecastUrl.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
  );
  forecastUrl.searchParams.set("timezone", "auto");
  forecastUrl.searchParams.set("forecast_days", "7");

  const geocodeUrl = new URL(GEOCODE_BASE);
  geocodeUrl.searchParams.set("latitude", String(latitude));
  geocodeUrl.searchParams.set("longitude", String(longitude));
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("count", "1");

  const airUrl = new URL(AIR_QUALITY_BASE);
  airUrl.searchParams.set("latitude", String(latitude));
  airUrl.searchParams.set("longitude", String(longitude));
  airUrl.searchParams.set("current", "us_aqi,european_aqi,pm2_5,pm10");
  airUrl.searchParams.set("hourly", "us_aqi,pm2_5,pm10");
  airUrl.searchParams.set("timezone", "auto");
  airUrl.searchParams.set("forecast_days", "7");

  const [forecast, geocode, airRaw] = await Promise.all([
    fetchJson(forecastUrl),
    fetchJson(geocodeUrl).catch(() => ({ results: [] })),
    fetchJson(airUrl).catch(() => null),
  ]);

  const first = geocode.results?.[0];
  const place = first
    ? {
        name: first.name || null,
        admin1: first.admin1 || null,
        country: first.country || null,
        label: [first.name, first.admin1, first.country].filter(Boolean).join(", "),
      }
    : { name: null, admin1: null, country: null, label: null };

  const airQuality = airRaw ? normalizeOpenMeteoAirQuality(airRaw) : null;
  return normalizeOpenMeteoForecast({ ...forecast, airQuality }, place);
}
