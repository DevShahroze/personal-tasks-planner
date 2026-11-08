import { useSyncExternalStore } from "react";

function subscribe(onStoreChange) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getClientSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useNetworkOnline() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
