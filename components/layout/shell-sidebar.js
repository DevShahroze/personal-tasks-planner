"use client";

import Button from "@/components/ui/button";

function CollapseChevron({ direction, collapsed }) {
  const rotation =
    direction === "left"
      ? collapsed
        ? ""
        : "rotate-180"
      : collapsed
        ? "rotate-180"
        : "";
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${rotation}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ShellSidebar({
  side,
  title,
  expanded,
  onToggleExpanded,
  children,
  footer = null,
}) {
  const isLeft = side === "left";
  const widthClass = expanded ? (isLeft ? "md:w-56" : "md:w-44") : "md:w-14";

  return (
    <aside
      className={`hidden shrink-0 flex-col overflow-hidden border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex ${isLeft ? "border-r" : "border-l"} ${widthClass}`}
    >
      <div
        className={`flex h-10 shrink-0 items-center border-b border-border px-2 ${expanded ? "justify-between gap-2" : "justify-center"}`}
      >
        {expanded ? (
          <span className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 shrink-0 px-0"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? `Collapse ${title.toLowerCase()}`
              : `Expand ${title.toLowerCase()}`
          }
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <CollapseChevron direction={side} collapsed={!expanded} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2">{children}</div>

      {footer && expanded ? (
        <div className="shrink-0 border-t border-border p-2">{footer}</div>
      ) : null}
    </aside>
  );
}
