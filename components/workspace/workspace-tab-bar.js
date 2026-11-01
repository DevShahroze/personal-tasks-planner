"use client";

import { useWorkspace } from "@/contexts/workspace-context";

export default function WorkspaceTabBar() {
  const { apps, openTabIds, activeTabId, setActiveTab, closeTab } = useWorkspace();

  if (!openTabIds.length) {
    return null;
  }

  const tabs = openTabIds
    .map((id) => apps.find((app) => app.id === id))
    .filter(Boolean);

  return (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-border pb-1"
      role="tablist"
      aria-label="Open workspace apps"
    >
      {tabs.map((app) => {
        const selected = app.id === activeTabId;
        return (
          <div
            key={app.id}
            className={`flex max-w-[14rem] shrink-0 items-center gap-1 rounded-t-md border border-b-0 border-border px-2 py-1 text-xs ${
              selected ? "bg-card font-medium" : "bg-muted/40 text-muted-foreground"
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              className="min-w-0 truncate text-left hover:underline"
              onClick={() => setActiveTab(app.id)}
            >
              {app.name}
            </button>
            <button
              type="button"
              className="shrink-0 rounded px-1 leading-none hover:bg-muted"
              aria-label={`Close ${app.name}`}
              onClick={(event) => {
                event.stopPropagation();
                closeTab(app.id);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
