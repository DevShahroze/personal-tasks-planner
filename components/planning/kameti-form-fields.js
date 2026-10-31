"use client";

import { useMemo, useState } from "react";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import { KAMETI_STATUSES } from "@/lib/planning/constants";
import { defaultKametiEndYmdFromParticipants } from "@/lib/planning/kameti.js";
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

function defaultPoolFromDefaults(defaults) {
  if (defaults?.poolAmountPerRound != null && defaults.poolAmountPerRound !== "") {
    return String(defaults.poolAmountPerRound);
  }
  const n = Number(defaults?.totalParticipants);
  const per = Number(defaults?.contributionAmount);
  if (Number.isFinite(n) && n > 0 && Number.isFinite(per) && per > 0) {
    return String(Math.round(per * n * 100) / 100);
  }
  return "";
}

export default function KametiFormFields({
  idPrefix = "kameti",
  defaults = null,
  showPrepaid = true,
  showStatus = false,
  showStartPaused = false,
}) {
  const initialStart = dateInputValue(defaults?.startDate);
  const initialParticipants =
    defaults?.totalParticipants != null && defaults?.totalParticipants !== ""
      ? String(defaults.totalParticipants)
      : "";
  const initialEndFromDefaults = dateInputValue(defaults?.endDate);
  const initialPool = defaultPoolFromDefaults(defaults);
  const initialPayout = dateInputValue(defaults?.expectedPayoutDate);

  const [frequency, setFrequency] = useState(
    defaults?.contributionFrequency || "monthly",
  );
  const [customIntervalDays, setCustomIntervalDays] = useState(
    defaults?.customIntervalDays != null ? String(defaults.customIntervalDays) : "",
  );
  const [startDate, setStartDate] = useState(initialStart);
  const [totalParticipants, setTotalParticipants] = useState(initialParticipants);
  const [poolAmountPerRound, setPoolAmountPerRound] = useState(initialPool);
  const [expectedPayoutDate, setExpectedPayoutDate] = useState(initialPayout);
  const [endDateManual, setEndDateManual] = useState(Boolean(initialEndFromDefaults));
  const [manualEndDate, setManualEndDate] = useState(initialEndFromDefaults);
  const endDate = endDateManual
    ? manualEndDate
    : defaultKametiEndYmdFromParticipants(startDate, totalParticipants);

  const perPersonHint = useMemo(() => {
    const pool = Number(poolAmountPerRound);
    const n = Number(totalParticipants);
    if (!Number.isFinite(pool) || pool <= 0 || !Number.isFinite(n) || n < 1) {
      return null;
    }
    const per = Math.round((pool / n) * 100) / 100;
    return per;
  }, [poolAmountPerRound, totalParticipants]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-plan-name`}
          label="Plan name"
          required
          info="A name for this Kameti circle, e.g. “Office savings” or “Family pool”."
        />
        <Input
          id={`${idPrefix}-plan-name`}
          name="planName"
          required
          defaultValue={defaults?.planName || ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-participants`}
            label="Total participants"
            required
            info="How many people are in the pool (including you). That is also how many contribution rounds you will pay over the life of the plan."
          />
          <Input
            id={`${idPrefix}-participants`}
            name="totalParticipants"
            type="number"
            min="1"
            step="1"
            required
            value={totalParticipants}
            onChange={(event) => setTotalParticipants(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-pool`}
            label="Monthly pool total"
            required
            info="The full pot collected each round when it is someone’s turn — e.g. 12 people × PKR 100,000 each = PKR 1,200,000. Your per-person payment is this total divided by participants."
          />
          <Input
            id={`${idPrefix}-pool`}
            name="poolAmountPerRound"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={poolAmountPerRound}
            onChange={(event) => setPoolAmountPerRound(event.target.value)}
          />
          {perPersonHint != null ? (
            <p className="text-xs text-muted-foreground">
              Your share each round: PKR {perPersonHint.toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-frequency`}
            label="Contribution frequency"
            required
            info="How often each member pays in. Calendar reminders use the start date and this schedule."
          />
          <Select
            id={`${idPrefix}-frequency`}
            name="contributionFrequency"
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
            htmlFor={`${idPrefix}-start`}
            label="Start date"
            required
            info="First contribution round you are tracking. Catch-up rounds count forward from here."
          />
          <Input
            id={`${idPrefix}-start`}
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
      </div>

      {frequency === "custom" ? (
        <div className="space-y-1 md:max-w-xs">
          <FieldLabel
            htmlFor={`${idPrefix}-custom-interval`}
            label="Days between contributions"
            required
            info="Used when frequency is Custom — e.g. 30 for roughly monthly, 7 for weekly."
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
      ) : (
        <input type="hidden" name="customIntervalDays" value="" />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-end`}
            label="End date"
            info="Last contribution round on the calendar. Filled from start date and participant count; you can override it."
          />
          <Input
            id={`${idPrefix}-end`}
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDateManual(true);
              setManualEndDate(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel
            htmlFor={`${idPrefix}-payout`}
            label="Expected payout date"
            info="The month you receive the pool (your turn). Others pay you (participants − 1) × your per-person share; mark payout received when that is complete."
          />
          <Input
            id={`${idPrefix}-payout`}
            name="expectedPayoutDate"
            type="date"
            value={expectedPayoutDate}
            onChange={(event) => setExpectedPayoutDate(event.target.value)}
          />
        </div>
      </div>

      {showStatus ? (
        <div className="space-y-1 md:max-w-xs">
          <FieldLabel
            htmlFor={`${idPrefix}-status`}
            label="Status"
            info="Active while you are still paying in. Payout received means your turn’s collection is logged but you may still owe rounds. Completed when all rounds are paid and payout is recorded."
          />
          <Select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={defaults?.status || "active"}
          >
            {KAMETI_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-1">
        <FieldLabel
          htmlFor={`${idPrefix}-notes`}
          label="Notes"
          info="Optional: organizer, payout order, or other details."
        />
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={2}
          defaultValue={defaults?.notes || ""}
        />
      </div>

      {showPrepaid ? (
        <div className="space-y-1 rounded-md border border-border p-3">
          <FieldLabel
            htmlFor={`${idPrefix}-prepaid-rounds`}
            label="Rounds already paid"
            info="How many contribution rounds you have already paid before tracking here (same per-person amount each time). Does not need to match calendar dates if payments were late."
          />
          <Input
            id={`${idPrefix}-prepaid-rounds`}
            name="prepaidPaymentsCount"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
          />
        </div>
      ) : null}

      {showStartPaused ? <StartPausedField idPrefix={idPrefix} /> : null}
    </div>
  );
}

export function kametiPayloadFromFormData(
  formData,
  { includeStatus = false, includePrepaid = false, includeStartPaused = false } = {},
) {
  const payload = {
    planName: formData.get("planName"),
    totalParticipants: formData.get("totalParticipants"),
    poolAmountPerRound: formData.get("poolAmountPerRound"),
    contributionFrequency: formData.get("contributionFrequency") || "monthly",
    startDate: formData.get("startDate"),
    expectedPayoutDate: formData.get("expectedPayoutDate") || null,
  };
  const endDate = formData.get("endDate");
  if (endDate) {
    payload.endDate = endDate;
  }
  const notes = formData.get("notes");
  if (notes) {
    payload.notes = notes;
  }
  if (payload.contributionFrequency === "custom") {
    payload.customIntervalDays = formData.get("customIntervalDays");
  }
  if (includeStatus) {
    payload.status = formData.get("status");
  }
  if (includePrepaid) {
    payload.prepaidPaymentsCount = formData.get("prepaidPaymentsCount") || 0;
  }
  if (includeStartPaused) {
    payload.startPaused = startPausedFromFormData(formData);
  }
  return payload;
}
