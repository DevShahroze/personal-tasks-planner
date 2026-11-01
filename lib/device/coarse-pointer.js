const COARSE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

export function subscribeCoarsePointerDevice(onChange) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const media = window.matchMedia(COARSE_POINTER_QUERY);
  const handler = () => onChange(media.matches);
  handler();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
