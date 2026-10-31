"use client";

import { createContext, useContext, useState } from "react";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import { useTaskProcessorSlice } from "@/contexts/slices/task-processor-slice";
import { useConfirm } from "@/contexts/confirm-context";
import { taskProcessorApi } from "@/lib/api-client";

const TaskProcessorContext = createContext(null);

function TaskProcessorBanner() {
  const { active, progressLabel } = useTaskProcessor();

  if (!active) {
    return null;
  }

  return (
    <Alert variant="info">
      <p className="font-medium">Daily task processor running</p>
      <p className="mt-1 text-sm">
        Incomplete tasks from prior days are being rescheduled. {progressLabel}. Editing
        is temporarily disabled — please wait until this finishes.
      </p>
    </Alert>
  );
}

function TaskProcessorShellGate({ children }) {
  const { locked } = useTaskProcessor();

  return (
    <div className="relative min-h-0 flex-1">
      {locked ? (
        <div
          className="pointer-events-none absolute inset-0 z-40 bg-background/40"
          aria-hidden
        />
      ) : null}
      <div
        className={locked ? "pointer-events-none select-none opacity-60" : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function TaskProcessorNavStatus({ className = "" }) {
  const { navLastRunLabel, active, driveProcessor } = useTaskProcessor();
  const confirm = useConfirm();
  const [manualPending, setManualPending] = useState(false);

  const onManualRun = async () => {
    if (active || manualPending) {
      return;
    }
    const ok = await confirm({
      title: "Run task rollover now?",
      description:
        "Incomplete To Do and In Progress tasks scheduled on past days (through today) will move to the next day. Editing is paused while this runs.",
      confirmLabel: "Run rollover",
      variant: "primary",
    });
    if (!ok) {
      return;
    }
    setManualPending(true);
    try {
      await taskProcessorApi.manualRun();
      await driveProcessor();
    } catch {
      // driveProcessor refreshes status on failure
    } finally {
      setManualPending(false);
    }
  };

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <p
        className="min-w-0 flex-1 truncate text-[0.6875rem] text-muted-foreground"
        title={
          active
            ? "Daily task processor is running"
            : `Last daily task processor run: ${navLastRunLabel}`
        }
      >
        <span className="font-medium text-foreground/80">Last rollover:</span>{" "}
        {navLastRunLabel}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0 px-2 py-0.5 text-[0.6875rem]"
        disabled={active || manualPending}
        onClick={onManualRun}
      >
        {manualPending || active ? "Running…" : "Run"}
      </Button>
    </div>
  );
}

export function TaskProcessorMainChrome({ children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TaskProcessorBanner />
      <TaskProcessorShellGate>{children}</TaskProcessorShellGate>
    </div>
  );
}

export function TaskProcessorProvider({ children }) {
  const value = useTaskProcessorSlice();

  return (
    <TaskProcessorContext.Provider value={value}>
      {children}
    </TaskProcessorContext.Provider>
  );
}

export function useTaskProcessor() {
  const context = useContext(TaskProcessorContext);
  if (!context) {
    throw new Error("useTaskProcessor must be used within TaskProcessorProvider");
  }
  return context;
}
