const LOGS_KEY = "app_activity_logs";
const ENABLED_KEY = "app_activity_logging_enabled";

let sessionStart = null;
let requestCounter = 0;
let lastRecordedPath = null;
/** @type {Array<object>} */
let memoryLogs = [];
let memoryEnabled = false;
let sessionBootstrapped = false;
let nextSeq = 1;

const activeRequests = new Map();

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function formatExportTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function persistMemoryLogsToStorage() {
  if (!canUseStorage()) {
    return;
  }
  let slice = memoryLogs;
  while (slice.length > 0) {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(slice));
      return;
    } catch {
      slice = slice.slice(Math.min(100, Math.max(1, Math.floor(slice.length * 0.05))));
      memoryLogs = slice;
    }
  }
}

function appendEvent(event) {
  if (!isLoggingEnabled()) {
    return;
  }
  const entry = { ...event, seq: nextSeq++ };
  memoryLogs.push(entry);
  persistMemoryLogsToStorage();
}

export function bootstrapActivityLoggerSession() {
  if (typeof window === "undefined") {
    return;
  }
  if (sessionBootstrapped) {
    return;
  }
  sessionBootstrapped = true;
  sessionStart = nowIso();
  memoryLogs = [];
  nextSeq = 1;
  lastRecordedPath = null;
  activeRequests.clear();

  if (canUseStorage()) {
    try {
      localStorage.removeItem(LOGS_KEY);
    } catch {
      /* ignore */
    }
  }

  try {
    memoryEnabled = localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    memoryEnabled = false;
  }
}

export function isLoggingEnabled() {
  if (!canUseStorage()) {
    return memoryEnabled;
  }
  try {
    return localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    return memoryEnabled;
  }
}

export function setLoggingEnabled(enabled) {
  memoryEnabled = Boolean(enabled);
  if (!canUseStorage()) {
    return;
  }
  try {
    localStorage.setItem(ENABLED_KEY, memoryEnabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  if (memoryEnabled && typeof window !== "undefined") {
    recordPageVisit(window.location.pathname);
  }
}

export function recordPageVisit(pathname) {
  if (!pathname || !isLoggingEnabled()) {
    return;
  }
  if (pathname === lastRecordedPath) {
    return;
  }
  lastRecordedPath = pathname;
  appendEvent({
    ts: nowIso(),
    type: "PAGE",
    path: pathname,
  });
}

export function recordApiStart(method, path) {
  if (!isLoggingEnabled()) {
    return null;
  }
  const id = ++requestCounter;
  activeRequests.set(id, {
    start: performance.now(),
    method,
    path,
    startedAt: nowIso(),
  });
  return id;
}

export function recordApiEnd(requestId, { status, outcome, durationMs }) {
  if (!requestId || !isLoggingEnabled()) {
    return;
  }
  const meta = activeRequests.get(requestId);
  activeRequests.delete(requestId);
  appendEvent({
    ts: nowIso(),
    type: "API",
    method: (meta?.method || "GET").toUpperCase(),
    path: meta?.path || "",
    status: status ?? "",
    outcome,
    durationMs,
    requestId,
    startedAt: meta?.startedAt || "",
  });
}

export function sanitizeApiPath(path) {
  if (!path) return "";
  try {
    const url = path.startsWith("http") ? new URL(path) : new URL(path, "http://local");
    const blocked = new Set(["password", "token", "secret", "authorization"]);
    url.searchParams.forEach((_, key) => {
      if (blocked.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    });
    return `${url.pathname}${url.search}`;
  } catch {
    return path.split("?")[0];
  }
}

function sortedEvents(events) {
  return [...events].sort((a, b) => {
    const seqA = Number(a.seq);
    const seqB = Number(b.seq);
    if (Number.isFinite(seqA) && Number.isFinite(seqB) && seqA !== seqB) {
      return seqA - seqB;
    }
    return String(a.ts || "").localeCompare(String(b.ts || ""));
  });
}

export function getActivityLogs() {
  return sortedEvents(memoryLogs);
}

export function getSessionStart() {
  return sessionStart;
}

function formatEventLine(event) {
  if (event.type === "PAGE") {
    return `${event.ts} | #${event.seq} | PAGE | ${event.path}`;
  }
  if (event.type === "API") {
    return `${event.ts} | #${event.seq} | API | ${event.method} | ${event.path} | ${event.status} | ${event.outcome} | ${event.durationMs}ms`;
  }
  if (event.type === "API_START") {
    return `${event.ts} | #${event.seq ?? "?"} | API_START | ${event.method} | ${event.path} | REQUEST_ID=${event.requestId}`;
  }
  if (event.type === "API_END") {
    return `${event.ts} | #${event.seq ?? "?"} | API_END | ${event.method} | ${event.path} | ${event.status} | ${event.outcome} | ${event.durationMs}ms | REQUEST_ID=${event.requestId}`;
  }
  return `${event.ts} | ${event.type}`;
}

export function exportActivityLogsAsText() {
  const events = getActivityLogs();
  const lines = [
    "APPLICATION ACTIVITY LOG",
    `Exported At: ${formatExportTimestamp()}`,
    `Session Start: ${sessionStart || "unknown"}`,
    `Logging Enabled: ${isLoggingEnabled() ? "yes" : "no"}`,
    `Events: ${events.length}`,
    "",
  ];

  for (const event of events) {
    lines.push(formatEventLine(event));
  }

  return lines.join("\n");
}

export function downloadActivityLogs() {
  const events = getActivityLogs();
  if (!events.length) {
    return { ok: false, message: "No logs to export for this session." };
  }

  const blob = new Blob([exportActivityLogsAsText()], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = formatExportTimestamp().replace(/[: ]/g, "-");
  anchor.href = url;
  anchor.download = `activity-log-${stamp}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

/** @internal */
export function resetActivityLoggerForTests() {
  sessionBootstrapped = false;
  sessionStart = null;
  requestCounter = 0;
  lastRecordedPath = null;
  memoryLogs = [];
  memoryEnabled = false;
  nextSeq = 1;
  activeRequests.clear();
}
