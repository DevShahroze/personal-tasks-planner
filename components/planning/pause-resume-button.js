"use client";

import Button from "@/components/ui/button";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "expired"]);

export function canPausePlanningItem(status) {
  return status && !TERMINAL_STATUSES.has(status) && status !== "paused";
}

export default function PauseResumeButton({
  status,
  onPause,
  onResume,
  disabled = false,
  className = "",
}) {
  if (!status || TERMINAL_STATUSES.has(status)) {
    return null;
  }
  if (status === "paused") {
    return (
      <Button
        type="button"
        variant="secondary"
        className={className}
        disabled={disabled}
        onClick={onResume}
      >
        Resume
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      disabled={disabled}
      onClick={onPause}
    >
      Pause
    </Button>
  );
}
