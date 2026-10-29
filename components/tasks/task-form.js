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
import TaskCategoryField, {
  initialCategoryId,
} from "@/components/tasks/task-category-field";

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

function FormSection({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-4 ${className}`.trim()}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

const detailFieldGrid =
  "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-4";

export default function TaskForm({
  taskId,
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save task",
  onDelete,
  deleting = false,
  onCreateItemsFromDescription,
  creatingItemsFromDescription = false,
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
  const [categoryId, setCategoryId] = useState(() => initialCategoryId(initialValues));

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

  const isEditForm = Boolean(taskId);

  const actionButtons = (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {onDelete ? (
        <Button
          type="button"
          variant="danger"
          disabled={deleting || submitting}
          onClick={onDelete}
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      ) : null}
      <Button
        type="submit"
        form={isEditForm ? formId : undefined}
        disabled={submitting || deleting}
      >
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </div>
  );

  return (
    <>
      <form
        id={formId}
        className={`flex w-full flex-col gap-5${isEditForm ? " pb-24" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onClearScheduleConflicts?.();
          onSubmit({
            title: formData.get("title"),
            description: formData.get("description"),
            status: formData.get("status"),
            priority: formData.get("priority"),
            category: categoryId || null,
            taskDate: taskDate || null,
            timelineStart: formData.get("timelineStart") || null,
            timelineEnd: formData.get("timelineEnd") || null,
            schedule: schedulePayload,
            recurrence: recurrenceFromFormState(recurrenceState),
            ...commerceFromFormData(formData),
          });
        }}
      >
        <FormSection title="Basics">
          <div className="space-y-4">
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
            {taskId && onCreateItemsFromDescription ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={creatingItemsFromDescription || submitting}
                  onClick={() => {
                    const form = document.getElementById(formId);
                    const text = form?.elements?.description?.value ?? "";
                    onCreateItemsFromDescription(text);
                  }}
                >
                  {creatingItemsFromDescription ? "Creating…" : "Create items"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Splits the description by commas into checkbox items below.
                </p>
              </div>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Details & dates">
          <div className="space-y-4">
            <div className={detailFieldGrid}>
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
                <Select
                  name="priority"
                  defaultValue={initialValues?.priority || "Medium"}
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </Select>
              </label>
              <TaskCategoryField
                categoryId={categoryId}
                onCategoryIdChange={setCategoryId}
              />
            </div>
            <div className={detailFieldGrid}>
              <label className="block space-y-1 text-sm">
                <span>Task date</span>
                <Input
                  type="date"
                  name="taskDateDisplay"
                  value={taskDate}
                  onChange={(event) => setTaskDate(event.target.value)}
                />
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
        </FormSection>

        <TaskCommerceFields initialValues={initialValues} />

        <FormSection title="Calendar">
          <div className="max-w-md space-y-3">
            {taskDateWarning ? <Alert variant="info">{taskDateWarning}</Alert> : null}
            <ErrorBoundary
              title="Calendar unavailable"
              description="Use the task date field above or save without the mini calendar."
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
        </FormSection>

        <TaskRecurrenceFields
          recurrenceState={recurrenceState}
          setRecurrenceState={setRecurrenceState}
          timeZone={scheduleState.timezone}
          taskId={taskId}
          suggestedStartYmd={taskDate}
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

        {!isEditForm ? (
          <div className="border-t border-border pt-2">{actionButtons}</div>
        ) : null}
      </form>

      {isEditForm ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:left-56 md:px-4">
          <div className="mx-auto flex w-full max-w-4xl">{actionButtons}</div>
        </div>
      ) : null}
    </>
  );
}
