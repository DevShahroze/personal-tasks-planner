"use client";

import { useDeskNotes } from "@/contexts/desk-notes-context";
import Button from "@/components/ui/button";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import StickyPageFooter from "@/components/layout/sticky-page-footer";
import { MAX_DESK_NOTE_CONTENT_LENGTH } from "@/lib/desk-notes/constants.js";
import { isRichTextEmpty } from "@/lib/rich-text/plain-text";

export default function DeskNotesEditor() {
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
        <Button
          type="button"
          variant="secondary"
          className="h-8 shrink-0 text-xs"
          onClick={startNewNote}
        >
          New note
        </Button>
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
    </div>
  );
}
