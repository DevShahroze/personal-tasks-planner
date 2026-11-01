import { WORKSPACE_STORAGE_KEY, emptyWorkspaceState } from "./constants.js";

function readRaw() {
  if (typeof window === "undefined") {
    return emptyWorkspaceState();
  }
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return emptyWorkspaceState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyWorkspaceState();
    }
    const apps = Array.isArray(parsed.apps) ? parsed.apps : [];
    const openTabIds = Array.isArray(parsed.openTabIds)
      ? parsed.openTabIds.filter((id) => apps.some((app) => app.id === id))
      : [];
    let activeTabId = parsed.activeTabId ?? null;
    if (activeTabId && !openTabIds.includes(activeTabId)) {
      activeTabId = openTabIds[0] ?? null;
    }
    return {
      apps: apps
        .filter(
          (app) => app && typeof app.id === "string" && typeof app.url === "string",
        )
        .map((app) => ({
          id: app.id,
          name: String(app.name || app.url).slice(0, 120),
          url: String(app.url).slice(0, 2000),
        })),
      openTabIds,
      activeTabId,
    };
  } catch {
    return emptyWorkspaceState();
  }
}

export function loadWorkspaceState() {
  return readRaw();
}

export function saveWorkspaceState(state) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

export function normalizeWorkspaceUrl(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return null;
  }
  let url;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  return url.href;
}
