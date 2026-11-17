"use client";

import { CURRENT_PROJECT_STATUSES } from "@/lib/current-projects/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";

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

export default function CurrentProjectForm({
  formId = "current-project-form",
  isEditForm = false,
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save",
  onCancelEdit,
  onDelete,
  deleting = false,
}) {
  const actionButtons = (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {onCancelEdit ? (
        <Button
          type="button"
          variant="secondary"
          disabled={submitting || deleting}
          onClick={onCancelEdit}
        >
          Cancel
        </Button>
      ) : null}
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
      <Button type="submit" form={formId} disabled={submitting || deleting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </div>
  );

  return (
    <>
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSubmit({
            title: data.get("title"),
            summary: data.get("summary"),
            status: data.get("status"),
            startedAt: data.get("startedAt") || null,
            targetDate: data.get("targetDate") || null,
            notes: data.get("notes"),
          });
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>Title *</span>
          <Input name="title" defaultValue={initialValues?.title || ""} required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Summary</span>
          <Input name="summary" defaultValue={initialValues?.summary || ""} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Status</span>
          <Select name="status" defaultValue={initialValues?.status || "Active"}>
            {CURRENT_PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Started</span>
            <Input
              name="startedAt"
              type="date"
              defaultValue={dateInputValue(initialValues?.startedAt)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Target</span>
            <Input
              name="targetDate"
              type="date"
              defaultValue={dateInputValue(initialValues?.targetDate)}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Notes</span>
          <RichTextEditor
            name="notes"
            form={formId}
            rows={4}
            resetKey={initialValues?.updatedAt || initialValues?._id || "new"}
            defaultValue={initialValues?.notes || ""}
            placeholder="Ongoing context for this project…"
          />
        </label>
        {!isEditForm ? (
          <div className="border-t border-border pt-2">
            <Button type="submit" disabled={submitting || deleting}>
              {submitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        ) : null}
      </form>

      {isEditForm ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl">{actionButtons}</div>
        </div>
      ) : null}
    </>
  );
}
