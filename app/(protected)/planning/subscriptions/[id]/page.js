"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/use-planning";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const query = useSubscription(id);
  const addPayment = useMutation({
    mutationFn: (body) => planningApi.subscriptions.addPayment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "subscriptions", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
    },
  });
  if (query.isLoading) return <Spinner label="Loading…" />;
  const item = query.data;
  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Link href="/planning/subscriptions" className="text-sm hover:underline">
        Subscriptions
      </Link>
      <h1 className="page-title">{item.serviceName}</h1>
      <p className="text-sm">
        {item.status} · {formatCurrency(item.amount, item.currency)} · Next billing{" "}
        {formatDate(item.nextBillingDate)}
      </p>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await addPayment.mutateAsync({ amount: Number(fd.get("amount")) });
          e.currentTarget.reset();
        }}
      >
        <Input name="amount" type="number" step="0.01" min="0.01" required />
        <Button type="submit">Log payment</Button>
      </form>
    </div>
  );
}
