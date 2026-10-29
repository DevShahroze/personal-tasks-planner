"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import TaskContentBlocks from "@/components/tasks/task-content-blocks";
import TaskSubtasksPanel from "@/components/tasks/task-subtasks-panel";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  useDeleteTaskMutation,
  useSubtasks,
  useTask,
  useUpdateTaskMutation,
} from "@/hooks/use-tasks";
import { useCategories } from "@/hooks/use-categories";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import TaskNotesPanel from "@/components/tasks/task-notes-panel";
import {
  TASK_DECISION_STATUS_LABEL,
  TASK_INTENT_LABEL,
} from "@/lib/task-commerce/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { formatScheduleInstant } from "@/lib/scheduling/client-form";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id;
  const taskQuery = useTask(taskId);
  const categories = useCategories();
  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleConflicts, setScheduleConflicts] = useState([]);
  const [incompleteSubtasks, setIncompleteSubtasks] = useState([]);

  const task = taskQuery.data;
  const subtasksQuery = useSubtasks(taskId, Boolean(task && !task.parentTaskId));
  const parentTaskQuery = useTask(task?.parentTaskId, Boolean(task?.parentTaskId));

  if (taskQuery.isLoading || categories.isLoading) {
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
    if (!window.confirm(`Delete this task?${subtaskNote}`)) return;
    await deleteTask.mutateAsync(taskId);
    router.push(task.parentTaskId ? `/tasks/${task.parentTaskId}` : "/tasks");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
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
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel edit" : "Edit details"}
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
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

      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <TaskForm
            taskId={taskId}
            initialValues={task}
            categories={categories.data?.items}
            submitting={updateTask.isPending}
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
              try {
                await updateTask.mutateAsync({ id: taskId, body: values });
                setMessage("Task updated");
                setEditing(false);
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
      ) : (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <Meta label="Status" value={task.status} />
          <Meta label="Priority" value={task.priority} />
          <Meta label="Category" value={task.category?.name || "—"} />
          <Meta label="Task date" value={formatDate(task.taskDate)} />
          <Meta label="Timeline start" value={formatDate(task.timelineStart)} />
          <Meta label="Timeline end" value={formatDate(task.timelineEnd)} />
          <Meta
            label="Schedule"
            value={
              task.schedule?.mode && task.schedule.mode !== "unscheduled"
                ? `${task.schedule.mode}${
                    task.schedule.scheduledStart
                      ? ` · ${formatScheduleInstant(task.schedule.scheduledStart, task.schedule.timezone || "Asia/Karachi")} – ${formatScheduleInstant(task.schedule.scheduledEnd, task.schedule.timezone || "Asia/Karachi")}`
                      : ""
                  }`
                : "Unscheduled"
            }
          />
          <Meta
            label="Recurrence"
            value={
              task.recurrence?.enabled
                ? `Every ${task.recurrence.interval} ${task.recurrence.unit} · Next due ${formatDate(task.recurrence.nextDueDate)}`
                : "Not recurring"
            }
          />
          <Meta
            label="Next appointment"
            value={formatDate(task.recurrence?.nextAppointmentDate)}
          />
          <Meta
            label="Purchase/sale intent"
            value={TASK_INTENT_LABEL[task.intent] || "None"}
          />
          <Meta
            label="Decision"
            value={TASK_DECISION_STATUS_LABEL[task.decisionStatus] || "—"}
          />
          <Meta
            label="Estimated value"
            value={formatCurrency(task.estimatedValue, task.currency)}
          />
          <Meta
            label="Actual value"
            value={formatCurrency(task.actualValue, task.currency)}
          />
          <Meta label="Updated" value={formatDateTime(task.updatedAt)} />
          <Meta label="Created" value={formatDateTime(task.createdAt)} />
          <div className="md:col-span-2">
            <Meta label="Description" value={task.description || "—"} />
          </div>
        </div>
      )}

      {!task.parentTaskId ? <TaskSubtasksPanel parentTaskId={taskId} /> : null}

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

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
