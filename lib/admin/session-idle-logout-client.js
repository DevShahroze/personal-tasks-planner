import { authApi } from "@/lib/api-client";

let loggingOut = false;

export async function performSessionIdleLogout() {
  if (loggingOut || typeof window === "undefined") {
    return;
  }
  loggingOut = true;
  try {
    await authApi.logout();
  } catch {
    // still leave the app
  }
  window.location.assign("/login");
}

export function touchSessionActivity(lastActivityRef) {
  lastActivityRef.current = Date.now();
}
