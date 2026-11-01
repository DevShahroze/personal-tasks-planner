"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import {
  useFinancialRecord,
  useFinancialRecordMutations,
} from "@/hooks/use-financial-records";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_TYPE_LABEL } from "@/lib/finance/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import FinancialRecordForm from "@/components/finance/financial-record-form";
import FinancialRecordDetailView from "@/components/finance/financial-record-detail-view";
import { useConfirm } from "@/contexts/confirm-context";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastSuccess } from "@/lib/toast-bus";

export default function FinancialRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const recordId = params.id;
  const recordQuery = useFinancialRecord(recordId, todayYmd, Boolean(todayYmd));
  const { remove, addPayment, update } = useFinancialRecordMutations();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  if (!todayYmd || recordQuery.isLoading) {
    return <Spinner label="Loading record…" />;
  }

  if (recordQuery.isError || !recordQuery.data) {
    return <Alert variant="error">Financial record not found</Alert>;
  }

  const record = recordQuery.data;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete financial record?",
      description:
        "Delete this financial record and its payment history? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await remove.mutateAsync(recordId);
    router.push("/financial-records");
  };

  const showReadOnlyFooter = !editing;

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/financial-records" className="hover:underline">
            Financial
          </Link>{" "}
          / {record.partyName}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">
          {record.partyName} · {FINANCIAL_TYPE_LABEL[record.type]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {FINANCIAL_STATUS_LABEL[record.status]}
          {record.overdue ? " · Overdue" : ""}
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {editing ? (
        <FinancialRecordForm
          key={`${recordId}-${record.updatedAt}`}
          recordId={recordId}
          idPrefix="edit-financial"
          initialValues={record}
          submitting={update.isPending}
          submitLabel="Update record"
          onCancelEdit={() => {
            setEditing(false);
            setError("");
          }}
          onDelete={onDelete}
          deleting={remove.isPending}
          onSubmit={async (body) => {
            setError("");
            try {
              await update.mutateAsync({ id: recordId, body });
              toastSuccess("Record updated");
              setEditing(false);
            } catch (err) {
              if (Array.isArray(err.details)) {
                setError(err.details.join(", "));
              } else {
                setError(err.message || "Could not save record");
              }
            }
          }}
        />
      ) : (
        <>
          <FinancialRecordDetailView record={record} />

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
              Payment history
            </h2>
            {!record.payments?.length ? (
              <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {record.payments.map((payment, index) => (
                  <li key={payment._id || index} className="py-2 text-sm">
                    {formatCurrency(payment.amount, record.currency)} on{" "}
                    {formatDate(payment.paidAt)}
                    {payment.note ? ` · ${payment.note}` : ""}
                    <span className="block text-xs text-muted-foreground">
                      Logged {formatDateTime(payment.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {record.status !== "settled" ? (
              <form
                className="mt-4 grid gap-2 md:grid-cols-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError("");
                  try {
                    await addPayment.mutateAsync({
                      id: recordId,
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
            ) : (
              <Alert variant="success" className="mt-4">
                This record is settled.
              </Alert>
            )}
          </section>
        </>
      )}

      {showReadOnlyFooter ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
