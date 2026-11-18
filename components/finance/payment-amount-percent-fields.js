"use client";

import { useCallback, useState } from "react";
import {
  formatPaymentPercentDisplay,
  paymentAmountFromOutstandingPercent,
  paymentPercentFromAmount,
} from "@/lib/finance/payment-percent";
import Input from "@/components/ui/input";

export function usePaymentAmountPercent(outstandingBalance) {
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("");

  const reset = useCallback(() => {
    setAmount("");
    setPercent("");
  }, []);

  const onAmountChange = useCallback(
    (raw) => {
      setAmount(raw);
      if (raw === "" || raw === null) {
        setPercent("");
        return;
      }
      const pct = paymentPercentFromAmount(raw, outstandingBalance);
      setPercent(pct != null ? formatPaymentPercentDisplay(pct) : "");
    },
    [outstandingBalance],
  );

  const onPercentChange = useCallback(
    (raw) => {
      if (raw === "" || raw === null) {
        setPercent("");
        setAmount("");
        return;
      }
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        setPercent(raw);
        return;
      }
      const clamped = Math.min(100, Math.max(0, numeric));
      const percentText =
        numeric > 100
          ? "100"
          : raw.endsWith(".")
            ? raw
            : formatPaymentPercentDisplay(clamped);
      setPercent(percentText);
      const nextAmount = paymentAmountFromOutstandingPercent(
        Math.min(100, numeric),
        outstandingBalance,
      );
      setAmount(nextAmount != null ? String(nextAmount) : "");
    },
    [outstandingBalance],
  );

  return {
    amount,
    percent,
    onAmountChange,
    onPercentChange,
    reset,
  };
}

export default function PaymentAmountPercentFields({
  outstandingBalance,
  amount,
  percent,
  onAmountChange,
  onPercentChange,
  amountId = "payment-amount",
  percentId = "payment-percent",
  disabled = false,
}) {
  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="text-xs text-muted-foreground">Amount</span>
        <Input
          id={amountId}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amount}
          disabled={disabled}
          onChange={(event) => onAmountChange(event.target.value)}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-xs text-muted-foreground">% of outstanding</span>
        <Input
          id={percentId}
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="%"
          value={percent}
          disabled={disabled}
          onChange={(event) => onPercentChange(event.target.value)}
        />
      </label>
    </>
  );
}
