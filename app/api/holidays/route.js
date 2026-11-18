import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { fetchHolidaysBundle } from "@/lib/holidays/bundle";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  try {
    const payload = await fetchHolidaysBundle();
    const hasAny =
      payload.upcoming.length > 0 ||
      Object.values(payload.years).some((y) => y.holidays?.length);
    if (!hasAny && Object.keys(payload.errors).length >= 2) {
      return jsonError("Unable to load holidays", 502, Object.values(payload.errors));
    }
    return jsonOk(payload);
  } catch {
    return jsonError("Unable to load holidays", 502);
  }
}
