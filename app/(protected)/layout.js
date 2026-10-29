import { Suspense } from "react";
import Providers from "@/components/providers";
import AppShell from "@/components/layout/app-shell";
import ErrorBoundary from "@/components/error-boundary";
import { TaskProcessorProvider } from "@/contexts/task-processor-context";

export default function ProtectedLayout({ children }) {
  return (
    <Providers>
      <ErrorBoundary
        title="Application error"
        description="The app shell failed to render. Try again or reload the page."
      >
        <Suspense fallback={<div className="p-3 text-xs">Loading…</div>}>
          <TaskProcessorProvider>
            <AppShell>{children}</AppShell>
          </TaskProcessorProvider>
        </Suspense>
      </ErrorBoundary>
    </Providers>
  );
}
