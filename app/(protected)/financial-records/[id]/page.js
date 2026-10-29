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
import FinancialRecordFormFields, {
  financialRecordPayloadFromFormData,
} from "@/components/finance/financial-record-form-fields";

export default function FinancialRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const recordId = params.id;
  const recordQuery = useFinancialRecord(recordId, todayYmd, Boolean(todayYmd));
  const { remove, addPayment, update } = useFinancialRecordMutations();
  const [error, setError] = useState("");
  const [editKey, setEditKey] = useState(0);
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
    if (!window.confirm("Delete this financial record and its payment history?")) {
      return;
    }
    await remove.mutateAsync(recordId);
    router.push("/financial-records");
  };

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/financial-records" className="hover:underline">
              Financial
            </Link>{" "}
            / {record.partyName}
          </p>
          <h1 className="page-title">
            {record.partyName} · {FINANCIAL_TYPE_LABEL[record.type]}
          </h1>
          <p className="page-lead">
            {FINANCIAL_STATUS_LABEL[record.status]}
            {record.overdue ? " · Overdue" : ""}
          </p>
        </div>
        <Button variant="danger" onClick={onDelete}>
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
          const body = financialRecordPayloadFromFormData(
            new FormData(event.currentTarget),
          );
          try {
            await update.mutateAsync({ id: recordId, body });
            setEditKey((value) => value + 1);
          } catch (err) {
            if (Array.isArray(err.details)) {
              setError(err.details.join(", "));
            } else {
              setError(err.message || "Could not save record");
            }
          }
        }}
      >
        <h2 className="text-sm font-semibold">Record details</h2>
        <FinancialRecordFormFields
          idPrefix="edit-financial"
          defaults={record}
          showOriginalAmount={false}
        />
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="surface-card grid gap-3 md:grid-cols-2">
        <Meta
          label="Outstanding"
          value={formatCurrency(record.outstandingBalance, record.currency)}
        />
        <Meta
          label="Original amount"
          value={formatCurrency(record.originalAmount, record.currency)}
        />
        <Meta label="Updated" value={formatDateTime(record.updatedAt)} />
        {record.taskId ? (
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Linked task
            </p>
            <Link
              href={`/tasks/${record.taskId._id || record.taskId}`}
              className="mt-1 inline-block text-sm font-medium hover:underline"
            >
              {record.taskId.title || "View task"}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="surface-card space-y-3">
        <h2 className="text-sm font-semibold">Payment history</h2>
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
            className="grid gap-2 md:grid-cols-3"
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
              className="md:col-span-3"
              disabled={addPayment.isPending}
            >
              Record payment
            </Button>
          </form>
        ) : (
          <Alert variant="success">This record is settled.</Alert>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
