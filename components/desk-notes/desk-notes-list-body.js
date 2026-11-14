"use client";

import { useDeskNotes } from "@/contexts/desk-notes-context";
import { useConfirm } from "@/contexts/confirm-context";
import Button from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

function TrashIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DeskNotesListBody({ onAfterSelect, touchDeleteAlways = false }) {
  const confirm = useConfirm();
  const {
    items,
    activeId,
    selectNote,
    deleteNote,
    listQuery,
    startNewNote,
    isDirty,
    save,
  } = useDeskNotes();

  const onSelect = async (id) => {
    if (id === activeId) {
      onAfterSelect?.();
      return;
    }
    if (isDirty) {
      await save();
    }
    await selectNote(id);
    onAfterSelect?.();
  };

  const onDelete = async (id, title) => {
    const ok = await confirm({
      title: "Delete note?",
      description: `Remove “${title}”? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await deleteNote(id);
    if (!activeId || activeId === id) {
      startNewNote();
    }
  };

  const deleteVisibility = touchDeleteAlways
    ? "opacity-100"
    : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
      {listQuery.isLoading ? (
        <p className="px-1 text-xs text-muted-foreground">Loading…</p>
      ) : null}
      {!listQuery.isLoading && !items.length ? (
        <p className="px-1 text-xs text-muted-foreground">No notes yet.</p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const selected = item._id === activeId;
          return (
            <li key={item._id} className="group relative">
              <button
                type="button"
                className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 pr-8 text-left text-xs transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-muted"
                }`}
                onClick={() => void onSelect(item._id)}
              >
                <span className="line-clamp-2 font-medium leading-snug">
                  {item.title || "Untitled"}
                </span>
                <span
                  className={`text-[0.625rem] ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {formatDateTime(item.updatedAt)}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                className={`absolute right-0.5 top-1 h-7 w-7 px-0 ${deleteVisibility} ${
                  selected ? "text-primary-foreground hover:bg-primary-foreground/15" : ""
                }`}
                title="Delete note"
                aria-label={`Delete ${item.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(item._id, item.title || "Untitled");
                }}
              >
                <TrashIcon />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}