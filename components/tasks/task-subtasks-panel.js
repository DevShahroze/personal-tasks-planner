"use client";

import { useState } from "react";
import Link from "next/link";
import { TASK_STATUSES } from "@/lib/constants";
import { formatSubtaskSummary } from "@/lib/subtasks/constants";
import { useSubtaskMutations, useSubtasks } from "@/hooks/use-tasks";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";
import { useConfirm } from "@/contexts/confirm-context";

export default function TaskSubtasksPanel({ parentTaskId }) {
  const confirm = useConfirm();
  const subtasksQuery = useSubtasks(parentTaskId);
  const { createSubtask, updateSubtask, deleteSubtask } =
    useSubtaskMutations(parentTaskId);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const items = subtasksQuery.data?.items || [];
  const summary = subtasksQuery.data?.summary || { total: 0, completed: 0 };

  const onAdd = async (event) => {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      return;
    }
    try {
      await createSubtask.mutateAsync({ title: title.trim() });
      setTitle("");
    } catch (err) {
      setError(err.message || "Could not add subtask");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Subtasks</h2>
          <p className="text-xs text-muted-foreground">
            {formatSubtaskSummary(summary)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {subtasksQuery.isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading subtasks…</p>
      ) : !items.length ? (
        <p className="mt-3 text-xs text-muted-foreground">No subtasks yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((subtask) => (
            <li
              key={subtask._id}
              className="flex flex-wrap items-center gap-2 py-2 text-sm"
            >
              <Link
                href={`/tasks/${subtask._id}`}
                className="min-w-0 flex-1 font-medium hover:underline"
              >
                {subtask.title}
              </Link>
              <Select
                value={subtask.status}
                className="w-auto min-w-[7rem]"
                onChange={async (event) => {
                  setError("");
                  try {
                    await updateSubtask.mutateAsync({
                      id: subtask._id,
                      body: { status: event.target.value },
                    });
                  } catch (err) {
                    setError(err.message || "Could not update subtask");
                  }
                }}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="danger"
                className="px-2 py-1 text-xs"
                disabled={deleteSubtask.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete subtask?",
                    description: `Delete subtask "${subtask.title}"? This cannot be undone.`,
                    confirmLabel: "Delete",
                    variant: "danger",
                  });
                  if (!ok) {
                    return;
                  }
                  setError("");
                  try {
                    await deleteSubtask.mutateAsync(subtask._id);
                  } catch (err) {
                    setError(err.message || "Could not delete subtask");
                  }
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-4 flex flex-wrap gap-2" onSubmit={onAdd}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New subtask title"
          className="min-w-[12rem] flex-1"
        />
        <Button type="submit" disabled={createSubtask.isPending || !title.trim()}>
          Add subtask
        </Button>
      </form>
    </div>
  );
}
