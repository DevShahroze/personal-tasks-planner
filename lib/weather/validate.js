export function parseWeatherCoordinates(searchParams) {
  const latRaw = searchParams.get("latitude");
  const lonRaw = searchParams.get("longitude");
  if (latRaw == null || lonRaw == null) {
    return { error: "latitude and longitude are required" };
  }
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: "Invalid coordinates" };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Coordinates out of range" };
  }
  return { latitude, longitude };
}
