"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { buildFollowUpTaskPatch, buildVisitKindMap } from "@/lib/task-visits/follow-up";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useTaskNoteMutations, useTaskNotes } from "@/hooks/use-task-notes";
import { useUpdateTaskMutation } from "@/hooks/use-tasks";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";

export default function TaskVisitsPanel({ task, onTaskRescheduled }) {
  const taskId = task._id;
  const notesQuery = useTaskNotes(taskId);
  const { createNote, deleteNote } = useTaskNoteMutations(taskId);
  const updateTask = useUpdateTaskMutation();
  const clientToday = useClientTodayYmd();

  const [visitYmd, setVisitYmd] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [nextVisitYmd, setNextVisitYmd] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const todayYmd = clientToday?.ymd || "";
  const effectiveVisitYmd = visitYmd || todayYmd;

  const visits = useMemo(() => {
    const items = notesQuery.data?.items || [];
    return items
      .filter((item) => item.visitDate)
      .sort(
        (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
      );
  }, [notesQuery.data?.items]);

  const visitKindMap = useMemo(() => buildVisitKindMap(visits), [visits]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Visits & follow-ups</h2>
      <p className="text-xs text-muted-foreground">
        Record each attempt on this task. Schedule the next visit on the same task —
        checklist and history stay intact.
      </p>

      {error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-3">
          <Alert variant="success">{message}</Alert>
        </div>
      ) : null}

      {notesQuery.isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading visit history…</p>
      ) : !visits.length ? (
        <p className="mt-3 text-xs text-muted-foreground">No visits recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {visits.map((visit) => (
            <li key={visit._id} className="py-3">
              <p className="text-sm font-medium">
                {visitKindMap.get(String(visit._id)) || "Visit"} ·{" "}
                {formatDate(visit.visitDate)}
              </p>
              {visit.content ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {visit.content}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No note added.</p>
              )}
              <div className="mt-2">
                <Button
                  type="button"
                  variant="danger"
                  className="px-2 py-1 text-xs"
                  disabled={deleteNote.isPending}
                  onClick={async () => {
                    if (!window.confirm("Delete this visit record?")) {
                      return;
                    }
                    setError("");
                    try {
                      await deleteNote.mutateAsync(visit._id);
                    } catch (err) {
                      setError(err.message || "Could not delete visit");
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 space-y-3 border-t border-border pt-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setMessage("");
          if (!effectiveVisitYmd) {
            setError("Visit date is required.");
            return;
          }
          if (scheduleFollowUp && !nextVisitYmd) {
            setError("Choose the next visit date or turn off scheduling.");
            return;
          }

          try {
            await createNote.mutateAsync({
              visitDate: effectiveVisitYmd,
              content: visitNote.trim(),
            });

            if (scheduleFollowUp && nextVisitYmd) {
              const built = buildFollowUpTaskPatch(task, nextVisitYmd);
              if (!built.ok) {
                setError(built.error);
                return;
              }
              const body = {
                ...built.patch,
                expectedUpdatedAt: task.updatedAt,
              };
              if (task.status === "Completed") {
                body.status = "To Do";
              }
              await updateTask.mutateAsync({ id: taskId, body });
              onTaskRescheduled?.();
              setMessage("Visit recorded and next visit scheduled.");
            } else {
              setMessage("Visit recorded. Task stays on its current schedule.");
            }

            setVisitNote("");
            setVisitYmd("");
            if (scheduleFollowUp) {
              setNextVisitYmd("");
            }
          } catch (err) {
            setError(err.message || "Could not save visit");
          }
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>Visit date</span>
          <Input
            type="date"
            value={visitYmd || todayYmd}
            onChange={(event) => setVisitYmd(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>What happened? (optional)</span>
          <Textarea
            rows={3}
            placeholder="e.g. Bank asked for CNIC copy and account statement."
            value={visitNote}
            onChange={(event) => setVisitNote(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={scheduleFollowUp}
            onChange={(event) => setScheduleFollowUp(event.target.checked)}
          />
          Schedule next visit on this task (updates task date / calendar)
        </label>
        {scheduleFollowUp ? (
          <label className="block space-y-1 text-sm">
            <span>Next visit date</span>
            <Input
              type="date"
              value={nextVisitYmd}
              onChange={(event) => setNextVisitYmd(event.target.value)}
              required={scheduleFollowUp}
            />
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Does not mark the task complete. Use status on the form when the objective is
          done. Completing a task and scheduling another visit reopens it as To Do.
        </p>
        <Button
          type="submit"
          disabled={
            createNote.isPending ||
            updateTask.isPending ||
            (!effectiveVisitYmd && !todayYmd)
          }
        >
          {createNote.isPending || updateTask.isPending
            ? "Saving…"
            : scheduleFollowUp
              ? "Record visit & schedule follow-up"
              : "Record visit"}
        </Button>
      </form>
    </div>
  );
}
