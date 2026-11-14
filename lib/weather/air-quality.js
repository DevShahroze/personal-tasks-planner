export function usAqiCategory(aqi) {
  const n = Number(aqi);
  if (!Number.isFinite(n)) {
    return { label: "Unknown", tone: "muted" };
  }
  if (n <= 50) {
    return { label: "Good", tone: "good" };
  }
  if (n <= 100) {
    return { label: "Moderate", tone: "moderate" };
  }
  if (n <= 150) {
    return { label: "Unhealthy (sensitive)", tone: "elevated" };
  }
  if (n <= 200) {
    return { label: "Unhealthy", tone: "poor" };
  }
  if (n <= 300) {
    return { label: "Very unhealthy", tone: "poor" };
  }
  return { label: "Hazardous", tone: "hazard" };
}

/** Smog / particulate haze from PM2.5 (µg/m³). */
export function smogLevelFromPm25(pm25) {
  const n = Number(pm25);
  if (!Number.isFinite(n)) {
    return { label: "Unknown", detail: null, tone: "muted" };
  }
  if (n <= 12) {
    return { label: "Low", detail: "Clear air", tone: "good" };
  }
  if (n <= 35) {
    return { label: "Moderate", detail: "Light haze possible", tone: "moderate" };
  }
  if (n <= 55) {
    return { label: "High", detail: "Noticeable smog / haze", tone: "elevated" };
  }
  if (n <= 150) {
    return { label: "Very high", detail: "Heavy smog — limit outdoor exertion", tone: "poor" };
  }
  return { label: "Severe", detail: "Dangerous smog levels", tone: "hazard" };
}

export function formatPm(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return `${Math.round(Number(value))} µg/m³`;
}