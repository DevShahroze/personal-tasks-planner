"use client";

import { CURRENT_PROJECT_STATUSES } from "@/lib/current-projects/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";

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
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save",
  onDelete,
  deleting = false,
}) {
  return (
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
          rows={4}
          resetKey={initialValues?.updatedAt || initialValues?._id || "new"}
          defaultValue={initialValues?.notes || ""}
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
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
        <Button type="submit" disabled={submitting || deleting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
