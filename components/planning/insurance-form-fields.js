"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";

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
  defaults = null,
  showPrepaid = false,
  showStatus = false,
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-insurer`}
            label="Insurer / plan name"
            required
            info="Company or plan title (e.g. State Life, health Takaful)."
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
            info="Policy or certificate number from your documents."
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
            htmlFor={`${idPrefix}-premium`}
            label="Premium amount (each payment)"
            required
            info="Amount due each billing period (annual premium, monthly, etc.)."
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
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-total-premium`}
            label="Total premium (optional)"
            info="Full contract premium. If empty, calculated from premium × number of payments when those are set."
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
            info="When coverage or premium schedule starts; first due date is based on this."
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
            info="How many years you pay premiums. With yearly frequency, sets payment count if left blank."
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
            info="Last premium due date. Computed from term years when that is set."
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

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-description`}
          label="Notes"
          info="Coverage details, beneficiaries, agent contact, etc."
        />
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={3}
          defaultValue={defaults?.description || ""}
        />
      </div>

      {showPrepaid ? (
        <PrepaidPaymentsFields periodAmountLabel="each premium amount" />
      ) : null}
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
    premiumAmount: formData.get("premiumAmount"),
    frequency: formData.get("frequency") || "yearly",
    startDate: formData.get("startDate"),
    description: formData.get("description"),
  };
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
    payload.prepaidPaymentsCount = formData.get("prepaidPaymentsCount") || 0;
  }
  if (includeStatus) {
    payload.status = formData.get("status");
  }
  return payload;
}
