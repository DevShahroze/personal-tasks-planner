"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import TaskContentBlocks from "@/components/tasks/task-content-blocks";
import {
  createCheckboxBlocksFromLabels,
  parseCommaSeparatedLabels,
} from "@/lib/content-blocks";
import TaskSubtasksPanel from "@/components/tasks/task-subtasks-panel";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  useDeleteTaskMutation,
  useSubtasks,
  useTask,
  useUpdateTaskMutation,
} from "@/hooks/use-tasks";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import TaskNotesPanel from "@/components/tasks/task-notes-panel";
import TaskVisitsPanel from "@/components/tasks/task-visits-panel";
import { mergeSchedulePatch, validateSchedule } from "@/lib/scheduling/validate";
import { defaultSchedule } from "@/lib/scheduling/defaults";
import { useConfirm } from "@/contexts/confirm-context";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const taskId = params.id;
  const taskQuery = useTask(taskId);
  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleConflicts, setScheduleConflicts] = useState([]);
  const [incompleteSubtasks, setIncompleteSubtasks] = useState([]);
  const [creatingItems, setCreatingItems] = useState(false);

  const task = taskQuery.data;
  const subtasksQuery = useSubtasks(taskId, Boolean(task && !task.parentTaskId));
  const parentTaskQuery = useTask(task?.parentTaskId, Boolean(task?.parentTaskId));

  if (taskQuery.isLoading) {
    return <Spinner label="Loading task…" />;
  }

  if (taskQuery.isError || !task) {
    return <Alert variant="error">Task not found</Alert>;
  }

  const onDelete = async () => {
    const subtaskNote =
      !task.parentTaskId && subtasksQuery.data?.summary?.total
        ? ` This will also delete ${subtasksQuery.data.summary.total} subtask(s).`
        : "";
    const ok = await confirm({
      title: "Delete task?",
      description: `Delete this task?${subtaskNote} This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await deleteTask.mutateAsync(taskId);
    router.push(task.parentTaskId ? `/tasks/${task.parentTaskId}` : "/tasks");
  };

  const onCancelTask = async () => {
    const ok = await confirm({
      title: "Cancel task?",
      description: "Cancel this task? It will stay in your list as cancelled.",
      confirmLabel: "Cancel task",
      variant: "primary",
    });
    if (!ok) {
      return;
    }
    setError("");
    try {
      await updateTask.mutateAsync({ id: taskId, body: { status: "Cancelled" } });
      setMessage("Task cancelled");
    } catch (err) {
      setError(err.message || "Could not cancel task");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/tasks" className="hover:underline">
              Tasks
            </Link>{" "}
            / {task.title}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{task.title}</h1>
          {task.parentTaskId ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Subtask of{" "}
              <Link
                href={`/tasks/${task.parentTaskId}`}
                className="font-medium hover:underline"
              >
                {parentTaskQuery.data?.title || "parent task"}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {task.status !== "Cancelled" && task.status !== "Completed" ? (
            <Button variant="secondary" onClick={onCancelTask}>
              Cancel task
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {incompleteSubtasks.length ? (
        <Alert variant="error">
          <p>Complete these subtasks before marking this task completed:</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {incompleteSubtasks.map((item) => (
              <li key={item.id}>
                {item.title} ({item.status})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <div className="overflow-visible rounded-lg border border-border bg-card p-4">
        <TaskForm
          key={`${taskId}-${task.updatedAt}`}
          taskId={taskId}
          initialValues={task}
          submitting={updateTask.isPending}
          submitLabel="Update task"
          onDelete={onDelete}
          deleting={deleteTask.isPending}
          creatingItemsFromDescription={creatingItems}
          onCreateItemsFromDescription={async (descriptionText) => {
            const labels = parseCommaSeparatedLabels(descriptionText);
            if (!labels.length) {
              setError("Add comma-separated text in the description first.");
              return;
            }
            setError("");
            setMessage("");
            setCreatingItems(true);
            try {
              const newBlocks = createCheckboxBlocksFromLabels(
                labels,
                task.contentBlocks || [],
              );
              if (!newBlocks.length) {
                setMessage("No new items — matching checkboxes already exist.");
                return;
              }
              await updateTask.mutateAsync({
                id: taskId,
                body: {
                  contentBlocks: [...(task.contentBlocks || []), ...newBlocks],
                  expectedUpdatedAt: task.updatedAt,
                },
              });
              setMessage(
                `Added ${newBlocks.length} checkbox item${newBlocks.length === 1 ? "" : "s"}.`,
              );
            } catch (err) {
              setError(err.message || "Could not create items");
            } finally {
              setCreatingItems(false);
            }
          }}
          scheduleConflicts={scheduleConflicts}
          onClearScheduleConflicts={() => setScheduleConflicts([])}
          recordingRecurrence={updateTask.isPending}
          onRecordRecurrenceCompletion={async (payload) => {
            setError("");
            try {
              await updateTask.mutateAsync({
                id: taskId,
                body: { recordRecurrenceCompletion: payload },
              });
              setMessage("Occurrence recorded");
            } catch (err) {
              setError(err.message || "Could not record occurrence");
            }
          }}
          onSubmit={async (values) => {
            setError("");
            setScheduleConflicts([]);
            setIncompleteSubtasks([]);
            const scheduleCheck = validateSchedule(
              mergeSchedulePatch(task.schedule || defaultSchedule(), values.schedule),
            );
            if (!scheduleCheck.ok) {
              setError(scheduleCheck.errors.join(", "));
              return;
            }
            try {
              await updateTask.mutateAsync({ id: taskId, body: values });
              setMessage("Task updated");
            } catch (err) {
              if (err.conflicts?.length) {
                setScheduleConflicts(err.conflicts);
              }
              if (err.incompleteSubtasks?.length) {
                setIncompleteSubtasks(err.incompleteSubtasks);
              }
              if (Array.isArray(err.details)) {
                setError(err.details.join(", "));
              } else {
                setError(err.message || "Update failed");
              }
            }
          }}
        />
      </div>

      {!task.parentTaskId ? <TaskSubtasksPanel parentTaskId={taskId} /> : null}

      <TaskVisitsPanel task={task} />

      <TaskNotesPanel taskId={taskId} />

      <div className="rounded-lg border border-border bg-card p-4">
        <TaskContentBlocks task={task} />
      </div>

      <EntityLinksPanel
        entityType="task"
        entityId={taskId}
        linkedThoughts={task.linkedThoughts || []}
        linkedPlans={task.linkedPlans || []}
      />
    </div>
  );
}
