"use client";

import { usePathname } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import WorkspaceIframePanel from "@/components/workspace/workspace-iframe-panel";

export default function WorkspaceIframeHost() {
  const pathname = usePathname();
  const { apps, openTabIds, activeTabId, hydrated } = useWorkspace();
  const onWorkspace = pathname === "/workspace";

  if (!hydrated || !openTabIds.length) {
    return null;
  }

  const openApps = openTabIds
    .map((id) => apps.find((app) => app.id === id))
    .filter(Boolean);

  if (!openApps.length) {
    return null;
  }

  return (
    <div
      className={
        onWorkspace
          ? "relative mt-1 flex min-h-0 w-full flex-1 flex-col"
          : "pointer-events-none fixed left-[-12000px] top-0 z-[-1] h-[720px] w-[1280px] overflow-hidden opacity-0"
      }
      aria-hidden={!onWorkspace}
    >
      {openApps.map((app) => (
        <WorkspaceIframePanel
          key={app.id}
          app={app}
          active={onWorkspace && app.id === activeTabId}
        />
      ))}
    </div>
  );
}
