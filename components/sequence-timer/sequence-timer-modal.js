"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import {
  loadSequenceTimerForClient,
  saveSequenceTimerForClient,
} from "@/lib/sequence-timer/client-state";
import { toastError, toastSuccess } from "@/lib/toast-bus";
import { randomUUID } from "@/lib/uuid";
import {
  SEQUENCE_PLAYER_HUES,
  SEQUENCE_TIMER_MAX_PLAYERS,
  SEQUENCE_TIMER_MIN_PLAYERS,
  defaultPlayerName,
  formatSequenceElapsed,
  nextPlayerIndexAntiClockwise,
} from "@/lib/sequence-timer/constants";
import SequenceTimerRing from "@/components/sequence-timer/sequence-timer-ring";

function createDefaultPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    name: defaultPlayerName(index),
    elapsedMs: 0,
    colorIndex: index % 6,
  }));
}

function clampIndex(index, length) {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, index), length - 1);
}

function snapshotElapsed(players, currentIndex, turnStartedAt, isRunning) {
  const map = Object.fromEntries(players.map((p) => [p.id, p.elapsedMs]));
  if (!isRunning || turnStartedAt == null || players.length === 0) {
    return map;
  }
  const active = players[currentIndex];
  if (!active) {
    return map;
  }
  const live = Date.now() - turnStartedAt;
  map[active.id] = active.elapsedMs + Math.max(0, live);
  return map;
}

export default function SequenceTimerModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [players, setPlayers] = useState(() => createDefaultPlayers(2));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [tick, setTick] = useState(0);

  const flushActiveElapsed = useCallback(() => {
    if (!isRunning || turnStartedAt == null) {
      return players;
    }
    const active = players[currentIndex];
    if (!active) {
      return players;
    }
    const delta = Date.now() - turnStartedAt;
    return players.map((player, index) =>
      index === currentIndex
        ? { ...player, elapsedMs: player.elapsedMs + Math.max(0, delta) }
        : player,
    );
  }, [currentIndex, isRunning, players, turnStartedAt]);

  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await loadSequenceTimerForClient();
      if (data.players?.length >= SEQUENCE_TIMER_MIN_PLAYERS) {
        setPlayers(data.players);
        setCurrentIndex(clampIndex(data.currentPlayerIndex ?? 0, data.players.length));
      } else {
        setPlayers(createDefaultPlayers(2));
        setCurrentIndex(0);
      }
      setIsRunning(false);
      setTurnStartedAt(null);
    } catch (error) {
      setLoadError(error?.message || "Could not load timer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load saved timer when modal opens
    loadFromServer();
  }, [open, loadFromServer]);

  useEffect(() => {
    if (!open || !isRunning) {
      return undefined;
    }
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, [open, isRunning]);

  const displayElapsedById = useMemo(() => {
    void tick;
    return snapshotElapsed(players, currentIndex, turnStartedAt, isRunning);
  }, [players, currentIndex, turnStartedAt, isRunning, tick]);

  const activePlayer = players[currentIndex];
  const activeDisplayMs = activePlayer ? (displayElapsedById[activePlayer.id] ?? 0) : 0;

  const canStart =
    players.length >= SEQUENCE_TIMER_MIN_PLAYERS && !isRunning && !loading;
  const canDone = isRunning && players.length >= SEQUENCE_TIMER_MIN_PLAYERS;
  const canEditRoster = !isRunning;

  const setPlayerCount = (count) => {
    if (!canEditRoster) {
      return;
    }
    const next = Math.min(
      SEQUENCE_TIMER_MAX_PLAYERS,
      Math.max(SEQUENCE_TIMER_MIN_PLAYERS, count),
    );
    setPlayers((prev) => {
      if (next === prev.length) {
        return prev;
      }
      if (next > prev.length) {
        const additions = Array.from({ length: next - prev.length }, (_, offset) => ({
          id: randomUUID(),
          name: defaultPlayerName(prev.length + offset),
          elapsedMs: 0,
          colorIndex: (prev.length + offset) % 6,
        }));
        return [...prev, ...additions];
      }
      return prev.slice(0, next);
    });
    setCurrentIndex((index) => clampIndex(index, next));
  };

  const startSequence = () => {
    if (!canStart) {
      return;
    }
    setTurnStartedAt(Date.now());
    setIsRunning(true);
  };

  const pauseSequence = () => {
    setPlayers(flushActiveElapsed());
    setIsRunning(false);
    setTurnStartedAt(null);
  };

  const completeTurn = () => {
    if (!canDone) {
      return;
    }
    const withFlush = flushActiveElapsed();
    const nextIndex = nextPlayerIndexAntiClockwise(currentIndex, withFlush.length);
    setPlayers(withFlush);
    setCurrentIndex(nextIndex);
    setTurnStartedAt(Date.now());
  };

  const handleClose = () => {
    if (isRunning) {
      setPlayers(flushActiveElapsed());
      setIsRunning(false);
      setTurnStartedAt(null);
    }
    onClose();
  };

  const saveToDb = async () => {
    const pausedPlayers = isRunning ? flushActiveElapsed() : players;
    if (pausedPlayers.length < SEQUENCE_TIMER_MIN_PLAYERS) {
      toastError("Cannot save", "Add at least two players.");
      return;
    }
    setSaving(true);
    try {
      await saveSequenceTimerForClient({
        players: pausedPlayers,
        currentPlayerIndex: clampIndex(currentIndex, pausedPlayers.length),
        isRunning: false,
      });
      setPlayers(pausedPlayers);
      setIsRunning(false);
      setTurnStartedAt(null);
      toastSuccess("Sequence timer saved");
    } catch (error) {
      toastError("Save failed", error?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Sequence timer"
      onClose={handleClose}
      panelClassName="max-w-md"
      scrollBody
    >
      <p className="text-sm text-muted-foreground">
        Turns move counter-clockwise around the ring. Each player&apos;s time adds up
        across rounds. Save to restore counts later.
      </p>

      {loadError ? (
        <div className="mt-3">
          <Alert variant="error">{loadError}</Alert>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mt-4">
            <SequenceTimerRing
              players={players}
              currentIndex={currentIndex}
              displayElapsedById={displayElapsedById}
              isRunning={isRunning}
            />
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-center">
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
              {isRunning && activePlayer
                ? `${activePlayer.name}'s turn`
                : "Current turn"}
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight">
              {formatSequenceElapsed(activeDisplayMs)}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isRunning ? (
              <>
                <Button type="button" className="flex-1" onClick={completeTurn}>
                  Done — next player
                </Button>
                <Button type="button" variant="secondary" onClick={pauseSequence}>
                  Pause
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="flex-1"
                onClick={startSequence}
                disabled={!canStart}
              >
                Start sequence
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={saveToDb}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : "Save count"}
            </Button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">Players</span>
              <span className="text-[0.6875rem] text-muted-foreground">
                {SEQUENCE_TIMER_MIN_PLAYERS}–{SEQUENCE_TIMER_MAX_PLAYERS}
              </span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                disabled={
                  !canEditRoster || players.length <= SEQUENCE_TIMER_MIN_PLAYERS
                }
                onClick={() => setPlayerCount(players.length - 1)}
              >
                Remove seat
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                disabled={
                  !canEditRoster || players.length >= SEQUENCE_TIMER_MAX_PLAYERS
                }
                onClick={() => setPlayerCount(players.length + 1)}
              >
                Add seat
              </Button>
            </div>
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li key={player.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: `hsl(${
                        SEQUENCE_PLAYER_HUES[
                          player.colorIndex % SEQUENCE_PLAYER_HUES.length
                        ]
                      } 60% 48%)`,
                    }}
                    aria-hidden
                  />
                  <Input
                    value={player.name}
                    disabled={!canEditRoster}
                    onChange={(event) => {
                      const name = event.target.value;
                      setPlayers((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name } : item,
                        ),
                      );
                    }}
                    aria-label={`Name for player ${index + 1}`}
                    className="h-8 text-xs"
                  />
                  <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                    {formatSequenceElapsed(displayElapsedById[player.id] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
            {isRunning ? (
              <p className="mt-2 text-[0.6875rem] text-muted-foreground">
                Pause to edit players or change seats.
              </p>
            ) : null}
          </div>
        </>
      )}
    </Modal>
  );
}
