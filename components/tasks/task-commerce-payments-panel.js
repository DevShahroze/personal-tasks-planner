"use client";

import { useState } from "react";
import { commercePaymentHeadroom } from "@/lib/task-commerce/order-payment-math";
import { taskTracksOrderPurchase } from "@/lib/task-commerce/tracking";
import { useTaskCommercePaymentMutation } from "@/hooks/use-tasks";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toastSuccess } from "@/lib/toast-bus";

export default function TaskCommercePaymentsPanel({ task }) {
  const addPayment = useTaskCommercePaymentMutation();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [error, setError] = useState("");

  if (!taskTracksOrderPurchase(task)) {
    return null;
  }

  const payments = task.orderPayments || [];
  const headroom = commercePaymentHeadroom(task.estimatedValue, payments);
  const settled =
    task.estimatedValue != null &&
    headroom !== null &&
    headroom <= 0 &&
    payments.length;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Order payments</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Record each partial payment. Amount spent updates from the payment total
        {task.estimatedValue != null
          ? " and cannot exceed the order total (estimated)."
          : "."}
      </p>

      {task.estimatedValue != null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {headroom != null && headroom > 0
            ? `Remaining against estimate: ${formatCurrency(headroom, task.currency)}`
            : null}
          {settled
            ? `Paid in full (${formatCurrency(task.estimatedValue, task.currency)} estimated).`
            : null}
        </p>
      ) : null}

      {error ? (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      ) : null}

      {!payments.length ? (
        <p className="mt-3 text-xs text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {payments.map((payment, index) => (
            <li key={payment._id || index} className="py-2 text-sm">
              {formatCurrency(payment.amount, task.currency)} on{" "}
              {formatDate(payment.paidAt)}
              {payment.note ? ` · ${payment.note}` : ""}
              <span className="block text-xs text-muted-foreground">
                Logged {formatDateTime(payment.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {settled ? (
        <Alert variant="success" className="mt-4">
          Estimated order total is fully paid.
        </Alert>
      ) : (
        <form
          className="mt-4 grid gap-2 md:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              await addPayment.mutateAsync({
                id: task._id,
                body: {
                  amount: Number(paymentAmount),
                  paidAt: paymentDate || undefined,
                  note: paymentNote,
                },
              });
              setPaymentAmount("");
              setPaymentDate("");
              setPaymentNote("");
              toastSuccess("Payment recorded");
            } catch (err) {
              if (Array.isArray(err.details)) {
                setError(err.details.join(", "));
              } else {
                setError(err.message || "Could not record payment");
              }
            }
          }}
        >
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            required
          />
          <Input
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />
          <Input
            placeholder="Payment note"
            value={paymentNote}
            onChange={(event) => setPaymentNote(event.target.value)}
          />
          <Button
            type="submit"
            className="md:col-span-3 md:ml-auto md:w-auto"
            disabled={addPayment.isPending}
          >
            {addPayment.isPending ? "Saving…" : "Record payment"}
          </Button>
        </form>
      )}
    </section>
  );
}
