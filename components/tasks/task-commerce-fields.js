"use client";

import { useState } from "react";
import {
  TASK_DECISION_STATUSES,
  TASK_INTENTS,
  TASK_DECISION_STATUS_LABEL,
  TASK_INTENT_LABEL,
  DEFAULT_TASK_CURRENCY,
} from "@/lib/task-commerce/constants";
import Input from "@/components/ui/input";
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

function moneyInputValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

function hasOrderOrPurchaseData(initialValues) {
  if (!initialValues) {
    return false;
  }
  if (initialValues.orderPlacedDate || initialValues.expectedReceiveDate) {
    return true;
  }
  if (initialValues.receivedDate) {
    return true;
  }
  if (initialValues.timelineStart || initialValues.timelineEnd) {
    return true;
  }
  if (
    initialValues.amountSpent !== null &&
    initialValues.amountSpent !== undefined &&
    initialValues.amountSpent !== ""
  ) {
    return true;
  }
  if (initialValues.intent && initialValues.intent !== "none") {
    return true;
  }
  if (
    initialValues.estimatedValue !== null &&
    initialValues.estimatedValue !== undefined &&
    initialValues.estimatedValue !== ""
  ) {
    return true;
  }
  if (
    initialValues.actualValue !== null &&
    initialValues.actualValue !== undefined &&
    initialValues.actualValue !== ""
  ) {
    return true;
  }
  if (initialValues.decisionStatus && initialValues.decisionStatus !== "considering") {
    return true;
  }
  return false;
}

export default function TaskCommerceFields({ initialValues }) {
  const [trackOrder, setTrackOrder] = useState(() =>
    hasOrderOrPurchaseData(initialValues),
  );

  const orderPlacedDefault = dateInputValue(
    initialValues?.orderPlacedDate || initialValues?.timelineStart,
  );
  const expectedReceiveDefault = dateInputValue(
    initialValues?.expectedReceiveDate || initialValues?.timelineEnd,
  );
  const receivedDefault = dateInputValue(initialValues?.receivedDate);

  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-semibold tracking-tight">
        Order &amp; purchase
      </legend>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="trackOrderPurchase"
          value="1"
          checked={trackOrder}
          onChange={(event) => setTrackOrder(event.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span>
          <span className="font-medium">Track order or purchase</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Order dates appear on the calendar. Amounts accept values like 52800 or
            52,800.
          </span>
        </span>
      </label>

      {trackOrder ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Order placed</span>
              <Input
                type="date"
                name="orderPlacedDate"
                defaultValue={orderPlacedDefault}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Expected receive</span>
              <Input
                type="date"
                name="expectedReceiveDate"
                defaultValue={expectedReceiveDefault}
              />
              <span className="text-xs text-muted-foreground">
                Shown on the calendar as expected receive.
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Received on</span>
              <Input type="date" name="receivedDate" defaultValue={receivedDefault} />
              <span className="text-xs text-muted-foreground">
                Optional — when the order actually arrived.
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Intent</span>
              <Select name="intent" defaultValue={initialValues?.intent || "buy"}>
                {TASK_INTENTS.filter((intent) => intent !== "none").map((intent) => (
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
              <span>Currency</span>
              <Input
                name="currency"
                defaultValue={initialValues?.currency || DEFAULT_TASK_CURRENCY}
                maxLength={8}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Order total (estimated)</span>
              <Input
                name="estimatedValue"
                inputMode="decimal"
                placeholder="Optional"
                defaultValue={moneyInputValue(initialValues?.estimatedValue)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Amount spent</span>
              <Input
                name="amountSpent"
                inputMode="decimal"
                placeholder="Optional"
                defaultValue={moneyInputValue(initialValues?.amountSpent)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Actual value</span>
              <Input
                name="actualValue"
                inputMode="decimal"
                placeholder="Optional"
                defaultValue={moneyInputValue(initialValues?.actualValue)}
              />
            </label>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

export function commerceFromFormData(formData) {
  if (formData.get("trackOrderPurchase") !== "1") {
    return {
      intent: "none",
      decisionStatus: "considering",
      estimatedValue: null,
      actualValue: null,
      amountSpent: null,
      currency: DEFAULT_TASK_CURRENCY,
      orderPlacedDate: null,
      expectedReceiveDate: null,
      receivedDate: null,
    };
  }

  const estimatedRaw = formData.get("estimatedValue");
  const actualRaw = formData.get("actualValue");
  const spentRaw = formData.get("amountSpent");

  return {
    intent: formData.get("intent") || "buy",
    decisionStatus: formData.get("decisionStatus") || "considering",
    estimatedValue: estimatedRaw === "" ? null : estimatedRaw,
    actualValue: actualRaw === "" ? null : actualRaw,
    amountSpent: spentRaw === "" ? null : spentRaw,
    currency: formData.get("currency") || DEFAULT_TASK_CURRENCY,
    orderPlacedDate: formData.get("orderPlacedDate") || null,
    expectedReceiveDate: formData.get("expectedReceiveDate") || null,
    receivedDate: formData.get("receivedDate") || null,
  };
}
