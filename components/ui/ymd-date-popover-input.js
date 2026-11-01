"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/input";
import SimpleYmdCalendar from "@/components/ui/simple-ymd-calendar";

export default function YmdDatePopoverInput({
  value,
  onChange,
  placeholder = "Select date",
  ariaLabel,
  validateYmd,
  required,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocumentMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative max-w-xs">
      <Input
        type="text"
        readOnly
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="cursor-pointer"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) {
              setOpen((prev) => !prev);
            }
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1 rounded-md border border-border bg-card p-2 shadow-lg"
        >
          <SimpleYmdCalendar
            selectedYmd={value}
            ariaLabel={ariaLabel}
            validateYmd={validateYmd}
            onSelectYmd={(ymd) => {
              onChange(ymd);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
