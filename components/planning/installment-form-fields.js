"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import { INSTALLMENT_STATUSES } from "@/lib/planning/constants";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";
import StartPausedField, {
  startPausedFromFormData,
} from "@/components/planning/start-paused-field";

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

export default function InstallmentFormFields({
  idPrefix = "installment",
  defaults = null,
  showPrepaid = false,
  showDownPayment = false,
  showStatus = false,
  showStartPaused = false,
}) {
  const [openEnded, setOpenEnded] = useState(Boolean(defaults?.openEnded));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-name`}
          label="Commitment name"
          required
          info="A short label you will recognize later, e.g. “Phone EMI” or “Car loan”."
        />
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={defaults?.name || ""}
        />
      </div>

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-description`}
          label="Description"
          info="Optional context: seller, account number, or what the installments are for."
        />
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={2}
          defaultValue={defaults?.description || ""}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="openEnded"
          checked={openEnded}
          onChange={(event) => setOpenEnded(event.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span>
          <span className="font-medium">Open-ended contribution</span>
          <span className="block text-xs text-muted-foreground">
            No fixed total (e.g. plots, construction). Log variable amounts each month;
            calendar reminders continue until you cancel or set an end date.
          </span>
        </span>
      </label>

      {!openEnded ? (
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-total`}
            label="Total amount"
            required
            info="Full commitment amount (principal or total price). Outstanding balance is reduced as you log payments."
          />
          <Input
            id={`${idPrefix}-total`}
            name="totalAmount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={defaults?.totalAmount ?? ""}
          />
        </div>
      ) : (
        <input type="hidden" name="totalAmount" value="" />
      )}

      {showDownPayment && !openEnded ? (
        <>
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-down-payment`}
              label="Down payment"
              info="Optional lump sum paid up front (separate from each recurring installment). Logged as a payment when you create the commitment."
            />
            <Input
              id={`${idPrefix}-down-payment`}
              name="downPaymentAmount"
              type="number"
              step="0.01"
              min="0.01"
            />
          </div>

          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-down-payment-date`}
              label="Down payment date"
              info="When the down payment was made. Defaults to the start date if left empty."
            />
            <Input
              id={`${idPrefix}-down-payment-date`}
              name="downPaymentDate"
              type="date"
            />
          </div>
        </>
      ) : null}

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-amount`}
          label="Typical installment amount"
          info="Default amount for each billing period when every installment is the same. Leave empty if amounts vary and you will enter payments manually later."
        />
        <Input
          id={`${idPrefix}-amount`}
          name="installmentAmount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={defaults?.installmentAmount ?? ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-frequency`}
            label="Payment frequency"
            required
            info="How often an installment is due. Due dates on the calendar are calculated from the start date using this schedule."
          />
          <Select
            id={`${idPrefix}-frequency`}
            name="frequency"
            defaultValue={defaults?.frequency || "monthly"}
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
            label="Start date"
            required={!openEnded}
            info={
              openEnded
                ? "Optional. Set when tracking began, or leave empty and use next payment due for calendar reminders."
                : "Date of the first installment (or the first period you are tracking). Used for the payment schedule."
            }
          />
          <Input
            id={`${idPrefix}-start`}
            name="startDate"
            type="date"
            required={!openEnded}
            defaultValue={dateInputValue(defaults?.startDate)}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-end`}
            label="End date"
            info="Optional last due date. You can leave this empty if you prefer to set a total number of installments instead."
          />
          <Input
            id={`${idPrefix}-end`}
            name="endDate"
            type="date"
            defaultValue={dateInputValue(defaults?.endDate)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-count`}
            label="Total installments"
            info="Optional cap on how many payments complete the commitment."
          />
          <Input
            id={`${idPrefix}-count`}
            name="totalInstallments"
            type="number"
            min="1"
            step="1"
            defaultValue={defaults?.totalInstallments ?? ""}
          />
        </div>
      </div>

      {showStatus ? (
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-next-due`}
            label="Next payment due"
            info="Calendar reminder for the next installment. Logging a payment advances this automatically unless you set it manually."
          />
          <Input
            id={`${idPrefix}-next-due`}
            name="nextDueDate"
            type="date"
            defaultValue={dateInputValue(defaults?.nextDueDate)}
          />
        </div>
      ) : null}

      {showStatus ? (
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-status`} label="Status" />
          <Select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={defaults?.status || "active"}
          >
            {INSTALLMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {showPrepaid ? (
        <PrepaidPaymentsFields
          periodAmountLabel="each installment amount when using the count field"
          variableAmounts
        />
      ) : null}

      {showStartPaused ? <StartPausedField idPrefix={idPrefix} /> : null}
    </div>
  );
}

export function installmentPayloadFromFormData(
  formData,
  {
    includePrepaid = false,
    includeDownPayment = false,
    includeStatus = false,
    includeStartPaused = false,
  } = {},
) {
  const openEnded = formData.get("openEnded") === "on";
  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    openEnded,
    totalAmount: openEnded ? null : formData.get("totalAmount"),
    installmentAmount: formData.get("installmentAmount") || null,
    frequency: formData.get("frequency") || "monthly",
    startDate: openEnded
      ? formData.get("startDate") || null
      : formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    totalInstallments: formData.get("totalInstallments") || null,
  };
  if (includeDownPayment) {
    payload.downPaymentAmount = formData.get("downPaymentAmount") || null;
    payload.downPaymentDate = formData.get("downPaymentDate") || null;
  }
  if (includePrepaid) {
    payload.prepaidLumpSum = formData.get("prepaidLumpSum") || null;
    payload.prepaidPaymentsCount = formData.get("prepaidPaymentsCount") || 0;
    payload.prepaidPaymentAmounts = formData.get("prepaidPaymentAmounts") || "";
  }
  if (includeStatus) {
    payload.status = formData.get("status");
    payload.nextDueDate = formData.get("nextDueDate") || null;
  }
  if (includeStartPaused) {
    payload.startPaused = startPausedFromFormData(formData);
  }
  return payload;
}
