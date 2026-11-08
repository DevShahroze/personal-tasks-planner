"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import SequenceTimerModal from "@/components/sequence-timer/sequence-timer-modal";

function SequenceTimerIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" opacity="0.35" />
      <circle cx="12" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="17.2" cy="14" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="6.8" cy="14" r="1.25" fill="currentColor" stroke="none" />
      <path d="M12 8v4l2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SequenceTimerSidebarSection({
  collapsed = false,
  nested = false,
}) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <>
        <div className={nested ? "" : "mt-2 space-y-0.5 border-t border-border pt-2"}>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-full px-0"
            title="Sequence timer"
            aria-label="Open sequence timer"
            onClick={() => setOpen(true)}
          >
            <SequenceTimerIcon />
          </Button>
        </div>
        <SequenceTimerModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className={nested ? "" : "mt-auto border-t border-border pt-2"}>
        <button
          type="button"
          className={`flex w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-sidebar-foreground transition-colors hover:bg-muted ${
            nested ? "py-1.5" : "py-2"
          }`}
          onClick={() => setOpen(true)}
        >
          <SequenceTimerIcon className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">Sequence timer</span>
        </button>
      </div>
      <SequenceTimerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
