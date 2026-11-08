"use client";

import { useEffect, useState } from "react";
import { DESK_SECTION_EXPANDED_KEY } from "@/lib/desk/constants.js";
import SequenceTimerSidebarSection from "@/components/sequence-timer/sequence-timer-sidebar-section";
import WorkspaceSidebarSection from "@/components/workspace/workspace-sidebar-section";
import Button from "@/components/ui/button";

function readDeskExpanded() {
  return window.localStorage.getItem(DESK_SECTION_EXPANDED_KEY) !== "0";
}

function DeskGlyph({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M4 10h16v9H4z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

export default function DeskSidebarSection({ collapsed = false }) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read desk expand preference after mount
    setExpanded(readDeskExpanded());
  }, []);

  const toggleSection = () => {
    setExpanded((value) => {
      const next = !value;
      window.localStorage.setItem(DESK_SECTION_EXPANDED_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="mt-auto space-y-0.5 border-t border-border pt-2">
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full px-0"
          title="Personal desk"
          aria-label="Personal desk"
          disabled
        >
          <DeskGlyph />
        </Button>
        <SequenceTimerSidebarSection collapsed nested />
        <WorkspaceSidebarSection collapsed nested />
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-border pt-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground hover:bg-muted"
        onClick={toggleSection}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 truncate">
          <DeskGlyph className="h-3.5 w-3.5 shrink-0 opacity-80" />
          Personal desk
        </span>
        <span className="shrink-0 text-xs" suppressHydrationWarning>
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-1 space-y-0.5">
          <SequenceTimerSidebarSection nested />
          <WorkspaceSidebarSection nested />
        </div>
      ) : null}
    </div>
  );
}
