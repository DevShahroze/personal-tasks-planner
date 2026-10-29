"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { getQueryClient } from "@/lib/query-client";
import { bootstrapActivityLoggerSession } from "@/lib/activity-logger";
import PageTracker from "@/components/activity/page-tracker";
import ToastHost from "@/components/ui/toast-host";
import { AppDataProvider } from "@/contexts/app-data-context";
import { ConfirmProvider } from "@/contexts/confirm-context";

export default function Providers({ children }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    bootstrapActivityLoggerSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppDataProvider>
        <ConfirmProvider>
          <Suspense fallback={null}>
            <PageTracker />
          </Suspense>
          {children}
          <ToastHost />
        </ConfirmProvider>
      </AppDataProvider>
    </QueryClientProvider>
  );
}
