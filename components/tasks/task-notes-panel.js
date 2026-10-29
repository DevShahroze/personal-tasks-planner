"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useTaskNoteMutations, useTaskNotes } from "@/hooks/use-task-notes";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import Alert from "@/components/ui/alert";

export default function TaskNotesPanel({ taskId }) {
  const notesQuery = useTaskNotes(taskId);
  const { createNote, updateNote, deleteNote } = useTaskNoteMutations(taskId);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [error, setError] = useState("");

  const items = (notesQuery.data?.items || []).filter((note) => !note.visitDate);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Notes</h2>
      <p className="text-xs text-muted-foreground">
        Separate from the task description. Newest first.
      </p>

      {error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {notesQuery.isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading notes…</p>
      ) : !items.length ? (
        <p className="mt-3 text-xs text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((note) => (
            <li key={note._id} className="py-3">
              {editingId === note._id ? (
                <form
                  className="space-y-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setError("");
                    try {
                      await updateNote.mutateAsync({
                        noteId: note._id,
                        body: { content: editingContent },
                      });
                      setEditingId(null);
                    } catch (err) {
                      setError(err.message || "Could not update note");
                    }
                  }}
                >
                  <Textarea
                    rows={3}
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateNote.isPending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDateTime(note.createdAt)}
                    {note.updatedAt && note.updatedAt !== note.createdAt
                      ? ` · Updated ${formatDateTime(note.updatedAt)}`
                      : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        setEditingId(note._id);
                        setEditingContent(note.content);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      disabled={deleteNote.isPending}
                      onClick={async () => {
                        if (!window.confirm("Delete this note?")) {
                          return;
                        }
                        setError("");
                        try {
                          await deleteNote.mutateAsync(note._id);
                        } catch (err) {
                          setError(err.message || "Could not delete note");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (!draft.trim()) {
            return;
          }
          try {
            await createNote.mutateAsync({ content: draft.trim() });
            setDraft("");
          } catch (err) {
            setError(err.message || "Could not add note");
          }
        }}
      >
        <Textarea
          rows={3}
          placeholder="Add a note"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" disabled={createNote.isPending || !draft.trim()}>
          Add note
        </Button>
      </form>
    </div>
  );
}
