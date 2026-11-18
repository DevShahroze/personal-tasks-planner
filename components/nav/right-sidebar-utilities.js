"use client";

import ActivityLoggerControls from "@/components/nav/activity-logger-controls";
import NavUpcomingHolidaySidebar from "@/components/nav/nav-upcoming-holiday-sidebar";
import { TaskProcessorNavStatus } from "@/contexts/task-processor-context";

export default function RightSidebarUtilities() {
  return (
    <div className="space-y-3">
      <NavUpcomingHolidaySidebar />
      <TaskProcessorNavStatus layout="sidebar" />
      <ActivityLoggerControls compact />
    </div>
  );
}
