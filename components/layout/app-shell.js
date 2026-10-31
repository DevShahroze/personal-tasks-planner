"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme/theme-toggle";
import ActivityLoggerControls from "@/components/nav/activity-logger-controls";
import {
  TaskProcessorMainChrome,
  TaskProcessorNavStatus,
} from "@/contexts/task-processor-context";
import PageGoBack from "@/components/layout/page-go-back";
import FloatingToolsWidget from "@/components/tools/floating-tools-widget";
import { NAV_LINK_ICONS } from "@/components/nav/nav-link-icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/thoughts", label: "Thoughts" },
  { href: "/plans", label: "Plans" },
  { href: "/planning", label: "Planning" },
  { href: "/financial-records", label: "Financial" },
  { href: "/categories", label: "Categories" },
];

function NavLinks({ onNavigate, className = "" }) {
  const pathname = usePathname();
  return (
    <nav className={`space-y-0.5 ${className}`}>
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_LINK_ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-muted"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-90" /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onLogout, loggingOut, compact = false }) {
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <ActivityLoggerControls compact={compact} />
      <Button
        variant="secondary"
        className="w-full md:hidden"
        onClick={onLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "Logging out…" : "Logout"}
      </Button>
    </div>
  );
}

export default function AppShell({ children }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const closeMobile = () => setMobileOpen(false);

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
        <TaskProcessorNavStatus className="hidden max-w-[18rem] sm:flex" />
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
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar p-3 text-sidebar-foreground md:flex">
          <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
            Navigation
          </p>
          <NavLinks className="flex-1 overflow-y-auto" />
          <SidebarFooter onLogout={logout} loggingOut={loggingOut} compact />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
          <TaskProcessorMainChrome>
            <PageGoBack />
            {children}
          </TaskProcessorMainChrome>
        </main>
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
              <p className="text-sm font-semibold">Menu</p>
              <Button type="button" variant="ghost" onClick={closeMobile}>
                Close
              </Button>
            </div>
            <NavLinks onNavigate={closeMobile} className="flex-1 overflow-y-auto" />
            <SidebarFooter
              onLogout={async () => {
                closeMobile();
                await logout();
              }}
              loggingOut={loggingOut}
              compact
            />
          </div>
        </div>
      ) : null}

      <FloatingToolsWidget />
    </div>
  );
}
