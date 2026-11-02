const LOCK_KEY = "ptpTaskProcessorDriverLock";
const CHANNEL_NAME = "ptp-task-processor";
const LOCK_TTL_MS = 90_000;
const TAB_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let channel = null;

function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

function readLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLock(until) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: TAB_ID, until }));
  } catch {
    // ignore quota / private mode
  }
}

export function isAnotherTabDrivingProcessor() {
  if (typeof window === "undefined") {
    return false;
  }
  const lock = readLock();
  if (!lock || lock.until <= Date.now()) {
    return false;
  }
  return lock.tabId !== TAB_ID;
}

export function refreshProcessorDriverLock() {
  if (typeof window === "undefined") {
    return;
  }
  writeLock(Date.now() + LOCK_TTL_MS);
  getChannel()?.postMessage({ type: "lock", tabId: TAB_ID });
}

export function releaseProcessorDriverLock() {
  if (typeof window === "undefined") {
    return;
  }
  const lock = readLock();
  if (lock?.tabId === TAB_ID) {
    try {
      localStorage.removeItem(LOCK_KEY);
    } catch {
      // ignore
    }
  }
  getChannel()?.postMessage({ type: "release", tabId: TAB_ID });
}

export function tryAcquireProcessorDriverLock() {
  if (typeof window === "undefined") {
    return true;
  }
  if (isAnotherTabDrivingProcessor()) {
    return false;
  }
  refreshProcessorDriverLock();
  return true;
}

export function subscribeProcessorDriverEvents(onChange) {
  const ch = getChannel();
  if (!ch) {
    return () => {};
  }
  const handler = () => {
    onChange();
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

export function notifyProcessorDriveStarted() {
  getChannel()?.postMessage({ type: "drive-started", tabId: TAB_ID });
}
