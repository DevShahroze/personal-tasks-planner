"use client";

import { PLAN_STATUSES } from "@/lib/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import Select from "@/components/ui/select";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";

export default function PlanForm({
  formId = "plan-form",
  isEditForm = false,
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save plan",
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
            description: data.get("description"),
            status: data.get("status"),
            startDate: data.get("startDate") || null,
            targetDate: data.get("targetDate") || null,
          });
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>Title *</span>
          <Input name="title" defaultValue={initialValues?.title || ""} required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Description</span>
          <RichTextEditor
            name="description"
            form={formId}
            rows={4}
            resetKey={initialValues?.updatedAt || initialValues?._id || "new"}
            defaultValue={initialValues?.description || ""}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Status</span>
          <Select name="status" defaultValue={initialValues?.status || "Considering"}>
            {PLAN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Start date</span>
            <Input
              type="date"
              name="startDate"
              defaultValue={
                initialValues?.startDate
                  ? new Date(initialValues.startDate).toISOString().slice(0, 10)
                  : ""
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Target date</span>
            <Input
              type="date"
              name="targetDate"
              defaultValue={
                initialValues?.targetDate
                  ? new Date(initialValues.targetDate).toISOString().slice(0, 10)
                  : ""
              }
            />
          </label>
        </div>
        {!isEditForm ? (
          <div className="border-t border-border pt-2">
            <Button type="submit" disabled={submitting}>
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
