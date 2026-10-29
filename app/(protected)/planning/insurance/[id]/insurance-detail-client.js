"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useInsurancePolicy } from "@/hooks/use-planning";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import InsuranceFormFields, {
  insurancePayloadFromFormData,
} from "@/components/planning/insurance-form-fields";
import {
  validateInsuranceUpdate,
  validatePlanningPayment,
} from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";
import { validatePaymentAmount } from "@/lib/finance/balance";

export default function InsurancePolicyDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [editKey, setEditKey] = useState(0);
  const query = useInsurancePolicy(id);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.planning.insurance.detail(id),
    });
    queryClient.invalidateQueries({ queryKey: ["planning", "insurance"] });
    queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
  };

  const update = useMutation({
    mutationFn: (body) => planningApi.insurance.update(id, body),
    onSuccess: () => {
      invalidate();
      setEditKey((value) => value + 1);
    },
  });

  const remove = useMutation({
    mutationFn: () => planningApi.insurance.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "insurance"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/insurance");
    },
  });

  const addPayment = useMutation({
    mutationFn: (body) => planningApi.insurance.addPayment(id, body, todayYmd),
    onSuccess: invalidate,
  });

  const removePayment = useMutation({
    mutationFn: (paymentId) => planningApi.insurance.removePayment(id, paymentId),
    onSuccess: invalidate,
  });

  if (query.isLoading) {
    return <Spinner label="Loading…" />;
  }
  const item = query.data;
  if (!item) {
    return <Alert variant="error">Policy not found</Alert>;
  }

  return (
    <div className="page-stack mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/planning/insurance" className="hover:underline">
              Insurance
            </Link>{" "}
            / {item.policyNumber}
          </p>
          <h1 className="page-title">{item.insurerName}</h1>
          <p className="page-lead">
            {item.status} · Premium {formatCurrency(item.premiumAmount, item.currency)}{" "}
            · Next due {formatDate(item.nextDueDate)}
          </p>
        </div>
        <Button
          variant="danger"
          type="button"
          disabled={remove.isPending}
          onClick={async () => {
            if (!window.confirm("Delete this policy and payment history?")) {
              return;
            }
            setError("");
            try {
              await remove.mutateAsync();
            } catch (err) {
              setError(apiErrorMessage(err));
            }
          }}
        >
          Delete
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        key={editKey}
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const body = insurancePayloadFromFormData(new FormData(event.currentTarget), {
            includeStatus: true,
          });
          const validated = validateInsuranceUpdate(body);
          if (!validated.ok) {
            setError(formatValidationErrors(validated.errors));
            return;
          }
          if (!Object.keys(validated.patch).length) {
            setError("No changes to save.");
            return;
          }
          try {
            await update.mutateAsync(validated.patch);
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        }}
      >
        <h2 className="text-sm font-semibold">Policy details</h2>
        <InsuranceFormFields idPrefix="edit-insurance" defaults={item} showStatus />
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="surface-card grid gap-2 text-sm md:grid-cols-2">
        <p>Outstanding: {formatCurrency(item.outstandingBalance, item.currency)}</p>
        <p>Total premium: {formatCurrency(item.totalPremiumAmount, item.currency)}</p>
        <p>Premiums paid: {item.premiumsPaid}</p>
        {item.termYears ? <p>Term: {item.termYears} years</p> : null}
        {item.totalPremiumPayments ? (
          <p>Total payments: {item.totalPremiumPayments}</p>
        ) : null}
        <p>End date: {formatDate(item.endDate)}</p>
      </div>

      <div className="surface-card space-y-3">
        <h2 className="text-sm font-semibold">Premium payments</h2>
        {!item.payments?.length ? (
          <p className="text-xs text-muted-foreground">No payments logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {item.payments.map((payment, index) => (
              <li
                key={payment._id || index}
                className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm"
              >
                <div>
                  {formatCurrency(payment.amount, item.currency)} on{" "}
                  {formatDate(payment.paidAt)}
                  {payment.note ? ` · ${payment.note}` : ""}
                  <span className="block text-xs text-muted-foreground">
                    Logged {formatDateTime(payment.createdAt)}
                  </span>
                </div>
                {payment._id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    disabled={removePayment.isPending}
                    onClick={async () => {
                      if (!window.confirm("Remove this payment?")) {
                        return;
                      }
                      setError("");
                      try {
                        await removePayment.mutateAsync(payment._id);
                      } catch (err) {
                        setError(apiErrorMessage(err));
                      }
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {item.status !== "completed" && item.status !== "cancelled" ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const form = event.currentTarget;
              const fd = new FormData(form);
              const paymentCheck = validatePlanningPayment({
                amount: fd.get("amount"),
                paidAt: fd.get("paidAt") || undefined,
              });
              if (!paymentCheck.ok) {
                setError(formatValidationErrors(paymentCheck.errors));
                return;
              }
              const balanceCheck = validatePaymentAmount(
                paymentCheck.value.amount,
                item.outstandingBalance,
              );
              if (!balanceCheck.ok) {
                setError(balanceCheck.error);
                return;
              }
              try {
                await addPayment.mutateAsync({
                  amount: paymentCheck.value.amount,
                  paidAt: fd.get("paidAt") || undefined,
                });
                form.reset();
              } catch (err) {
                setError(apiErrorMessage(err));
              }
            }}
          >
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Amount"
              className="max-w-[10rem]"
            />
            <Input name="paidAt" type="date" className="max-w-[10rem]" />
            <Button type="submit" disabled={addPayment.isPending || !todayYmd}>
              Log premium payment
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
