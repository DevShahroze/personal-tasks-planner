"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function KametiDetailPage() {
  const { id } = useParams();
  const todayYmd = useClientTodayYmd()?.ymd || "";
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["planning", "kameti", id],
    queryFn: () => planningApi.kameti.get(id),
  });
  const addContribution = useMutation({
    mutationFn: (body) => planningApi.kameti.addContribution(id, body, todayYmd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "kameti"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
    },
  });
  const recordPayout = useMutation({
    mutationFn: (body) => planningApi.kameti.recordPayout(id, body, todayYmd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "kameti"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
    },
  });

  if (query.isLoading) return <Spinner label="Loading…" />;
  if (!query.data) return <Alert variant="error">Not found</Alert>;
  const item = query.data;

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Link href="/planning/kameti" className="text-sm hover:underline">
        ← Kameti
      </Link>
      <h1 className="page-title">{item.planName}</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="surface-card text-sm">
        <p>Status: {item.status}</p>
        <p>
          Remaining owed:{" "}
          {formatCurrency(item.remainingContributionsOwed, item.currency)}
        </p>
        <p>Next contribution: {formatDate(item.nextContributionDueDate)}</p>
        <p>Expected payout: {formatDate(item.expectedPayoutDate)}</p>
        <p>
          Payout received:{" "}
          {item.payoutReceivedAt ? formatDate(item.payoutReceivedAt) : "—"}
        </p>
      </div>
      <form
        className="surface-card flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await addContribution.mutateAsync({ amount: Number(fd.get("amount")) });
            e.currentTarget.reset();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Contribution amount"
          required
        />
        <Button type="submit">Record contribution</Button>
      </form>
      <form
        className="surface-card flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await recordPayout.mutateAsync({
              payoutAmount: Number(fd.get("payoutAmount")),
              payoutReceivedAt: fd.get("payoutReceivedAt") || undefined,
            });
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <Input
          name="payoutAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Payout amount"
          required
        />
        <Input name="payoutReceivedAt" type="date" />
        <Button type="submit" variant="secondary">
          Record payout received
        </Button>
      </form>
    </div>
  );
}
