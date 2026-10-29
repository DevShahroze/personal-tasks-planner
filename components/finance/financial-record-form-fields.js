"use client";

import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_TYPE_LABEL,
  DEFAULT_FINANCIAL_CURRENCY,
} from "@/lib/finance/constants";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";

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

function taskIdInputValue(taskId) {
  if (!taskId) {
    return "";
  }
  if (typeof taskId === "object" && taskId._id) {
    return String(taskId._id);
  }
  return String(taskId);
}

export default function FinancialRecordFormFields({
  idPrefix = "financial",
  defaults = null,
  showOriginalAmount = true,
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>Type *</span>
        <Select
          id={`${idPrefix}-type`}
          name="type"
          required
          defaultValue={defaults?.type || "receivable"}
        >
          {FINANCIAL_RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {FINANCIAL_TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Party name *</span>
        <Input
          id={`${idPrefix}-party-name`}
          name="partyName"
          required
          autoComplete="off"
          defaultValue={defaults?.partyName || ""}
        />
      </label>
      {showOriginalAmount ? (
        <label className="block space-y-1 text-sm">
          <span>Original amount *</span>
          <Input
            id={`${idPrefix}-original-amount`}
            name="originalAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
        </label>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span>Currency</span>
        <Input
          id={`${idPrefix}-currency`}
          name="currency"
          defaultValue={defaults?.currency || DEFAULT_FINANCIAL_CURRENCY}
          maxLength={8}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Expected date</span>
        <Input
          id={`${idPrefix}-expected-date`}
          name="expectedDate"
          type="date"
          defaultValue={dateInputValue(defaults?.expectedDate)}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Linked task id (optional)</span>
        <Input
          id={`${idPrefix}-task-id`}
          name="taskId"
          placeholder="MongoDB task id"
          defaultValue={taskIdInputValue(defaults?.taskId)}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={3}
          defaultValue={defaults?.description || ""}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Notes</span>
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={3}
          defaultValue={defaults?.notes || ""}
        />
      </label>
    </div>
  );
}

export function financialRecordPayloadFromFormData(
  formData,
  { forCreate = false } = {},
) {
  const payload = {
    type: formData.get("type"),
    partyName: formData.get("partyName"),
    description: formData.get("description"),
    currency: formData.get("currency") || DEFAULT_FINANCIAL_CURRENCY,
    expectedDate: formData.get("expectedDate") || null,
    notes: formData.get("notes"),
    taskId: formData.get("taskId") || null,
  };
  if (forCreate) {
    payload.originalAmount = Number(formData.get("originalAmount"));
  }
  return payload;
}
