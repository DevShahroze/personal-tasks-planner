"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import WorkspaceTabBar from "@/components/workspace/workspace-tab-bar";
import EmptyState from "@/components/ui/empty-state";
import Button from "@/components/ui/button";

export default function WorkspacePage() {
  const { apps, openTabIds, activeTabId, hydrated, repairActiveTab, openApp } =
    useWorkspace();

  useEffect(() => {
    if (hydrated) {
      repairActiveTab();
    }
  }, [hydrated, repairActiveTab]);

  const openApps = openTabIds
    .map((id) => apps.find((app) => app.id === id))
    .filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Run your other apps in tabs. Add apps from the sidebar under{" "}
          <strong className="font-medium text-foreground">Workspace apps</strong>.
        </p>
      </div>

      {hydrated && apps.length ? (
        <div className="flex flex-wrap gap-2">
          {apps.map((app) => (
            <Button
              key={app.id}
              type="button"
              variant={app.id === activeTabId ? "default" : "secondary"}
              className="h-8 max-w-[14rem] truncate text-xs"
              title={app.url}
              onClick={() => openApp(app.id)}
            >
              {app.name}
            </Button>
          ))}
        </div>
      ) : null}

      <WorkspaceTabBar />

      {!hydrated ? (
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      ) : openApps.length ? null : (
        <EmptyState
          title="No tabs open"
          description="Choose an app from the sidebar Workspace section, or use Manage apps to add URLs."
          action={
            <Link href="/dashboard">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
