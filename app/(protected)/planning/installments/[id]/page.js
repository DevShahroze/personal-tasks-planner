"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function InstallmentDetailPage() {
  const params = useParams();
  const id = params.id;
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");

  const detailQuery = useQuery({
    queryKey: ["planning", "installments", id],
    queryFn: () => planningApi.installments.get(id),
    enabled: Boolean(id),
  });

  const addPayment = useMutation({
    mutationFn: (body) => planningApi.installments.addPayment(id, body, todayYmd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "installments"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "installments", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      setAmount("");
      setPaidAt("");
    },
  });

  if (detailQuery.isLoading) {
    return <Spinner label="Loading…" />;
  }
  if (!detailQuery.data) {
    return <Alert variant="error">Not found</Alert>;
  }

  const item = detailQuery.data;

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <p className="text-sm text-muted-foreground">
        <Link href="/planning/installments" className="hover:underline">
          Installments
        </Link>{" "}
        / {item.name}
      </p>
      <h1 className="page-title">{item.name}</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="surface-card grid gap-2 text-sm md:grid-cols-2">
        <p>Status: {item.status}</p>
        <p>Outstanding: {formatCurrency(item.outstandingBalance, item.currency)}</p>
        <p>Total: {formatCurrency(item.totalAmount, item.currency)}</p>
        <p>Installments paid: {item.installmentsPaid}</p>
        <p>Next due: {formatDate(item.nextDueDate)}</p>
        <p>Frequency: {item.frequency}</p>
      </div>
      <div className="surface-card">
        <h2 className="text-sm font-semibold">Payments</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {(item.payments || []).map((payment, index) => (
            <li key={payment._id || index} className="py-2">
              {formatCurrency(payment.amount, item.currency)} on {formatDate(payment.paidAt)}
            </li>
          ))}
        </ul>
        {item.status !== "completed" && item.status !== "cancelled" ? (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              try {
                await addPayment.mutateAsync({
                  amount: Number(amount),
                  paidAt: paidAt || undefined,
                });
              } catch (err) {
                setError(err.message || "Payment failed");
              }
            }}
          >
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            <Button type="submit" disabled={addPayment.isPending || !todayYmd}>
              Record payment
            </Button>
          </form>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Updated {formatDateTime(item.updatedAt)}</p>
    </div>
  );
}
