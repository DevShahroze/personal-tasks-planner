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
import InsurancePolicyForm from "@/components/planning/insurance-policy-form";
import InsuranceDetailView from "@/components/planning/insurance-detail-view";
import {
  validateInsuranceUpdate,
  validatePlanningPayment,
} from "@/lib/planning/validate";
import { toastFormError, toastValidationErrors } from "@/lib/planning/form-errors";
import { validatePaymentAmount } from "@/lib/finance/balance";
import { useConfirm } from "@/contexts/confirm-context";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastSuccess } from "@/lib/toast-bus";
import PlanningExportMenu from "@/components/planning/planning-export-menu";
import { formatInsuranceAnnualDueLabel } from "@/lib/planning/insurance";

export default function InsurancePolicyDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
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

  const showReadOnlyFooter = !editing;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete policy?",
      description: "Delete this policy and its payment history? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await remove.mutateAsync();
  };

  return (
    <div
      className={`page-stack mx-auto w-full max-w-4xl ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/planning/insurance" className="hover:underline">
              Insurance
            </Link>{" "}
            / {item.policyNumber}
          </p>
          <h1 className="page-title">{item.insurerName || item.policyNumber}</h1>
          <p className="page-lead">
            {item.status}
            {item.sumAssured != null
              ? ` · Sum assured ${formatCurrency(item.sumAssured, item.currency)}`
              : ""}{" "}
            ·{" "}
            {formatInsuranceAnnualDueLabel(item.premiumDueMonth, item.premiumDueDay) ||
              `Next due ${formatDate(item.nextDueDate)}`}
            {(item.premiumPaymentYears ?? item.termYears)
              ? ` · Pay ${item.premiumPaymentYears ?? item.termYears} yr`
              : ""}
            {item.maturityYears ? ` · Matures ${item.maturityYears} yr` : ""}
          </p>
        </div>
        <PlanningExportMenu kind="insurance" record={item} />
      </div>

      <div className="surface-card">
        {editing ? (
          <InsurancePolicyForm
            key={`${id}-${editKey}-${item.updatedAt}`}
            isEditForm
            idPrefix="edit-insurance"
            formId="edit-insurance-form"
            defaults={item}
            showStatus
            submitting={update.isPending}
            deleting={remove.isPending}
            submitLabel="Save changes"
            onCancelEdit={() => setEditing(false)}
            onDelete={onDelete}
            onSubmit={async (body) => {
              const validated = validateInsuranceUpdate(body);
              if (!validated.ok) {
                toastValidationErrors(validated.errors);
                return;
              }
              if (!Object.keys(validated.patch).length) {
                toastFormError("No changes to save.");
                return;
              }
              await update.mutateAsync(validated.patch);
              toastSuccess("Policy updated");
              setEditing(false);
            }}
          />
        ) : (
          <InsuranceDetailView policy={item} />
        )}
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
                      const ok = await confirm({
                        title: "Remove payment?",
                        description: "Remove this premium payment from history?",
                        confirmLabel: "Remove",
                        variant: "danger",
                      });
                      if (!ok) {
                        return;
                      }
                      await removePayment.mutateAsync(payment._id);
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
              const form = event.currentTarget;
              const fd = new FormData(form);
              const paymentCheck = validatePlanningPayment({
                amount: fd.get("amount"),
                paidAt: fd.get("paidAt") || undefined,
              });
              if (!paymentCheck.ok) {
                toastValidationErrors(paymentCheck.errors);
                return;
              }
              const balanceCheck = validatePaymentAmount(
                paymentCheck.value.amount,
                item.outstandingBalance,
              );
              if (!balanceCheck.ok) {
                toastFormError(balanceCheck.error);
                return;
              }
              await addPayment.mutateAsync({
                amount: paymentCheck.value.amount,
                paidAt: fd.get("paidAt") || undefined,
              });
              form.reset();
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

      {showReadOnlyFooter ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
