"use client";

import ActivityLoggerControls from "@/components/nav/activity-logger-controls";
import { TaskProcessorNavStatus } from "@/contexts/task-processor-context";

export default function RightSidebarUtilities() {
  return (
    <div className="space-y-3">
      <TaskProcessorNavStatus layout="sidebar" />
      <ActivityLoggerControls compact />
    </div>
  );
}
