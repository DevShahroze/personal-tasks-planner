import { Suspense } from "react";
import Providers from "@/components/providers";
import AppShell from "@/components/layout/app-shell";
import ErrorBoundary from "@/components/error-boundary";

export default function ProtectedLayout({ children }) {
  return (
    <Providers>
      <ErrorBoundary
        title="Application error"
        description="The app shell failed to render. Try again or reload the page."
      >
        <Suspense fallback={<div className="p-3 text-xs">Loading…</div>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </ErrorBoundary>
    </Providers>
  );
}
