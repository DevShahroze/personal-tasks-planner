"use client";

import { useEffect, useRef, useState } from "react";

export default function FieldInfoPopover({ children, label = "Field help" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-border bg-muted text-[0.625rem] font-semibold leading-none text-muted-foreground hover:border-primary/40 hover:text-foreground"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-64 rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed text-muted-foreground shadow-md"
          role="tooltip"
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
