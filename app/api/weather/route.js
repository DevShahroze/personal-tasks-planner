import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { parseWeatherCoordinates } from "@/lib/weather/validate";
import { fetchWeatherForCoordinates } from "@/lib/weather/open-meteo";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const coords = parseWeatherCoordinates(request.nextUrl.searchParams);
  if (coords.error) {
    return jsonError(coords.error, 400);
  }

  try {
    const data = await fetchWeatherForCoordinates(coords.latitude, coords.longitude);
    return jsonOk(data);
  } catch {
    return jsonError("Unable to load weather", 502);
  }
}
