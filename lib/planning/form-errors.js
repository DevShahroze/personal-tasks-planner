export function apiErrorMessage(error) {
  if (Array.isArray(error?.details) && error.details.length) {
    return error.details.join(" ");
  }
  return error?.message || "Request failed";
}
