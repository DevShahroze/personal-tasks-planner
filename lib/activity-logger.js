const LOGS_KEY = "app_activity_logs";
const ENABLED_KEY = "app_activity_logging_enabled";
const MAX_EVENTS = 500;

let sessionStart = null;
let requestCounter = 0;
let lastRecordedPath = null;
let memoryLogs = [];
let memoryEnabled = false;
let sessionBootstrapped = false;

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

function readLogsFromStorage() {
  if (!canUseStorage()) {
    return memoryLogs;
  }
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryLogs;
  }
}

function writeLogsToStorage(entries) {
  memoryLogs = entries;
  if (!canUseStorage()) {
    return;
  }
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(entries));
  } catch {
    while (entries.length > 10) {
      entries.shift();
      try {
        localStorage.setItem(LOGS_KEY, JSON.stringify(entries));
        return;
      } catch {
        /* trim and retry */
      }
    }
  }
}

function appendEvent(event) {
  if (!isLoggingEnabled()) {
    return;
  }
  const entries = readLogsFromStorage();
  entries.push(event);
  while (entries.length > MAX_EVENTS) {
    entries.shift();
  }
  writeLogsToStorage(entries);
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

  writeLogsToStorage([]);

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

let activeRequests = new Map();

export function recordApiStart(method, path) {
  if (!isLoggingEnabled()) {
    return null;
  }
  const id = ++requestCounter;
  appendEvent({
    ts: nowIso(),
    type: "API_START",
    method: method.toUpperCase(),
    path,
    requestId: id,
  });
  activeRequests.set(id, { start: performance.now(), method, path });
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
    type: "API_END",
    method: meta?.method || "GET",
    path: meta?.path || "",
    status: status ?? "",
    outcome,
    durationMs,
    requestId,
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

export function getActivityLogs() {
  return readLogsFromStorage();
}

export function getSessionStart() {
  return sessionStart;
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
    if (event.type === "PAGE") {
      lines.push(`${event.ts} | PAGE | ${event.path}`);
      continue;
    }
    if (event.type === "API_START") {
      lines.push(
        `${event.ts} | API_START | ${event.method} | ${event.path} | REQUEST_ID=${event.requestId}`,
      );
      continue;
    }
    if (event.type === "API_END") {
      lines.push(
        `${event.ts} | API_END | ${event.method} | ${event.path} | ${event.status} | ${event.outcome} | ${event.durationMs}ms | REQUEST_ID=${event.requestId}`,
      );
    }
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
