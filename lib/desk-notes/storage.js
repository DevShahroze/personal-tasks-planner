import { DESK_NOTES_SESSION_KEY } from "./constants.js";

export function loadDeskNoteSession() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(DESK_NOTES_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDeskNoteSession(session) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(DESK_NOTES_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

export function clearDeskNoteSession() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(DESK_NOTES_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
