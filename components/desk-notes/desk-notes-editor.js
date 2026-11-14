"use client";

import { useEffect, useState } from "react";
import { useDeskNotes } from "@/contexts/desk-notes-context";
import Button from "@/components/ui/button";
import DeskNotesListBody from "@/components/desk-notes/desk-notes-list-body";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import StickyPageFooter from "@/components/layout/sticky-page-footer";
import { MAX_DESK_NOTE_CONTENT_LENGTH } from "@/lib/desk-notes/constants.js";
import { isRichTextEmpty } from "@/lib/rich-text/plain-text";

export default function DeskNotesEditor() {
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const {
    draft,
    setDraftContent,
    isDirty,
    saving,
    loadingNote,
    save,
    startNewNote,
    activeId,
    registerEditorFlush,
  } = useDeskNotes();

  useEffect(() => {
    if (!mobileListOpen) {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileListOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileListOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
          <p className="text-xs text-muted-foreground">
            {activeId ? "Editing note" : "New note"} · {draft.length.toLocaleString()}/
            {MAX_DESK_NOTE_CONTENT_LENGTH.toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs lg:hidden"
            onClick={() => setMobileListOpen(true)}
            aria-expanded={mobileListOpen}
          >
            All notes
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs"
            onClick={startNewNote}
          >
            New note
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {loadingNote ? (
          <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-muted-foreground">
            Loading note…
          </p>
        ) : null}
        <RichTextEditor
          name="content"
          placeholder="Start typing…"
          value={draft}
          onChange={(event) => setDraftContent(event.target.value)}
          onBindFlush={registerEditorFlush}
          resetKey={activeId ?? "new"}
          rows={12}
          maxRows={80}
          disabled={loadingNote}
          readOnly={loadingNote}
          className="flex min-h-0 flex-1 flex-col"
        />
      </div>

      <StickyPageFooter className="shrink-0">
        <Button
          type="button"
          disabled={!isDirty || saving || loadingNote || isRichTextEmpty(draft)}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </StickyPageFooter>

      {mobileListOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="Close notes list"
            onClick={() => setMobileListOpen(false)}
          />
          <div className="absolute bottom-0 left-0 flex max-h-[min(85dvh,32rem)] w-full flex-col rounded-t-lg border border-border bg-sidebar text-sidebar-foreground shadow-lg">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">All notes</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMobileListOpen(false)}
              >
                Close
              </Button>
            </div>
            <DeskNotesListBody
              touchDeleteAlways
              onAfterSelect={() => setMobileListOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
