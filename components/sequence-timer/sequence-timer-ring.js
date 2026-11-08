"use client";

import { useMemo } from "react";
import {
  SEQUENCE_PLAYER_HUES,
  formatSequenceElapsed,
} from "@/lib/sequence-timer/constants";

function seatPosition(index, total) {
  const angleDeg = -90 + (360 / total) * index;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = 41;
  return {
    left: `${50 + radius * Math.cos(angleRad)}%`,
    top: `${50 + radius * Math.sin(angleRad)}%`,
  };
}

function playerAccentStyle(colorIndex, active) {
  const hue = SEQUENCE_PLAYER_HUES[colorIndex % SEQUENCE_PLAYER_HUES.length];
  return {
    "--player-hue": String(hue),
    boxShadow: active
      ? `0 0 0 2px hsl(${hue} 70% 50%), 0 8px 24px hsl(${hue} 45% 35% / 0.25)`
      : undefined,
  };
}

export default function SequenceTimerRing({
  players,
  currentIndex,
  displayElapsedById,
  isRunning,
}) {
  const total = players.length;

  const seats = useMemo(() => {
    return players.map((player, index) => ({
      player,
      index,
      position: seatPosition(index, total),
      active: index === currentIndex,
    }));
  }, [players, currentIndex, total]);

  if (total < 2) {
    return null;
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17.5rem]">
      <div
        className="pointer-events-none absolute inset-[12%] rounded-full border border-border/80 bg-muted/30 transition-opacity duration-500 dark:bg-muted/20"
        aria-hidden
      />
      {isRunning ? (
        <div
          className="pointer-events-none absolute inset-[12%] animate-pulse rounded-full border border-primary/30"
          aria-hidden
        />
      ) : null}

      {seats.map(({ player, index, position, active }) => {
        const hue =
          SEQUENCE_PLAYER_HUES[player.colorIndex % SEQUENCE_PLAYER_HUES.length];
        const elapsed = displayElapsedById[player.id] ?? 0;
        return (
          <div
            key={player.id}
            className="absolute w-[5.25rem] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={position}
          >
            <div
              className={`rounded-xl border px-2 py-1.5 text-center transition-transform duration-300 ${
                active ? "scale-105 border-transparent" : "scale-100 border-border/60"
              }`}
              style={{
                ...playerAccentStyle(player.colorIndex, active),
                backgroundColor: `hsl(${hue} 55% 52% / ${active ? 0.22 : 0.12})`,
                borderColor: active ? `hsl(${hue} 65% 55%)` : undefined,
              }}
            >
              <p
                className={`truncate text-[0.6875rem] font-semibold ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
                title={player.name}
              >
                {player.name}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-foreground">
                {formatSequenceElapsed(elapsed)}
              </p>
              {active && isRunning ? (
                <span
                  className="mt-1 inline-block h-1 w-1 animate-ping rounded-full"
                  style={{ backgroundColor: `hsl(${hue} 70% 55%)` }}
                  aria-hidden
                />
              ) : null}
            </div>
            {active ? (
              <span
                className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full transition-all duration-300"
                style={{ backgroundColor: `hsl(${hue} 70% 50%)` }}
                aria-hidden
              />
            ) : null}
            <span className="sr-only">
              {player.name}, seat {index + 1} of {total}
              {active ? ", current turn" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
