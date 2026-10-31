"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import { useCreateTaskMutation } from "@/hooks/use-tasks";
import { mergeSchedulePatch, validateSchedule } from "@/lib/scheduling/validate";
import { defaultSchedule } from "@/lib/scheduling/defaults";
import { toastError } from "@/lib/toast-bus";

export default function NewTaskPage() {
  const router = useRouter();
  const createTask = useCreateTaskMutation();
  const [scheduleConflicts, setScheduleConflicts] = useState([]);

  return (
    <div className="page-stack w-full max-w-6xl pb-24">
      <h1 className="page-title">Create task</h1>
      <TaskForm
        submitting={createTask.isPending}
        submitLabel="Create task"
        scheduleConflicts={scheduleConflicts}
        onClearScheduleConflicts={() => setScheduleConflicts([])}
        onSubmit={async (values) => {
          setScheduleConflicts([]);
          const scheduleCheck = validateSchedule(
            mergeSchedulePatch(defaultSchedule(), values.schedule),
          );
          if (!scheduleCheck.ok) {
            toastError(scheduleCheck.errors.join(", "));
            return;
          }
          try {
            await createTask.mutateAsync(values);
            router.push("/tasks");
          } catch (err) {
            if (err.conflicts?.length) {
              setScheduleConflicts(err.conflicts);
            }
          }
        }}
      />
    </div>
  );
}
