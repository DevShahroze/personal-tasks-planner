export const PIN_LOCK_SCREEN_ID = "ptp-pin-lock-screen";

export function touchPinActivity(lastActivityRef) {
  lastActivityRef.current = Date.now();
}

export async function forceLogoutAfterPinTamper() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
    window.location.assign("/login");
  }
}
