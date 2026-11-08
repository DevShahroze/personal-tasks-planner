import { SEQUENCE_TIMER_MAX_PLAYERS, SEQUENCE_TIMER_MIN_PLAYERS } from "./constants.js";

function asNonEmptyString(value, maxLen) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) {
    return null;
  }
  return trimmed;
}

export function validateSequenceTimerSave(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }

  const players = body.players;
  if (!Array.isArray(players)) {
    return { ok: false, error: "players must be an array" };
  }
  if (
    players.length < SEQUENCE_TIMER_MIN_PLAYERS ||
    players.length > SEQUENCE_TIMER_MAX_PLAYERS
  ) {
    return {
      ok: false,
      error: `Between ${SEQUENCE_TIMER_MIN_PLAYERS} and ${SEQUENCE_TIMER_MAX_PLAYERS} players required`,
    };
  }

  const normalized = [];
  const ids = new Set();

  for (const raw of players) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid player entry" };
    }
    const id = asNonEmptyString(raw.id, 64);
    const name = asNonEmptyString(raw.name, 40);
    if (!id || !name) {
      return { ok: false, error: "Each player needs a valid id and name" };
    }
    if (ids.has(id)) {
      return { ok: false, error: "Duplicate player id" };
    }
    ids.add(id);

    const elapsedMs = Number(raw.elapsedMs);
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 86400000 * 30) {
      return { ok: false, error: "Invalid elapsed time" };
    }

    const colorIndex = Number(raw.colorIndex);
    if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 5) {
      return { ok: false, error: "Invalid color index" };
    }

    normalized.push({ id, name, elapsedMs: Math.floor(elapsedMs), colorIndex });
  }

  const currentPlayerIndex = Number(body.currentPlayerIndex);
  if (
    !Number.isInteger(currentPlayerIndex) ||
    currentPlayerIndex < 0 ||
    currentPlayerIndex >= normalized.length
  ) {
    return { ok: false, error: "Invalid current player index" };
  }

  if (body.isRunning !== false) {
    return { ok: false, error: "Save only when the timer is paused" };
  }

  return {
    ok: true,
    data: {
      players: normalized,
      currentPlayerIndex,
      isRunning: false,
    },
  };
}
