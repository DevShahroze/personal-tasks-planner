import { useSyncExternalStore } from "react";

function subscribe(onStoreChange) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const scheduleMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(next.getTime() - now.getTime(), 1000);
    const timer = window.setTimeout(() => {
      invalidateClientTodaySnapshot();
      onStoreChange();
      scheduleMidnight();
    }, delay);
    return timer;
  };

  const timer = scheduleMidnight();
  return () => window.clearTimeout(timer);
}

let cachedSnapshot = null;

function buildTodaySnapshot() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { ymd, year, month };
}

export function invalidateClientTodaySnapshot() {
  cachedSnapshot = null;
}

function getClientSnapshot() {
  const next = buildTodaySnapshot();
  if (
    cachedSnapshot &&
    cachedSnapshot.ymd === next.ymd &&
    cachedSnapshot.year === next.year &&
    cachedSnapshot.month === next.month
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  return cachedSnapshot;
}

function getServerSnapshot() {
  return null;
}

export function useClientTodayYmd() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function getClientTodaySnapshotForTests() {
  return getClientSnapshot();
}
