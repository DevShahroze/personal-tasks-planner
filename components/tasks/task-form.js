"use client";

import { useMemo, useState } from "react";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";
import ErrorBoundary from "@/components/error-boundary";
import TaskScheduleFields, {
  buildInitialScheduleState,
  scheduleFromFormState,
} from "@/components/tasks/task-schedule-fields";
import TaskFormCalendarPicker, {
  TaskRecurrenceFields,
  buildInitialRecurrenceState,
  recurrenceFromFormState,
} from "@/components/tasks/task-recurrence-fields";
import { calculateNextDueDate } from "@/lib/recurrence/calculate";
import { normalizeRecurrence } from "@/lib/recurrence/defaults";
import { formatScheduleInstant } from "@/lib/scheduling/client-form";
import TaskCommerceFields, {
  commerceFromFormData,
} from "@/components/tasks/task-commerce-fields";

function dateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export default function TaskForm({
  taskId,
  initialValues,
  categories,
  onSubmit,
  submitting,
  submitLabel = "Save task",
  scheduleConflicts,
  onClearScheduleConflicts,
  onRecordRecurrenceCompletion,
  recordingRecurrence,
}) {
  const formId = "task-form";
  const [scheduleState, setScheduleState] = useState(() =>
    buildInitialScheduleState(initialValues),
  );
  const [recurrenceState, setRecurrenceState] = useState(() =>
    buildInitialRecurrenceState(initialValues, scheduleState.timezone),
  );
  const [taskDate, setTaskDate] = useState(() =>
    dateInputValue(initialValues?.taskDate),
  );
  const [taskDateWarning, setTaskDateWarning] = useState("");

  const schedulePayload = useMemo(
    () => scheduleFromFormState(scheduleState),
    [scheduleState],
  );

  const recurrencePreview = useMemo(() => {
    const normalized = normalizeRecurrence(recurrenceFromFormState(recurrenceState));
    return calculateNextDueDate(normalized, scheduleState.timezone);
  }, [recurrenceState, scheduleState.timezone]);

  const nextDueLabel = recurrencePreview.nextDueDate
    ? formatScheduleInstant(recurrencePreview.nextDueDate, scheduleState.timezone)
    : null;

  return (
    <form
      id={formId}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onClearScheduleConflicts?.();
        onSubmit({
          title: formData.get("title"),
          description: formData.get("description"),
          status: formData.get("status"),
          priority: formData.get("priority"),
          category: formData.get("category") || null,
          taskDate: taskDate || null,
          timelineStart: formData.get("timelineStart") || null,
          timelineEnd: formData.get("timelineEnd") || null,
          schedule: schedulePayload,
          recurrence: recurrenceFromFormState(recurrenceState),
          ...commerceFromFormData(formData),
        });
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>Title *</span>
        <Input name="title" defaultValue={initialValues?.title || ""} required />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <Textarea
          name="description"
          rows={4}
          defaultValue={initialValues?.description || ""}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span>Task date</span>
            <Input
              type="date"
              name="taskDateDisplay"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
            />
          </label>
          {taskDateWarning ? <Alert variant="info">{taskDateWarning}</Alert> : null}
          <ErrorBoundary
            title="Calendar unavailable"
            description="Use the date field above or save the task without the mini calendar."
          >
            <TaskFormCalendarPicker
              selectedYmd={taskDate}
              timeZone={scheduleState.timezone}
              scheduleForValidation={schedulePayload}
              onSelectYmd={(ymd, warning) => {
                setTaskDate(ymd);
                setTaskDateWarning(warning || "");
              }}
            />
          </ErrorBoundary>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          <label className="block space-y-1 text-sm">
            <span>Status</span>
            <Select name="status" defaultValue={initialValues?.status || "To Do"}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Priority</span>
            <Select name="priority" defaultValue={initialValues?.priority || "Medium"}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Category</span>
            <Select
              name="category"
              defaultValue={
                initialValues?.category?._id || initialValues?.category || ""
              }
            >
              <option value="">None</option>
              {(categories || []).map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Timeline start</span>
            <Input
              type="date"
              name="timelineStart"
              defaultValue={dateInputValue(initialValues?.timelineStart)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Timeline end</span>
            <Input
              type="date"
              name="timelineEnd"
              defaultValue={dateInputValue(initialValues?.timelineEnd)}
            />
          </label>
        </div>
      </div>

      <TaskCommerceFields initialValues={initialValues} />

      <TaskRecurrenceFields
        recurrenceState={recurrenceState}
        setRecurrenceState={setRecurrenceState}
        timeZone={scheduleState.timezone}
        taskId={taskId}
        onRecordCompletion={onRecordRecurrenceCompletion}
        recording={recordingRecurrence}
        nextDuePreview={nextDueLabel}
        needsStartingDate={
          recurrenceState.enabled && recurrencePreview.needsStartingDate
        }
      />

      <TaskScheduleFields
        taskId={taskId}
        initialValues={initialValues}
        scheduleState={scheduleState}
        setScheduleState={setScheduleState}
        conflicts={scheduleConflicts}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
