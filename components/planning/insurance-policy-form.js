"use client";

import Button from "@/components/ui/button";
import InsuranceFormFields from "@/components/planning/insurance-form-fields";
import { insurancePayloadFromFormData } from "@/components/planning/insurance-form-fields";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";

export default function InsurancePolicyForm({
  formId = "insurance-policy-form",
  isEditForm = false,
  idPrefix = "insurance",
  defaults = null,
  showPrepaid = false,
  showStatus = false,
  submitting = false,
  deleting = false,
  submitLabel = "Save",
  onSubmit,
  onCancelEdit,
  onDelete,
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
        autoComplete="off"
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const payload = insurancePayloadFromFormData(
            new FormData(event.currentTarget),
            {
              includePrepaid: showPrepaid,
              includeStatus: showStatus,
            },
          );
          onSubmit(payload);
        }}
      >
        <InsuranceFormFields
          idPrefix={idPrefix}
          formId={formId}
          defaults={defaults}
          showPrepaid={showPrepaid}
          showStatus={showStatus}
          hideSubmitRow={isEditForm}
        />
        {!isEditForm ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
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
