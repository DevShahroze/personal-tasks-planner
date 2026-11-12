"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme/theme-toggle";
import { TaskProcessorMainChrome } from "@/contexts/task-processor-context";
import PageGoBack from "@/components/layout/page-go-back";
import FloatingToolsWidget from "@/components/tools/floating-tools-widget";
import { ShellSidebar } from "@/components/layout/shell-sidebar";
import RightSidebarUtilities from "@/components/nav/right-sidebar-utilities";
import ConnectivityIndicator from "@/components/nav/connectivity-indicator";
import { NAV_LINK_ICONS, NavAdminIcon } from "@/components/nav/nav-link-icons";
import { useShellNav } from "@/hooks/use-shell-nav";
import DeskSidebarSection from "@/components/desk/desk-sidebar-section";
import WorkspaceIframeHost from "@/components/workspace/workspace-iframe-host";
import DeskNotesListRail from "@/components/desk-notes/desk-notes-list-rail";
import { clearDeskNoteSession } from "@/lib/desk-notes/storage.js";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/thoughts", label: "Thoughts" },
  { href: "/notes", label: "Notes" },
  { href: "/plans", label: "Plans" },
  { href: "/workspace", label: "Workspace" },
  { href: "/important-info", label: "Important info" },
  { href: "/planning", label: "Planning" },
  { href: "/financial-records", label: "Financial" },
  { href: "/categories", label: "Categories" },
];

const rightNavItems = [{ href: "/admin", label: "Admin" }];

function NavLinks({ items, collapsed = false, onNavigate, className = "" }) {
  const pathname = usePathname();
  return (
    <nav className={`space-y-0.5 ${className}`}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_LINK_ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={`flex items-center rounded-md text-xs font-medium transition-colors duration-150 ${
              collapsed ? "justify-center px-2 py-2" : "gap-2 px-2.5 py-1.5"
            } ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-muted"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-90" /> : null}
            {collapsed ? null : <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavFooter({ onLogout, loggingOut }) {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={onLogout}
      disabled={loggingOut}
    >
      {loggingOut ? "Logging out…" : "Logout"}
    </Button>
  );
}

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { leftExpanded, rightExpanded, toggleLeft, toggleRight } = useShellNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      clearDeskNoteSession();
      await authApi.logout();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const onNotes =
    pathname === "/notes" || (pathname && pathname.startsWith("/notes/"));
  const mainScrollClass = onNotes ? "overflow-hidden" : "overflow-y-auto";
  const mainInnerClass =
    onNotes || pathname === "/workspace"
      ? "flex min-h-0 flex-1 flex-col"
      : undefined;

  const closeMobile = () => setMobileOpen(false);
  const closeMobileAdmin = () => setMobileAdminOpen(false);

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
        <ConnectivityIndicator />
        <Button
          type="button"
          variant="secondary"
          className="h-8 w-8 px-0 md:hidden"
          onClick={() => setMobileAdminOpen(true)}
          aria-label="Open administration menu"
          title="Administration"
        >
          <NavAdminIcon className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button
          type="button"
          variant="secondary"
          className="hidden md:inline-flex"
          onClick={logout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out…" : "Logout"}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <ShellSidebar
          side="left"
          title="Navigation"
          expanded={leftExpanded}
          onToggleExpanded={toggleLeft}
        >
          <NavLinks
            items={mainNavItems}
            collapsed={!leftExpanded}
            className="flex-1 overflow-y-auto overflow-x-hidden"
          />
          <DeskSidebarSection collapsed={!leftExpanded} />
        </ShellSidebar>

        <main
          className={`flex min-w-0 flex-1 flex-col p-3 md:p-4 ${mainScrollClass}`}
        >
          <TaskProcessorMainChrome>
            <PageGoBack />
            <div className={mainInnerClass}>
              {children}
              <WorkspaceIframeHost />
            </div>
          </TaskProcessorMainChrome>
        </main>

        {onNotes ? <DeskNotesListRail /> : null}

        <ShellSidebar
          side="right"
          title="Administration"
          expanded={rightExpanded}
          onToggleExpanded={toggleRight}
          footer={<RightSidebarUtilities />}
        >
          <NavLinks
            items={rightNavItems}
            collapsed={!rightExpanded}
            className="flex-1 overflow-y-auto overflow-x-hidden"
          />
        </ShellSidebar>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="Close navigation menu"
            onClick={closeMobile}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,16rem)] flex-col border-r border-border bg-sidebar p-3 text-sidebar-foreground shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Navigation</p>
              <Button type="button" variant="ghost" onClick={closeMobile}>
                Close
              </Button>
            </div>
            <NavLinks
              items={mainNavItems}
              onNavigate={closeMobile}
              className="flex-1 overflow-y-auto"
            />
            <DeskSidebarSection />
            <MobileNavFooter
              onLogout={async () => {
                closeMobile();
                await logout();
              }}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      ) : null}

      {mobileAdminOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="Close admin menu"
            onClick={closeMobileAdmin}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,16rem)] flex-col border-l border-border bg-sidebar p-3 text-sidebar-foreground shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Administration</p>
              <Button type="button" variant="ghost" onClick={closeMobileAdmin}>
                Close
              </Button>
            </div>
            <NavLinks
              items={rightNavItems}
              onNavigate={closeMobileAdmin}
              className="overflow-y-auto"
            />
            <div className="mt-auto border-t border-border pt-3">
              <RightSidebarUtilities />
            </div>
          </div>
        </div>
      ) : null}

      <FloatingToolsWidget />
    </div>
  );
}
