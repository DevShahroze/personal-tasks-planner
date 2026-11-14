import { Suspense } from "react";
import Providers from "@/components/providers";
import AppShell from "@/components/layout/app-shell";
import ErrorBoundary from "@/components/error-boundary";
import { TaskProcessorProvider } from "@/contexts/task-processor-context";
import { TaskCalendarProvider } from "@/contexts/task-calendar-context";

import { PinLockProvider } from "@/contexts/pin-lock-context";
import { SessionIdleLogoutProvider } from "@/contexts/session-idle-logout-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { DeskNotesProvider } from "@/contexts/desk-notes-context";
import { WeatherProvider } from "@/contexts/weather-context";

export default function ProtectedLayout({ children }) {
  return (
    <Providers withAppCatalog>
      <ErrorBoundary
        title="Application error"
        description="The app shell failed to render. Try again or reload the page."
      >
        <Suspense fallback={<div className="p-3 text-xs">Loading…</div>}>
          <TaskProcessorProvider>
            <TaskCalendarProvider>
              <PinLockProvider>
                <SessionIdleLogoutProvider>
                  <WorkspaceProvider>
                    <DeskNotesProvider>
                      <WeatherProvider>
                        <AppShell>{children}</AppShell>
                      </WeatherProvider>
                    </DeskNotesProvider>
                  </WorkspaceProvider>
                </SessionIdleLogoutProvider>
              </PinLockProvider>
            </TaskCalendarProvider>
          </TaskProcessorProvider>
        </Suspense>
      </ErrorBoundary>
    </Providers>
  );
}
