/** WMO Weather interpretation codes (Open-Meteo). */

const WMO = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Moderate showers",
  82: "Violent showers",
  83: "Slight snow showers",
  85: "Heavy snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export function wmoWeatherLabel(code) {
  if (code == null || Number.isNaN(Number(code))) {
    return "Unknown";
  }
  return WMO[Number(code)] || "Unknown";
}

export function wmoWeatherSymbol(code) {
  const n = Number(code);
  if (Number.isNaN(n)) {
    return "◌";
  }
  if (n === 0 || n === 1) {
    return "☀";
  }
  if (n === 2) {
    return "⛅";
  }
  if (n === 3) {
    return "☁";
  }
  if (n === 45 || n === 48) {
    return "🌫";
  }
  if (n >= 51 && n <= 67) {
    return "🌧";
  }
  if (n >= 71 && n <= 77) {
    return "❄";
  }
  if (n >= 80 && n <= 86) {
    return "🌦";
  }
  if (n >= 95) {
    return "⛈";
  }
  return "◌";
}
