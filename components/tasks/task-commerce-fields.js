"use client";

import {
  TASK_DECISION_STATUSES,
  TASK_INTENTS,
  TASK_DECISION_STATUS_LABEL,
  TASK_INTENT_LABEL,
  DEFAULT_TASK_CURRENCY,
} from "@/lib/task-commerce/constants";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";

function moneyInputValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

export default function TaskCommerceFields({ initialValues }) {
  return (
    <fieldset className="space-y-3 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">Purchase / sale estimate</legend>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Intent</span>
          <Select name="intent" defaultValue={initialValues?.intent || "none"}>
            {TASK_INTENTS.map((intent) => (
              <option key={intent} value={intent}>
                {TASK_INTENT_LABEL[intent]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Decision</span>
          <Select
            name="decisionStatus"
            defaultValue={initialValues?.decisionStatus || "considering"}
          >
            {TASK_DECISION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_DECISION_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Estimated value</span>
          <Input
            name="estimatedValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            defaultValue={moneyInputValue(initialValues?.estimatedValue)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Actual value</span>
          <Input
            name="actualValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            defaultValue={moneyInputValue(initialValues?.actualValue)}
          />
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span>Currency</span>
          <Input
            name="currency"
            defaultValue={initialValues?.currency || DEFAULT_TASK_CURRENCY}
            maxLength={8}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function commerceFromFormData(formData) {
  const estimatedRaw = formData.get("estimatedValue");
  const actualRaw = formData.get("actualValue");
  return {
    intent: formData.get("intent") || "none",
    decisionStatus: formData.get("decisionStatus") || "considering",
    estimatedValue: estimatedRaw === "" ? null : Number(estimatedRaw),
    actualValue: actualRaw === "" ? null : Number(actualRaw),
    currency: formData.get("currency") || DEFAULT_TASK_CURRENCY,
  };
}
