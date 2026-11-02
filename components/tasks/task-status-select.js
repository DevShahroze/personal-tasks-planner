"use client";

import { TASK_STATUSES } from "@/lib/constants";
import Select from "@/components/ui/select";

export default function TaskStatusSelect({
  value,
  disabled = false,
  pending = false,
  onChange,
  className = "h-8 min-w-[7.5rem] text-xs",
  stopPropagation = false,
  "aria-label": ariaLabel = "Task status",
}) {
  return (
    <Select
      value={value}
      disabled={disabled || pending}
      aria-label={ariaLabel}
      className={className}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      onChange={(event) => onChange(event.target.value)}
    >
      {TASK_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </Select>
  );
}
