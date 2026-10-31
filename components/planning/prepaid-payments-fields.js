"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import FieldLabel from "@/components/ui/field-label";
import FieldInfoPopover from "@/components/ui/field-info-popover";

export default function PrepaidPaymentsFields({
  periodAmountLabel = "each period’s amount",
  max = 120,
  variableAmounts = false,
}) {
  const [lumpSum, setLumpSum] = useState("");
  const [variableText, setVariableText] = useState("");
  const [count, setCount] = useState("");

  const hasLumpSum = lumpSum.trim() !== "";
  const hasVariable = variableText.trim().length > 0;
  const hasCount = count.trim() !== "" && count.trim() !== "0";

  const onLumpSumChange = (event) => {
    const value = event.target.value;
    setLumpSum(value);
    if (value.trim() !== "") {
      setVariableText("");
      setCount("");
    }
  };

  const onVariableChange = (event) => {
    const value = event.target.value;
    setVariableText(value);
    if (value.trim() !== "") {
      setLumpSum("");
      setCount("");
    }
  };

  const onCountChange = (event) => {
    const value = event.target.value;
    setCount(value);
    if (value.trim() !== "" && value.trim() !== "0") {
      setLumpSum("");
      setVariableText("");
    }
  };

  return (
    <fieldset className="space-y-3 rounded-md border border-border p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
        Already paid (optional)
        <FieldInfoPopover label="About already paid installments">
          Catch up payment history in one of three ways: one lump sum total, a list of
          variable period amounts, or a count of same-sized periods from the start date.
          Use only one method.
        </FieldInfoPopover>
      </legend>

      <div className="space-y-1">
        <FieldLabel
          htmlFor="prepaid-lump-sum"
          label="Total already paid (lump sum)"
          info={
            <>
              One payment for everything you have already paid so far — no need to split
              by month. Requires a start date (recorded on that date). Filling this
              disables the other two options.
            </>
          }
        />
        <Input
          id="prepaid-lump-sum"
          name="prepaidLumpSum"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 52800 or 52,800"
          value={lumpSum}
          disabled={hasVariable || hasCount}
          onChange={onLumpSumChange}
        />
      </div>

      {variableAmounts ? (
        <div
          className={`space-y-1 ${hasLumpSum ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={hasLumpSum || undefined}
        >
          <FieldLabel
            htmlFor="prepaid-payment-amounts"
            label="Variable amounts (one per line)"
            info={
              <>
                Enter one amount per billing period, in order from the start date.
                Disabled when lump sum or period count is used.
              </>
            }
          />
          <Textarea
            id="prepaid-payment-amounts"
            name={hasLumpSum || hasCount ? undefined : "prepaidPaymentAmounts"}
            rows={4}
            value={variableText}
            disabled={hasLumpSum || hasCount}
            readOnly={hasLumpSum}
            onChange={onVariableChange}
          />
        </div>
      ) : null}

      <div
        className={`space-y-1 ${hasLumpSum ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={hasLumpSum || undefined}
      >
        <FieldLabel
          htmlFor="prepaid-payments-count"
          label="Same amount each period — count already paid"
          info={`Number of consecutive periods already paid from the start date, each for ${periodAmountLabel}. Disabled when lump sum or variable amounts is used.`}
        />
        <Input
          id="prepaid-payments-count"
          name={hasLumpSum || hasVariable ? undefined : "prepaidPaymentsCount"}
          type="number"
          min="0"
          max={String(max)}
          step="1"
          value={count}
          disabled={hasLumpSum || hasVariable}
          readOnly={hasLumpSum}
          onChange={onCountChange}
        />
      </div>
    </fieldset>
  );
}
