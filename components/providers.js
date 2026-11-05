"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { getQueryClient } from "@/lib/query-client";
import { abortOngoingClientApiRequests } from "@/lib/api-client";
import { bootstrapActivityLoggerSession } from "@/lib/activity-logger";
import PageTracker from "@/components/activity/page-tracker";
import TouchViewportEffects from "@/components/layout/touch-viewport-effects";
import ToastHost from "@/components/ui/toast-host";
import { AppDataProvider } from "@/contexts/app-data-context";
import { ConfirmProvider } from "@/contexts/confirm-context";

export default function Providers({ children, withAppCatalog = false }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    bootstrapActivityLoggerSession();
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      abortOngoingClientApiRequests();
      queryClient.cancelQueries();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [queryClient]);

  const tree = (
    <ConfirmProvider>
      <TouchViewportEffects />
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      {children}
      <ToastHost />
    </ConfirmProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {withAppCatalog ? <AppDataProvider>{tree}</AppDataProvider> : tree}
    </QueryClientProvider>
  );
}
