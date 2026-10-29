"use client";

export default function FieldInfoPopover({ children, label = "Field help" }) {
  return (
    <details className="relative inline-block [&_summary::-webkit-details-marker]:hidden">
      <summary
        className="inline-flex h-4 w-4 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-border bg-muted text-[0.625rem] font-semibold leading-none text-muted-foreground hover:border-primary/40 hover:text-foreground"
        aria-label={label}
      >
        i
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-64 rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed text-muted-foreground shadow-md">
        {children}
      </div>
    </details>
  );
}
