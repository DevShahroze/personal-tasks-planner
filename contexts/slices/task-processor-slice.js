"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskProcessorApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { taskProcessorStatusQueryOptions } from "@/lib/query-cache";
import { getQueryClient, queryKeys } from "@/lib/query-client";

const AUTO_DRIVE_FLAG = "__ptpTaskProcessorAutoDriveDone";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function invalidateTaskViewsAfterRun() {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ["tasks"] });
  client.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  client.invalidateQueries({ queryKey: queryKeys.dashboard.charts });
  client.invalidateQueries({ queryKey: queryKeys.dashboard.listings });
  client.invalidateQueries({ queryKey: ["tasks", "calendar"] });
}

/** Daily rollover driver — used only under protected layout via TaskProcessorProvider. */
export function useTaskProcessorSlice() {
  const queryClient = useQueryClient();
  const [driving, setDriving] = useState(false);
  const driveRef = useRef(false);
  const drivingRef = useRef(false);

  const statusQuery = useQuery({
    queryKey: queryKeys.taskProcessor.status,
    queryFn: taskProcessorApi.status,
    ...taskProcessorStatusQueryOptions(),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (drivingRef.current || data?.locked) {
        return 2000;
      }
      return false;
    },
  });

  const status = statusQuery.data ?? null;
  const locked = Boolean(status?.locked);

  const refreshStatus = useCallback(async () => {
    const result = await statusQuery.refetch();
    return result.data;
  }, [statusQuery]);

  const driveProcessor = useCallback(async () => {
    if (driveRef.current) {
      return;
    }
    driveRef.current = true;
    drivingRef.current = true;
    setDriving(true);
    let didRunSteps = false;
    try {
      let current = await queryClient.fetchQuery({
        queryKey: queryKeys.taskProcessor.status,
        queryFn: taskProcessorApi.status,
        staleTime: 0,
      });
      let guard = 0;
      while ((current.shouldRun || current.locked) && guard < 500) {
        if (current.locked) {
          await sleep(600);
          current = await queryClient.fetchQuery({
            queryKey: queryKeys.taskProcessor.status,
            queryFn: taskProcessorApi.status,
            staleTime: 0,
          });
          guard += 1;
          continue;
        }
        if (!current.shouldRun) {
          break;
        }
        const stepResult = await taskProcessorApi.step();
        didRunSteps = true;
        current = stepResult.status;
        queryClient.setQueryData(queryKeys.taskProcessor.status, current);
        if (stepResult.done) {
          break;
        }
        guard += 1;
      }
    } catch {
      await refreshStatus();
    } finally {
      driveRef.current = false;
      drivingRef.current = false;
      setDriving(false);
      if (didRunSteps) {
        invalidateTaskViewsAfterRun();
      }
    }
  }, [queryClient, refreshStatus]);

  useEffect(() => {
    const win = typeof window !== "undefined" ? window : null;
    if (win?.[AUTO_DRIVE_FLAG]) {
      void queryClient.fetchQuery({
        queryKey: queryKeys.taskProcessor.status,
        queryFn: taskProcessorApi.status,
        staleTime: taskProcessorStatusQueryOptions().staleTime,
      });
      return undefined;
    }
    if (win) {
      win[AUTO_DRIVE_FLAG] = true;
    }
    const timer = window.setTimeout(() => {
      void driveProcessor();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [driveProcessor, queryClient]);

  useEffect(() => {
    if (!status?.locked) {
      return undefined;
    }
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status?.locked]);

  const active = locked || driving;

  const progressLabel = useMemo(() => {
    const run = status?.run;
    if (!run) {
      return "Preparing…";
    }
    return `${run.processed} of ${run.total} tasks moved to the next day`;
  }, [status?.run]);

  const navLastRunLabel = useMemo(() => {
    if (active) {
      return "Running…";
    }
    const completedAt = status?.lastCompleted?.completedAt;
    if (!completedAt) {
      return "Not run yet";
    }
    return formatDateTime(completedAt, status?.timezone);
  }, [active, status?.lastCompleted?.completedAt, status?.timezone]);

  return useMemo(
    () => ({
      status,
      driving,
      locked,
      active,
      progressLabel,
      navLastRunLabel,
      refreshStatus,
      driveProcessor,
    }),
    [
      status,
      driving,
      locked,
      active,
      progressLabel,
      navLastRunLabel,
      refreshStatus,
      driveProcessor,
    ],
  );
}
