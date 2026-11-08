"use client";

import Input from "@/components/ui/input";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import InsuranceAnnualSubmissionsFields from "@/components/planning/insurance-annual-submissions-fields";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function InsuranceFormFields({
  idPrefix = "insurance",
  formId,
  defaults = null,
  showPrepaid = false,
  showStatus = false,
}) {
  const paymentYears =
    defaults?.premiumPaymentYears ??
    defaults?.termYears ??
    defaults?.totalPremiumPayments;
  const maturityYears = defaults?.maturityYears ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-insurance-company`}
          label="Insurance company"
          required
          info="Company the policy is registered with (e.g. State Life Insurance)."
        />
        <Input
          id={`${idPrefix}-insurance-company`}
          name="insuranceCompany"
          required
          placeholder="State Life Insurance"
          defaultValue={defaults?.insurerName || ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-policy-number`}
            label="Policy number"
            required
          />
          <Input
            id={`${idPrefix}-policy-number`}
            name="policyNumber"
            required
            placeholder="20025024200-0"
            defaultValue={defaults?.policyNumber || ""}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-holder-name`} label="Name" required />
          <Input
            id={`${idPrefix}-holder-name`}
            name="holderName"
            required
            placeholder="9054-202238"
            defaultValue={defaults?.appLoginName || ""}
          />
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-sum-assured`}
          label="Sum assured"
          required
          info="Total coverage value of the policy."
        />
        <Input
          id={`${idPrefix}-sum-assured`}
          name="sumAssured"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="3000000"
          defaultValue={defaults?.sumAssured ?? ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-due-month`} label="Due month" required />
          <Select
            id={`${idPrefix}-due-month`}
            name="premiumDueMonth"
            defaultValue={String(defaults?.premiumDueMonth ?? 12)}
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-due-day`} label="Due day" required />
          <Input
            id={`${idPrefix}-due-day`}
            name="premiumDueDay"
            type="number"
            min="1"
            max="31"
            step="1"
            required
            defaultValue={defaults?.premiumDueDay ?? 31}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Premium is due on this date each year.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-payment-years`}
            label="Years you will pay"
            required
            info="How many annual premiums you pay (e.g. first 3 years only)."
          />
          <Input
            id={`${idPrefix}-payment-years`}
            name="premiumPaymentYears"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            placeholder="3"
            defaultValue={paymentYears ?? ""}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-maturity-years`}
            label="Matures in (years)"
            required
            info="When the policy matures (e.g. 10 years)."
          />
          <Input
            id={`${idPrefix}-maturity-years`}
            name="maturityYears"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            placeholder="10"
            defaultValue={maturityYears}
          />
        </div>
      </div>

      <InsuranceAnnualSubmissionsFields idPrefix={idPrefix} defaults={defaults} />

      {showPrepaid ? (
        <fieldset className="space-y-2 rounded-md border border-border bg-muted/15 p-3">
          <legend className="px-1 text-sm font-medium">Already paid (optional)</legend>
          <FieldLabel
            htmlFor={`${idPrefix}-prepaid-lump`}
            label="Total already paid"
            info="Lump sum you have already paid toward premiums."
          />
          <Input
            id={`${idPrefix}-prepaid-lump`}
            name="prepaidLumpSum"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 838500"
          />
        </fieldset>
      ) : null}

      <div className="space-y-1">
        <FieldLabel htmlFor={`${idPrefix}-description`} label="Notes" />
        <RichTextEditor
          id={`${idPrefix}-description`}
          name="description"
          form={formId}
          rows={3}
          resetKey={defaults?.updatedAt || defaults?._id || "new"}
          defaultValue={defaults?.description || ""}
        />
      </div>

      {showStatus ? (
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-status`} label="Status" />
          <Select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={defaults?.status || "active"}
          >
            <option value="active">active</option>
            <option value="overdue">overdue</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export function insurancePayloadFromFormData(
  formData,
  { includePrepaid = false, includeStatus = false } = {},
) {
  const payload = {
    insuranceCompany: formData.get("insuranceCompany"),
    policyNumber: formData.get("policyNumber"),
    holderName: formData.get("holderName"),
    sumAssured: formData.get("sumAssured"),
    premiumDueMonth: formData.get("premiumDueMonth"),
    premiumDueDay: formData.get("premiumDueDay"),
    premiumPaymentYears: formData.get("premiumPaymentYears"),
    maturityYears: formData.get("maturityYears"),
    description: formData.get("description"),
    submissionYears: formData.getAll("submissionYear"),
    submissionAmounts: formData.getAll("submissionAmount"),
  };
  if (includePrepaid) {
    payload.prepaidLumpSum = formData.get("prepaidLumpSum") || null;
  }
  if (includeStatus) {
    payload.status = formData.get("status");
  }
  return payload;
}
