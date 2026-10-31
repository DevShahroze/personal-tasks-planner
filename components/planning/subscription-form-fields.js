"use client";

import { useMemo, useState } from "react";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import { formatCurrency } from "@/lib/format";
import {
  DEFAULT_PLANNING_CURRENCY,
  SUBSCRIPTION_STATUSES,
} from "@/lib/planning/constants";
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

function billingCadenceText(frequency, customIntervalDays) {
  if (frequency === "custom") {
    const days = Math.max(1, Number(customIntervalDays) || 30);
    return `every ${days} days`;
  }
  switch (frequency) {
    case "weekly":
      return "every week";
    case "quarterly":
      return "every quarter";
    case "yearly":
      return "every year";
    default:
      return "every month";
  }
}

export function SubscriptionSchedulePreview({
  amount,
  frequency,
  customIntervalDays,
  startDate,
  nextPayDate,
  manualBilling = false,
  currency = DEFAULT_PLANNING_CURRENCY,
}) {
  const summary = useMemo(() => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }
    if (manualBilling) {
      const typical = `Typical charge ${formatCurrency(numericAmount, currency)}.`;
      if (nextPayDate) {
        return `${typical} Calendar reminder on ${nextPayDate}. You choose when you actually pay.`;
      }
      if (startDate) {
        return `${typical} Tracking since ${startDate}. Set a next pay date for a calendar reminder.`;
      }
      return `${typical} No auto schedule — set start or next pay dates when you want.`;
    }
    if (!startDate) {
      return null;
    }
    const cadence = billingCadenceText(frequency, customIntervalDays);
    return `You will be charged ${formatCurrency(numericAmount, currency)} ${cadence}, starting ${startDate}. Upcoming billing dates appear on the calendar.`;
  }, [
    amount,
    currency,
    customIntervalDays,
    frequency,
    manualBilling,
    nextPayDate,
    startDate,
  ]);

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        {manualBilling
          ? "Enter the typical amount (and optional dates) for your manual subscription."
          : "Enter the billing amount, frequency, and start date to see your recurring charge summary."}
      </p>
    );
  }

  return <p className="text-sm text-foreground">{summary}</p>;
}

export default function SubscriptionFormFields({
  idPrefix = "subscription",
  defaults = null,
  showPrepaid = false,
  showStatus = false,
  showStartPaused = false,
  currency = DEFAULT_PLANNING_CURRENCY,
}) {
  const [amount, setAmount] = useState(
    defaults?.amount != null ? String(defaults.amount) : "",
  );
  const [frequency, setFrequency] = useState(defaults?.billingFrequency || "monthly");
  const [customIntervalDays, setCustomIntervalDays] = useState(
    defaults?.customIntervalDays != null ? String(defaults.customIntervalDays) : "",
  );
  const [startDate, setStartDate] = useState(dateInputValue(defaults?.startDate));
  const [nextPayDate, setNextPayDate] = useState(
    dateInputValue(defaults?.nextBillingDate),
  );
  const [manualBilling, setManualBilling] = useState(Boolean(defaults?.manualBilling));

  const secondRowCols = showStatus ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="manualBilling"
          checked={manualBilling}
          onChange={(event) => setManualBilling(event.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span>
          <span className="font-medium">Manual billing</span>
          <span className="block text-muted-foreground">
            Not auto-charged on a fixed schedule — you decide when to start and when to
            pay. Optional next pay date adds a calendar reminder only.
          </span>
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-service-name`}
            label="Service name"
            required
            info="Name of the app or service (Netflix, mobile plan, gym, etc.). Shown in lists and on calendar billing entries."
          />
          <Input
            id={`${idPrefix}-service-name`}
            name="serviceName"
            required
            defaultValue={defaults?.serviceName || ""}
            placeholder="e.g. Streaming plan"
          />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-amount`}
            label="Billing amount"
            required
            info="Amount charged each billing period (before tax if you track tax separately). Used for calendar reminders and when you log payments."
          />
          <Input
            id={`${idPrefix}-amount`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className={`grid gap-3 ${secondRowCols}`}>
        {manualBilling ? (
          <>
            <div className="space-y-1">
              <FieldLabel
                htmlFor={`${idPrefix}-start-date`}
                label="Started tracking (optional)"
                info="When you began this subscription or started tracking it in the app."
              />
              <Input
                id={`${idPrefix}-start-date`}
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel
                htmlFor={`${idPrefix}-next-pay-date`}
                label="Next pay date (optional)"
                info="Puts one reminder on the calendar. Does not auto-charge or repeat until you change it or log a payment."
              />
              <Input
                id={`${idPrefix}-next-pay-date`}
                name="nextBillingDate"
                type="date"
                value={nextPayDate}
                onChange={(event) => setNextPayDate(event.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <FieldLabel
                htmlFor={`${idPrefix}-billing-frequency`}
                label="Billing frequency"
                required
                info="How often this subscription charges you. The calendar generates a billing date on this schedule from the start date."
              />
              <Select
                id={`${idPrefix}-billing-frequency`}
                name="billingFrequency"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
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
                htmlFor={`${idPrefix}-start-date`}
                label="Start date"
                required
                info="First billing period you are tracking — usually the date of the first charge (or when the subscription began). Prepaid catch-up counts forward from here."
              />
              <Input
                id={`${idPrefix}-start-date`}
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </>
        )}

        {showStatus ? (
          <div className="space-y-1">
            <FieldLabel
              htmlFor={`${idPrefix}-status`}
              label="Status"
              info="Active subscriptions appear on the calendar. Paused stops auto-advancing billing dates. Cancelled keeps history but stops future billing."
            />
            <Select
              id={`${idPrefix}-status`}
              name="status"
              defaultValue={defaults?.status || "active"}
            >
              {SUBSCRIPTION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {showStatus && !manualBilling ? (
        <div className="space-y-1 md:max-w-xs">
          <FieldLabel
            htmlFor={`${idPrefix}-next-billing-date`}
            label="Next billing date"
            info="When the next charge is due on your calendar. After you log a payment, this advances from your schedule unless you change it here."
          />
          <Input
            id={`${idPrefix}-next-billing-date`}
            name="nextBillingDate"
            type="date"
            value={nextPayDate}
            onChange={(event) => setNextPayDate(event.target.value)}
          />
        </div>
      ) : null}

      {!manualBilling && frequency === "custom" ? (
        <div className="space-y-1 md:max-w-xs">
          <FieldLabel
            htmlFor={`${idPrefix}-custom-interval`}
            label="Days between charges"
            required
            info="Used when billing frequency is Custom — e.g. 30 for roughly monthly, 14 for biweekly."
          />
          <Input
            id={`${idPrefix}-custom-interval`}
            name="customIntervalDays"
            type="number"
            min="1"
            step="1"
            required
            value={customIntervalDays}
            onChange={(event) => setCustomIntervalDays(event.target.value)}
          />
        </div>
      ) : manualBilling ? (
        <>
          <input type="hidden" name="billingFrequency" value="monthly" />
          <input type="hidden" name="customIntervalDays" value="" />
        </>
      ) : (
        <input type="hidden" name="customIntervalDays" value="" />
      )}

      {showStatus && !manualBilling ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="autoRenew"
            defaultChecked={defaults?.autoRenew !== false}
            className="rounded border-border"
          />
          Auto-renew
          <span className="text-muted-foreground">
            (advance next billing date when periods pass)
          </span>
        </label>
      ) : null}

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <SubscriptionSchedulePreview
          amount={amount}
          frequency={frequency}
          customIntervalDays={customIntervalDays}
          startDate={startDate}
          nextPayDate={nextPayDate}
          manualBilling={manualBilling}
          currency={currency}
        />
      </div>

      {showPrepaid && !manualBilling ? (
        <PrepaidPaymentsFields periodAmountLabel="the billing amount each period" />
      ) : null}

      {showStartPaused ? <StartPausedField idPrefix={idPrefix} /> : null}
    </div>
  );
}

export function subscriptionPayloadFromFormData(
  formData,
  { includePrepaid = false, includeStatus = false, includeStartPaused = false } = {},
) {
  const payload = {
    serviceName: formData.get("serviceName"),
    amount: formData.get("amount"),
    billingFrequency: formData.get("billingFrequency") || "monthly",
    startDate: formData.get("startDate"),
    manualBilling: formData.get("manualBilling") === "on",
  };
  const nextBillingDate = formData.get("nextBillingDate");
  if (nextBillingDate) {
    payload.nextBillingDate = nextBillingDate;
  }
  const customDays = formData.get("customIntervalDays");
  if (payload.billingFrequency === "custom" && customDays) {
    payload.customIntervalDays = customDays;
  }
  if (includePrepaid) {
    payload.prepaidLumpSum = formData.get("prepaidLumpSum") || null;
    payload.prepaidPaymentsCount = formData.get("prepaidPaymentsCount") || 0;
  }
  if (includeStatus) {
    payload.status = formData.get("status");
    payload.autoRenew = formData.get("autoRenew") === "on";
    payload.nextBillingDate = formData.get("nextBillingDate") || null;
  }
  if (includeStartPaused) {
    payload.startPaused = startPausedFromFormData(formData);
  }
  return payload;
}
