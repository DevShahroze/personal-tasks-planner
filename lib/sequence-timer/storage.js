import { SEQUENCE_TIMER_MIN_PLAYERS } from "./constants.js";

export const SEQUENCE_TIMER_STORAGE_KEY = "ptp-sequence-timer-v1";

export function emptySequenceTimerLocalState() {
  return {
    players: [],
    currentPlayerIndex: 0,
    isRunning: false,
    updatedAt: null,
  };
}

function normalizePlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }
  return players
    .filter((player) => player && typeof player.id === "string")
    .map((player) => ({
      id: player.id,
      name: String(player.name || "").slice(0, 40),
      elapsedMs: Math.max(0, Number(player.elapsedMs) || 0),
      colorIndex: Math.min(5, Math.max(0, Number(player.colorIndex) || 0)),
    }));
}

export function loadSequenceTimerLocal() {
  if (typeof window === "undefined") {
    return emptySequenceTimerLocalState();
  }
  try {
    const raw = window.localStorage.getItem(SEQUENCE_TIMER_STORAGE_KEY);
    if (!raw) {
      return emptySequenceTimerLocalState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptySequenceTimerLocalState();
    }
    const players = normalizePlayers(parsed.players);
    const currentPlayerIndex = Math.min(
      Math.max(0, Number(parsed.currentPlayerIndex) || 0),
      Math.max(0, players.length - 1),
    );
    return {
      players,
      currentPlayerIndex,
      isRunning: false,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return emptySequenceTimerLocalState();
  }
}

export function saveSequenceTimerLocal(payload) {
  if (typeof window === "undefined") {
    return payload;
  }
  const players = normalizePlayers(payload.players);
  if (players.length < SEQUENCE_TIMER_MIN_PLAYERS) {
    return null;
  }
  const doc = {
    players,
    currentPlayerIndex: Math.min(
      Math.max(0, Number(payload.currentPlayerIndex) || 0),
      players.length - 1,
    ),
    isRunning: false,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(SEQUENCE_TIMER_STORAGE_KEY, JSON.stringify(doc));
  return doc;
}
