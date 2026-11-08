"use client";

import { Suspense, useState } from "react";
import ThemeToggle from "@/components/theme/theme-toggle";
import Button from "@/components/ui/button";
import DeskSidebarSection from "@/components/desk/desk-sidebar-section";
import WorkspaceIframeHost from "@/components/workspace/workspace-iframe-host";
import WorkspaceTabBar from "@/components/workspace/workspace-tab-bar";
import InlineLoginForm from "@/components/auth/inline-login-form";
import { ShellSidebar } from "@/components/layout/shell-sidebar";
import { useShellNav } from "@/hooks/use-shell-nav";
import { useWorkspace } from "@/contexts/workspace-context";

function GuestMain({ loginOpen, setLoginOpen }) {
  const { openTabIds, hydrated } = useWorkspace();
  const workspaceActive = hydrated && openTabIds.length > 0;

  if (workspaceActive) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Open apps from{" "}
            <strong className="font-medium text-foreground">Personal desk</strong> in
            the sidebar.
          </p>
        </div>
        <WorkspaceTabBar />
        <WorkspaceIframeHost guestDesk />
      </div>
    );
  }

  if (loginOpen) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <InlineLoginForm onCancel={() => setLoginOpen(false)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">
        Use the <span className="font-medium text-foreground">Personal desk</span> in
        the sidebar for the sequence timer and workspace apps. Sign in for tasks, plans,
        and the rest of the app.
      </p>
      <Button type="button" onClick={() => setLoginOpen(true)}>
        Sign in
      </Button>
    </div>
  );
}

export default function GuestAppShell() {
  const { leftExpanded, toggleLeft } = useShellNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <Button
          type="button"
          variant="secondary"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          Menu
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Tasks & Plans</p>
          <p className="hidden text-[0.6875rem] text-muted-foreground sm:block">
            Personal workspace
          </p>
        </div>
        <div className="flex-1" />
        <ThemeToggle />
        {!loginOpen ? (
          <Button
            type="button"
            variant="secondary"
            className="hidden sm:inline-flex"
            onClick={() => setLoginOpen(true)}
          >
            Sign in
          </Button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <ShellSidebar
          side="left"
          title="Personal desk"
          expanded={leftExpanded}
          onToggleExpanded={toggleLeft}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <DeskSidebarSection collapsed={!leftExpanded} />
          </div>
        </ShellSidebar>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
          <GuestMain loginOpen={loginOpen} setLoginOpen={setLoginOpen} />
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,16rem)] flex-col border-r border-border bg-sidebar p-3 text-sidebar-foreground shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Personal desk</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMobileOpen(false)}
              >
                Close
              </Button>
            </div>
            <DeskSidebarSection />
            <Button
              type="button"
              className="mt-auto w-full"
              onClick={() => {
                setMobileOpen(false);
                setLoginOpen(true);
              }}
            >
              Sign in
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
