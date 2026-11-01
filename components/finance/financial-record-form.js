"use client";

import Button from "@/components/ui/button";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import FinancialRecordFormFields, {
  financialRecordPayloadFromFormData,
} from "@/components/finance/financial-record-form-fields";

function FormSection({ title, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function FinancialRecordForm({
  recordId,
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save changes",
  onDelete,
  deleting = false,
  onCancelEdit,
  forCreate = false,
  idPrefix = "financial",
}) {
  const formId = "financial-record-form";
  const isEditForm = Boolean(recordId);

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
        autoComplete="off"
        className="flex w-full flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          const payload = financialRecordPayloadFromFormData(
            new FormData(event.currentTarget),
            { forCreate },
          );
          onSubmit(payload);
        }}
      >
        <FormSection title={forCreate ? "New record" : "Record details"}>
          <FinancialRecordFormFields
            idPrefix={idPrefix}
            defaults={initialValues}
            showOriginalAmount={forCreate}
          />
        </FormSection>

        {!isEditForm ? (
          <div className="border-t border-border pt-2">{actionButtons}</div>
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
