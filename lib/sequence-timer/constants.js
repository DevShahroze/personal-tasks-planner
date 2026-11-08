export const SEQUENCE_TIMER_MIN_PLAYERS = 2;
export const SEQUENCE_TIMER_MAX_PLAYERS = 6;

/** Hue values (0–360) for player accents — works in light and dark via alpha overlays. */
export const SEQUENCE_PLAYER_HUES = [234, 187, 152, 32, 271, 340];

export function nextPlayerIndexAntiClockwise(currentIndex, playerCount) {
  if (playerCount <= 0) {
    return 0;
  }
  return (currentIndex - 1 + playerCount) % playerCount;
}

export function formatSequenceElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function defaultPlayerName(index) {
  return `Player ${index + 1}`;
}
