"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskProcessorApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { taskProcessorStatusQueryOptions } from "@/lib/query-cache";
import { getQueryClient, queryKeys } from "@/lib/query-client";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast-bus";
import {
  isAnotherTabDrivingProcessor,
  notifyProcessorDriveStarted,
  refreshProcessorDriverLock,
  releaseProcessorDriverLock,
  subscribeProcessorDriverEvents,
  tryAcquireProcessorDriverLock,
} from "@/lib/task-processor/client-driver-coordination";

const AUTO_DRIVE_YMD_KEY = "__ptpTaskProcessorAutoDriveYmd";

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
  const clientTodayYmd = useClientTodayYmd()?.ymd ?? "";
  const [driving, setDriving] = useState(false);
  const driveRef = useRef(false);
  const drivingRef = useRef(false);
  const notificationRunIdRef = useRef(null);

  const statusQuery = useQuery({
    queryKey: queryKeys.taskProcessor.status,
    queryFn: taskProcessorApi.status,
    ...taskProcessorStatusQueryOptions(),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (drivingRef.current || data?.locked) {
        return 2500;
      }
      if (data?.shouldRun && isAnotherTabDrivingProcessor()) {
        return 3000;
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

  const notifyRunOutcome = useCallback((current, trigger) => {
    const sessionKey = current?.dailySession
      ? `${current.dailySession.calendarDateYmd}:${current.dailySession.status}`
      : current?.lastExecution?.completedAt || "";
    if (!sessionKey || notificationRunIdRef.current === sessionKey) {
      return;
    }
    const failed =
      current?.dailySession?.status === "failed" ||
      current?.lastExecution?.status === "failed" ||
      current?.run?.status === "failed";
    const completed =
      current?.dailySession?.status === "completed" ||
      (!current?.shouldRun && !failed && current?.completedToday);
    if (!failed && !completed) {
      return;
    }
    notificationRunIdRef.current = sessionKey;
    if (failed) {
      toastError(
        "Daily task rollover failed",
        current?.lastExecution?.errorSummary ||
          current?.run?.errorSummary ||
          "Some tasks could not be rescheduled. Try again or run manually.",
      );
      return;
    }
    toastSuccess(
      trigger === "manual"
        ? "Manual rollover finished"
        : "Daily task rollover finished",
    );
  }, []);

  const driveProcessor = useCallback(
    async (options = {}) => {
      const trigger = options.trigger === "manual" ? "manual" : "automatic";
      if (driveRef.current) {
        return;
      }
      if (!tryAcquireProcessorDriverLock()) {
        return;
      }
      driveRef.current = true;
      drivingRef.current = true;
      setDriving(true);
      notifyProcessorDriveStarted();
      let didRunSteps = false;
      let notifiedStart = false;
      let lastStepDone = false;
      try {
        let current = await queryClient.fetchQuery({
          queryKey: queryKeys.taskProcessor.status,
          queryFn: taskProcessorApi.status,
          staleTime: 0,
        });
        if (!current.locked) {
          if (trigger === "manual" && !current.canManualRun) {
            return;
          }
          if (trigger !== "manual" && !current.shouldRun) {
            return;
          }
        }
        if ((current.shouldRun || current.canManualRun) && !notifiedStart) {
          notifiedStart = true;
          toastInfo(
            trigger === "manual"
              ? "Manual task rollover started"
              : "Daily task rollover started",
            "Incomplete tasks from prior days are being rescheduled. Editing is paused until this finishes.",
          );
        }
        let guard = 0;
        const shouldDrive = (data) =>
          data.locked || (trigger === "manual" ? data.canManualRun : data.shouldRun);
        while (shouldDrive(current) && guard < 500) {
          refreshProcessorDriverLock();
          if (current.locked && isAnotherTabDrivingProcessor()) {
            await sleep(800);
            current = await queryClient.fetchQuery({
              queryKey: queryKeys.taskProcessor.status,
              queryFn: taskProcessorApi.status,
              staleTime: 0,
            });
            guard += 1;
            continue;
          }
          if (current.locked && !didRunSteps) {
            await sleep(600);
            current = await queryClient.fetchQuery({
              queryKey: queryKeys.taskProcessor.status,
              queryFn: taskProcessorApi.status,
              staleTime: 0,
            });
            guard += 1;
            continue;
          }
          if (!shouldDrive(current)) {
            break;
          }
          const stepResult = await taskProcessorApi.step({ executionType: trigger });
          didRunSteps = true;
          lastStepDone = Boolean(stepResult.done);
          current = stepResult.status;
          queryClient.setQueryData(queryKeys.taskProcessor.status, current);
          if (stepResult.done) {
            notifyRunOutcome(current, trigger);
            break;
          }
          guard += 1;
        }
        if (didRunSteps && !lastStepDone && !current.shouldRun && !current.locked) {
          notifyRunOutcome(current, trigger);
        }
      } catch {
        await refreshStatus();
        toastError(
          "Daily task rollover failed",
          "Check your connection and try again.",
        );
      } finally {
        driveRef.current = false;
        drivingRef.current = false;
        setDriving(false);
        releaseProcessorDriverLock();
        await refreshStatus();
        if (didRunSteps) {
          invalidateTaskViewsAfterRun();
        }
      }
    },
    [notifyRunOutcome, queryClient, refreshStatus],
  );

  useEffect(() => {
    return subscribeProcessorDriverEvents(() => {
      void refreshStatus();
    });
  }, [refreshStatus]);

  useEffect(() => {
    if (!clientTodayYmd) {
      return undefined;
    }
    let cancelled = false;
    void refreshStatus().then((data) => {
      if (cancelled || !data?.calendarDateYmd) {
        return;
      }
      const win = typeof window !== "undefined" ? window : null;
      if (win?.[AUTO_DRIVE_YMD_KEY] === data.calendarDateYmd) {
        return;
      }
      if (win) {
        win[AUTO_DRIVE_YMD_KEY] = data.calendarDateYmd;
      }
      if (data.shouldRun && !driveRef.current && !isAnotherTabDrivingProcessor()) {
        void driveProcessor({ trigger: "automatic" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientTodayYmd, driveProcessor, refreshStatus]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshStatus().then((data) => {
        if (data?.shouldRun && !driveRef.current && !isAnotherTabDrivingProcessor()) {
          void driveProcessor({ trigger: "automatic" });
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [driveProcessor, refreshStatus]);

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
    if (locked) {
      return "Running…";
    }
    if (status?.lifecycleStatus === "failed") {
      return "Last run failed";
    }
    if (status?.completedToday) {
      return "Completed today";
    }
    const completedAt = status?.lastCompleted?.completedAt;
    if (!completedAt) {
      return status?.lifecycleStatus === "pending" ? "Run pending" : "Not run yet";
    }
    return formatDateTime(completedAt, status?.timezone);
  }, [
    locked,
    status?.lastCompleted?.completedAt,
    status?.completedToday,
    status?.lifecycleStatus,
    status?.timezone,
  ]);

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
