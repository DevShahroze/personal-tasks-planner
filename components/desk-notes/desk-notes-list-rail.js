"use client";

import DeskNotesListBody from "@/components/desk-notes/desk-notes-list-body";

export default function DeskNotesListRail() {
  return (
    <aside className="hidden w-44 shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-2">
        <span className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
          All notes
        </span>
      </div>
      <DeskNotesListBody />
    </aside>
  );
}
