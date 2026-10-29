"use client";

import { createContext, useContext } from "react";
import Alert from "@/components/ui/alert";
import { useTaskProcessorSlice } from "@/contexts/slices/task-processor-slice";

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
  const { navLastRunLabel, active } = useTaskProcessor();

  return (
    <p
      className={`truncate text-[0.6875rem] text-muted-foreground ${className}`}
      title={
        active
          ? "Daily task processor is running"
          : `Last daily task processor run: ${navLastRunLabel}`
      }
    >
      <span className="font-medium text-foreground/80">Last rollover:</span>{" "}
      {navLastRunLabel}
    </p>
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
