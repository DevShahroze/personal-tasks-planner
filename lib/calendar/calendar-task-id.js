export function calendarTaskId(value) {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && typeof value.toHexString === "function") {
    return value.toHexString();
  }
  const asString = String(value);
  return asString === "[object Object]" ? "" : asString;
}
