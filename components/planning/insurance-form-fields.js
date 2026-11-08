"use client";

import Input from "@/components/ui/input";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";
import InsuranceAnnualSubmissionsFields from "@/components/planning/insurance-annual-submissions-fields";

const MONTH_OPTIONS = [
  { value: "", label: "—" },
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

function frequencyLabel(value) {
  if (value === "custom") {
    return "Custom interval";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export default function InsuranceFormFields({
  idPrefix = "insurance",
  formId,
  defaults = null,
  showPrepaid = false,
  showStatus = false,
  hideSubmitRow = false,
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Policy</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-insurer`}
              label="Insurer / plan name"
              required
              info="e.g. State Life Insurance"
            />
            <Input
              id={`${idPrefix}-insurer`}
              name="insurerName"
              required
              defaultValue={defaults?.insurerName || ""}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-policy-number`}
              label="Policy number"
              required
              info="Policy number from your documents."
            />
            <Input
              id={`${idPrefix}-policy-number`}
              name="policyNumber"
              required
              defaultValue={defaults?.policyNumber || ""}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-sum-assured`}
              label="Sum assured"
              info="Coverage amount (e.g. Rs 3,000,000)."
            />
            <Input
              id={`${idPrefix}-sum-assured`}
              name="sumAssured"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.sumAssured ?? ""}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-premium`}
              label="Premium (each payment)"
              required
              info="Amount due each period (e.g. Rs 838,120 yearly)."
            />
            <Input
              id={`${idPrefix}-premium`}
              name="premiumAmount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={defaults?.premiumAmount ?? ""}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-due-month`}
              label="Due month"
              info="Recurring due month each year (e.g. December)."
            />
            <Select
              id={`${idPrefix}-due-month`}
              name="premiumDueMonth"
              defaultValue={
                defaults?.premiumDueMonth != null
                  ? String(defaults.premiumDueMonth)
                  : "12"
              }
            >
              {MONTH_OPTIONS.filter((option) => option.value !== "").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-due-day`}
              label="Due day"
              info="Day of month (e.g. 31)."
            />
            <Input
              id={`${idPrefix}-due-day`}
              name="premiumDueDay"
              type="number"
              min="1"
              max="31"
              step="1"
              defaultValue={defaults?.premiumDueDay ?? 31}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-total-premium`}
              label="Total premium (optional)"
              info="Full contract premium if known."
            />
            <Input
              id={`${idPrefix}-total-premium`}
              name="totalPremiumAmount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaults?.totalPremiumAmount ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
        <h2 className="text-sm font-semibold tracking-tight">App login</h2>
        <input type="hidden" name="loginSection" value="app" />
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-app-login`}
            label="Login name"
            info="Username or login id for the insurer app (e.g. 9054-202238)."
          />
          <Input
            id={`${idPrefix}-app-login`}
            name="appLoginName"
            defaultValue={defaults?.appLoginName || ""}
            autoComplete="off"
          />
        </div>
      </section>

      <InsuranceAnnualSubmissionsFields idPrefix={idPrefix} defaults={defaults} />

      <section className="space-y-3 border-t border-border pt-4">
        <h2 className="text-sm font-semibold tracking-tight">Schedule</h2>
        <div
          className={`grid gap-3 md:grid-cols-2 ${showStatus ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
        >
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-frequency`}
              label="Pay frequency"
              required
              info="How often premiums are due (often yearly for insurance)."
            />
            <Select
              id={`${idPrefix}-frequency`}
              name="frequency"
              defaultValue={defaults?.frequency || "yearly"}
            >
              {PAYMENT_FREQUENCIES.map((value) => (
                <option key={value} value={value}>
                  {frequencyLabel(value)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-start`}
              label="Policy start date"
              required
              info="When coverage or premium schedule starts."
            />
            <Input
              id={`${idPrefix}-start`}
              name="startDate"
              type="date"
              required
              defaultValue={dateInputValue(defaults?.startDate)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-term-years`}
              label="Term (years)"
              info="How many years you pay premiums."
            />
            <Input
              id={`${idPrefix}-term-years`}
              name="termYears"
              type="number"
              min="1"
              step="1"
              defaultValue={defaults?.termYears ?? ""}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-payment-count`}
              label="Total payments"
              info="Number of premium installments over the life of the policy."
            />
            <Input
              id={`${idPrefix}-payment-count`}
              name="totalPremiumPayments"
              type="number"
              min="1"
              step="1"
              defaultValue={defaults?.totalPremiumPayments ?? ""}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-end`}
              label="End date (optional)"
              info="Last premium due date."
            />
            <Input
              id={`${idPrefix}-end`}
              name="endDate"
              type="date"
              defaultValue={dateInputValue(defaults?.endDate)}
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
      </section>

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-description`}
          label="Notes"
          info="Coverage details, beneficiaries, agent contact, etc."
        />
        <RichTextEditor
          id={`${idPrefix}-description`}
          name="description"
          form={formId}
          rows={3}
          resetKey={defaults?.updatedAt || defaults?._id || "new"}
          defaultValue={defaults?.description || ""}
        />
      </div>

      {showPrepaid ? (
        <PrepaidPaymentsFields periodAmountLabel="each premium amount" />
      ) : null}

      {hideSubmitRow ? null : null}
    </div>
  );
}

export function insurancePayloadFromFormData(
  formData,
  { includePrepaid = false, includeStatus = false } = {},
) {
  const payload = {
    insurerName: formData.get("insurerName"),
    policyNumber: formData.get("policyNumber"),
    appLoginName: formData.get("appLoginName"),
    premiumAmount: formData.get("premiumAmount"),
    frequency: formData.get("frequency") || "yearly",
    startDate: formData.get("startDate"),
    description: formData.get("description"),
    submissionYears: formData.getAll("submissionYear"),
    submissionAmounts: formData.getAll("submissionAmount"),
  };
  const sumAssured = formData.get("sumAssured");
  if (sumAssured) {
    payload.sumAssured = sumAssured;
  }
  const premiumDueMonth = formData.get("premiumDueMonth");
  if (premiumDueMonth) {
    payload.premiumDueMonth = premiumDueMonth;
  }
  const premiumDueDay = formData.get("premiumDueDay");
  if (premiumDueDay) {
    payload.premiumDueDay = premiumDueDay;
  }
  const totalPremiumAmount = formData.get("totalPremiumAmount");
  if (totalPremiumAmount) {
    payload.totalPremiumAmount = totalPremiumAmount;
  }
  const termYears = formData.get("termYears");
  if (termYears) {
    payload.termYears = termYears;
  }
  const totalPremiumPayments = formData.get("totalPremiumPayments");
  if (totalPremiumPayments) {
    payload.totalPremiumPayments = totalPremiumPayments;
  }
  const endDate = formData.get("endDate");
  if (endDate) {
    payload.endDate = endDate;
  }
  if (includePrepaid) {
    payload.prepaidLumpSum = formData.get("prepaidLumpSum") || null;
    payload.prepaidPaymentsCount = formData.get("prepaidPaymentsCount") || 0;
  }
  if (includeStatus) {
    payload.status = formData.get("status");
  }
  return payload;
}
