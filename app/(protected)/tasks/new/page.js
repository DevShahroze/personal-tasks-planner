"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import { useCreateTaskMutation } from "@/hooks/use-tasks";
import Alert from "@/components/ui/alert";

export default function NewTaskPage() {
  const router = useRouter();
  const createTask = useCreateTaskMutation();
  const [error, setError] = useState("");
  const [scheduleConflicts, setScheduleConflicts] = useState([]);

  return (
    <div className="page-stack w-full max-w-6xl">
      <h1 className="page-title">Create task</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <TaskForm
        submitting={createTask.isPending}
        submitLabel="Create task"
        scheduleConflicts={scheduleConflicts}
        onClearScheduleConflicts={() => setScheduleConflicts([])}
        onSubmit={async (values) => {
          setError("");
          setScheduleConflicts([]);
          try {
            await createTask.mutateAsync(values);
            router.push("/tasks");
          } catch (err) {
            if (err.conflicts?.length) {
              setScheduleConflicts(err.conflicts);
            }
            if (Array.isArray(err.details)) {
              setError(err.details.join(", "));
            } else {
              setError(err.message || "Failed to create task");
            }
          }
        }}
      />
    </div>
  );
}
