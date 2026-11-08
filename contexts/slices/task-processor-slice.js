"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskProcessorApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import {
  taskProcessorStatusQueryOptions,
  TASK_PROCESSOR_STATUS_POLL_MS,
} from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-client";
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
const TASK_PROCESSOR_ACTIVE_POLL_MS = 2500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function refreshTaskViewsAfterRollover(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.charts });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.listings });
  return queryClient.refetchQueries({
    queryKey: ["tasks", "calendar"],
    type: "all",
  });
}

/** Daily rollover driver — used only under protected layout via TaskProcessorProvider. */
export function useTaskProcessorSlice() {
  const queryClient = useQueryClient();
  const clientTodayYmd = useClientTodayYmd()?.ymd ?? "";
  const [driving, setDriving] = useState(false);
  const driveRef = useRef(false);
  const drivingRef = useRef(false);
  const notificationRunIdRef = useRef(null);
  const wasLockedRef = useRef(false);
  const tabVisibleRef = useRef(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const syncVisibility = () => {
      const visible = document.visibilityState === "visible";
      tabVisibleRef.current = visible;
      setTabVisible(visible);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [queryClient]);

  const { data: status = null, refetch: refetchTaskProcessorStatus } = useQuery({
    queryKey: queryKeys.taskProcessor.status,
    queryFn: ({ signal }) => taskProcessorApi.status({ signal }),
    enabled: tabVisible,
    ...taskProcessorStatusQueryOptions(),
    refetchInterval: (query) => {
      if (!tabVisibleRef.current) {
        return false;
      }
      const data = query.state.data;
      if (drivingRef.current || data?.locked) {
        return TASK_PROCESSOR_ACTIVE_POLL_MS;
      }
      return TASK_PROCESSOR_STATUS_POLL_MS;
    },
  });

  const locked = Boolean(status?.locked);

  const refreshStatus = useCallback(async () => {
    const result = await refetchTaskProcessorStatus();
    return result.data;
  }, [refetchTaskProcessorStatus]);

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
        let current = await refreshStatus();
        if (!current) {
          return;
        }
        if (!current.locked) {
          if (trigger !== "manual" && !current.shouldRun) {
            return;
          }
        }
        if (
          (trigger === "manual" || current.shouldRun || current.locked) &&
          !notifiedStart
        ) {
          notifiedStart = true;
          toastInfo(
            trigger === "manual"
              ? "Manual task rollover started"
              : "Daily task rollover started",
            "Incomplete tasks from prior days are being rescheduled. Editing is paused until this finishes.",
          );
        }
        let guard = 0;
        while (guard < 500) {
          refreshProcessorDriverLock();
          if (current.locked && isAnotherTabDrivingProcessor()) {
            await sleep(800);
            current = await refreshStatus();
            if (!current) {
              break;
            }
            guard += 1;
            continue;
          }
          if (current.locked && !didRunSteps) {
            await sleep(600);
            current = await refreshStatus();
            if (!current) {
              break;
            }
            guard += 1;
            continue;
          }
          if (trigger !== "manual" && !current.shouldRun && !current.locked) {
            break;
          }
          if (trigger === "manual" && guard > 0 && lastStepDone) {
            break;
          }
          let stepResult;
          try {
            stepResult = await taskProcessorApi.step({ executionType: trigger });
          } catch (err) {
            if (err.status === 409 && err.processorStatus) {
              current = err.processorStatus;
              queryClient.setQueryData(queryKeys.taskProcessor.status, current);
              if (current.locked && !didRunSteps) {
                await sleep(800);
              } else if (
                trigger !== "manual" &&
                !current.shouldRun &&
                !current.locked
              ) {
                break;
              } else if (trigger === "manual" && lastStepDone) {
                break;
              }
              guard += 1;
              continue;
            }
            throw err;
          }
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
        if (
          didRunSteps &&
          !lastStepDone &&
          !current.locked &&
          (trigger === "manual" || !current.shouldRun)
        ) {
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
          await refreshTaskViewsAfterRollover(queryClient);
        }
      }
    },
    [notifyRunOutcome, queryClient, refreshStatus],
  );

  useEffect(() => {
    const wasLocked = wasLockedRef.current;
    wasLockedRef.current = Boolean(status?.locked);
    if (wasLocked && !status?.locked) {
      void refreshTaskViewsAfterRollover(queryClient);
    }
  }, [queryClient, status?.locked]);

  useEffect(() => {
    return subscribeProcessorDriverEvents(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshStatus();
    });
  }, [refreshStatus]);

  useEffect(() => {
    if (!clientTodayYmd || !status?.calendarDateYmd) {
      return undefined;
    }
    const win = typeof window !== "undefined" ? window : null;
    if (win?.[AUTO_DRIVE_YMD_KEY] === status.calendarDateYmd) {
      return undefined;
    }
    if (win) {
      win[AUTO_DRIVE_YMD_KEY] = status.calendarDateYmd;
    }
    if (status.shouldRun && !driveRef.current && !isAnotherTabDrivingProcessor()) {
      void driveProcessor({ trigger: "automatic" });
    }
    return undefined;
  }, [clientTodayYmd, driveProcessor, status]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (status?.shouldRun && !driveRef.current && !isAnotherTabDrivingProcessor()) {
        void driveProcessor({ trigger: "automatic" });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [driveProcessor, status?.shouldRun]);

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
      const failedAt =
        status?.lastExecution?.completedAt || status?.lastExecution?.startedAt;
      if (failedAt) {
        return `Failed · ${formatDateTime(failedAt, status?.timezone)}`;
      }
      return "Last run failed";
    }
    const completedAt =
      status?.dailySession?.completedAt ||
      status?.lastCompleted?.completedAt ||
      (status?.lastExecution?.status === "completed"
        ? status.lastExecution.completedAt
        : null);
    if (completedAt) {
      return formatDateTime(completedAt, status?.timezone);
    }
    return status?.lifecycleStatus === "pending" ? "Run pending" : "Not run yet";
  }, [locked, status]);

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
