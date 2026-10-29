"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import { useCategories } from "@/hooks/use-categories";
import { useCreateTaskMutation } from "@/hooks/use-tasks";
import Alert from "@/components/ui/alert";
import Spinner from "@/components/ui/spinner";

export default function NewTaskPage() {
  const router = useRouter();
  const categories = useCategories();
  const createTask = useCreateTaskMutation();
  const [error, setError] = useState("");
  const [scheduleConflicts, setScheduleConflicts] = useState([]);

  if (categories.isLoading) return <Spinner label="Loading…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Create task</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <TaskForm
          categories={categories.data?.items}
          submitting={createTask.isPending}
          submitLabel="Create task"
          scheduleConflicts={scheduleConflicts}
          onClearScheduleConflicts={() => setScheduleConflicts([])}
          onSubmit={async (values) => {
            setError("");
            setScheduleConflicts([]);
            try {
              const task = await createTask.mutateAsync(values);
              router.push(`/tasks/${task._id}`);
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
    </div>
  );
}
