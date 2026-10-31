"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import TaskDetailView from "@/components/tasks/task-detail-view";
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
import { toastError, toastSuccess } from "@/lib/toast-bus";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id;
  return <TaskDetailPageBody key={String(taskId)} taskId={taskId} />;
}

function TaskDetailPageBody({ taskId }) {
  const router = useRouter();
  const confirm = useConfirm();
  const taskQuery = useTask(taskId);
  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const [scheduleConflicts, setScheduleConflicts] = useState([]);
  const [creatingItems, setCreatingItems] = useState(false);
  const [editing, setEditing] = useState(false);

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
    try {
      await updateTask.mutateAsync({ id: taskId, body: { status: "Cancelled" } });
      toastSuccess("Task cancelled");
    } catch {
      // API mutation toast
    }
  };

  const canCancelTask = task.status !== "Cancelled" && task.status !== "Completed";
  const showReadOnlyFooter = !editing;

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
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

      <div className="overflow-visible rounded-lg border border-border bg-card p-4">
        {editing ? (
          <TaskForm
            key={`${taskId}-${task.updatedAt}`}
            taskId={taskId}
            initialValues={task}
            submitting={updateTask.isPending}
            submitLabel="Update task"
            onCancelEdit={() => {
              setEditing(false);
              setScheduleConflicts([]);
            }}
            onDelete={onDelete}
            deleting={deleteTask.isPending}
            creatingItemsFromDescription={creatingItems}
            onCreateItemsFromDescription={async (descriptionText) => {
              const labels = parseCommaSeparatedLabels(descriptionText);
              if (!labels.length) {
                toastError("Add comma-separated text in the description first.");
                return;
              }
              setCreatingItems(true);
              try {
                const newBlocks = createCheckboxBlocksFromLabels(
                  labels,
                  task.contentBlocks || [],
                );
                if (!newBlocks.length) {
                  toastSuccess("No new items — matching checkboxes already exist.");
                  return;
                }
                await updateTask.mutateAsync({
                  id: taskId,
                  body: {
                    contentBlocks: [...(task.contentBlocks || []), ...newBlocks],
                    expectedUpdatedAt: task.updatedAt,
                  },
                });
                toastSuccess(
                  `Added ${newBlocks.length} checkbox item${newBlocks.length === 1 ? "" : "s"}.`,
                );
              } catch {
                // API mutation toast
              } finally {
                setCreatingItems(false);
              }
            }}
            scheduleConflicts={scheduleConflicts}
            onClearScheduleConflicts={() => setScheduleConflicts([])}
            recordingRecurrence={updateTask.isPending}
            onRecordRecurrenceCompletion={async (payload) => {
              try {
                await updateTask.mutateAsync({
                  id: taskId,
                  body: { recordRecurrenceCompletion: payload },
                });
                toastSuccess("Occurrence recorded");
              } catch {
                // API mutation toast
              }
            }}
            onSubmit={async (values) => {
              setScheduleConflicts([]);
              const scheduleCheck = validateSchedule(
                mergeSchedulePatch(task.schedule || defaultSchedule(), values.schedule),
              );
              if (!scheduleCheck.ok) {
                toastError(scheduleCheck.errors.join(", "));
                return;
              }
              try {
                await updateTask.mutateAsync({ id: taskId, body: values });
                toastSuccess("Task updated");
                setEditing(false);
              } catch (err) {
                if (err.conflicts?.length) {
                  setScheduleConflicts(err.conflicts);
                }
              }
            }}
          />
        ) : (
          <TaskDetailView task={task} />
        )}
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

      {showReadOnlyFooter ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:left-56 md:px-4">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            {canCancelTask ? (
              <Button type="button" variant="secondary" onClick={onCancelTask}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
