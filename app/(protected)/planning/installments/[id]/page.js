"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useInstallmentCommitment } from "@/hooks/use-planning";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import InstallmentFormFields, {
  installmentPayloadFromFormData,
} from "@/components/planning/installment-form-fields";
import {
  validateInstallmentUpdate,
  validateInstallmentPaymentLog,
} from "@/lib/planning/validate";
import { toastFormError, toastValidationErrors } from "@/lib/planning/form-errors";
import { validatePaymentAmount } from "@/lib/finance/balance";
import {
  installmentIsOpenEnded,
  installmentTotalPaid,
} from "@/lib/planning/installment-display.js";
import StickyPageFooter from "@/components/layout/sticky-page-footer";
import { useConfirm } from "@/contexts/confirm-context";
import PauseResumeButton from "@/components/planning/pause-resume-button";

export default function InstallmentDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const confirm = useConfirm();
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentKind, setPaymentKind] = useState("installment");

  const detailQuery = useInstallmentCommitment(id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["planning", "installments"] });
    queryClient.invalidateQueries({
      queryKey: queryKeys.planning.installments.detail(id),
    });
    queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
  };

  const update = useMutation({
    mutationFn: (body) => planningApi.installments.update(id, body),
    onSuccess: () => {
      invalidate();
      setEditKey((value) => value + 1);
    },
  });

  const remove = useMutation({
    mutationFn: () => planningApi.installments.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "installments"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/installments");
    },
  });

  const addPayment = useMutation({
    mutationFn: (body) => planningApi.installments.addPayment(id, body, todayYmd),
    onSuccess: () => {
      invalidate();
      setAmount("");
      setPaidAt("");
      setPaymentKind("installment");
    },
  });

  if (detailQuery.isLoading) {
    return <Spinner label="Loading…" />;
  }
  if (!detailQuery.data) {
    return <Alert variant="error">Not found</Alert>;
  }

  const item = detailQuery.data;
  const openEnded = installmentIsOpenEnded(item);
  const totalPaid = installmentTotalPaid(item);

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete installment?",
      description:
        "Delete this installment commitment and its payment history? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await remove.mutateAsync();
  };

  return (
    <div className="page-stack mx-auto w-full max-w-4xl pb-20">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/planning/installments" className="hover:underline">
            Installments
          </Link>{" "}
          / {item.name}
        </p>
        <h1 className="page-title">{item.name}</h1>
        <p className="page-lead">
          {item.status}
          {openEnded ? (
            <> · Open-ended · Paid so far {formatCurrency(totalPaid, item.currency)}</>
          ) : (
            <> · Outstanding {formatCurrency(item.outstandingBalance, item.currency)}</>
          )}{" "}
          · Next due {formatDate(item.nextDueDate)}
        </p>
      </div>

      <form
        id="installment-edit-form"
        key={editKey}
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const body = installmentPayloadFromFormData(
            new FormData(event.currentTarget),
            {
              includeStatus: true,
            },
          );
          const validated = validateInstallmentUpdate(body);
          if (!validated.ok) {
            toastValidationErrors(validated.errors);
            return;
          }
          await update.mutateAsync(validated.patch);
        }}
      >
        <h2 className="text-sm font-semibold">Commitment details</h2>
        <InstallmentFormFields idPrefix="edit-installment" defaults={item} showStatus />
      </form>

      <div className="surface-card grid gap-2 text-sm md:grid-cols-2">
        <p>Installments paid: {item.installmentsPaid}</p>
        {item.downPaymentAmount ? (
          <p>
            Down payment: {formatCurrency(item.downPaymentAmount, item.currency)}
            {item.downPaymentDate ? ` on ${formatDate(item.downPaymentDate)}` : null}
          </p>
        ) : null}
        {item.installmentAmount ? (
          <p>
            Typical installment: {formatCurrency(item.installmentAmount, item.currency)}
          </p>
        ) : (
          <p className="text-muted-foreground">Variable payment amounts each period</p>
        )}
        {openEnded ? (
          <p>
            Total paid so far: {formatCurrency(totalPaid, item.currency)} · No fixed cap
          </p>
        ) : (
          <p>Total: {formatCurrency(item.totalAmount, item.currency)}</p>
        )}
      </div>

      <div className="surface-card space-y-3">
        <h2 className="text-sm font-semibold">Payments</h2>
        {!item.payments?.length ? (
          <p className="text-xs text-muted-foreground">No payments logged yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(item.payments || []).map((payment, index) => (
              <li key={payment._id || index} className="py-2">
                {formatCurrency(payment.amount, item.currency)} on{" "}
                {formatDate(payment.paidAt)}
                {payment.note ? (
                  <span className="text-muted-foreground"> — {payment.note}</span>
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
              const paymentCheck = validateInstallmentPaymentLog({
                amount,
                paidAt: paidAt || undefined,
                paymentKind,
              });
              if (!paymentCheck.ok) {
                toastValidationErrors(paymentCheck.errors);
                return;
              }
              if (!openEnded) {
                const balanceCheck = validatePaymentAmount(
                  amount,
                  item.outstandingBalance,
                );
                if (!balanceCheck.ok) {
                  toastFormError(balanceCheck.error);
                  return;
                }
              }
              await addPayment.mutateAsync({
                amount: paymentCheck.value.amount,
                paidAt: paidAt || undefined,
                paymentKind,
              });
            }}
          >
            <Select
              name="paymentKind"
              value={paymentKind}
              onChange={(event) => setPaymentKind(event.target.value)}
              className="max-w-[11rem]"
              aria-label="Payment type"
            >
              <option value="installment">Installment</option>
              <option value="down_payment">Down payment</option>
              <option value="balloon">Balloon payment</option>
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Amount"
              className="max-w-[10rem]"
            />
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="max-w-[10rem]"
            />
            <Button type="submit" disabled={addPayment.isPending || !todayYmd}>
              Record payment
            </Button>
          </form>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Updated {formatDateTime(item.updatedAt)}
      </p>

      <StickyPageFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/planning/installments")}
        >
          Cancel
        </Button>
        <PauseResumeButton
          status={item.status}
          disabled={update.isPending}
          onPause={async () => {
            await update.mutateAsync({ status: "paused" });
          }}
          onResume={async () => {
            await update.mutateAsync({ status: "active" });
          }}
        />
        <Button
          type="button"
          variant="danger"
          disabled={remove.isPending}
          onClick={onDelete}
        >
          Delete
        </Button>
        <Button type="submit" form="installment-edit-form" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </StickyPageFooter>
    </div>
  );
}
