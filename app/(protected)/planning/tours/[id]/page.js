"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function TourDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["planning", "tours", id],
    queryFn: () => planningApi.tours.get(id),
  });
  const addExpense = useMutation({
    mutationFn: (body) => planningApi.tours.addExpense(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "tours", id] });
    },
  });
  if (query.isLoading) return <Spinner label="Loading…" />;
  const item = query.data;
  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Link href="/planning/tours" className="text-sm hover:underline">
        Tours
      </Link>
      <h1 className="page-title">{item.name}</h1>
      <p className="text-sm">
        {item.destination} · {formatDate(item.startDate)} – {formatDate(item.endDate)} ·{" "}
        {item.durationDays} days
      </p>
      <p className="text-sm">
        Budget est. {formatCurrency(item.estimatedBudget, item.currency)} · Actual{" "}
        {formatCurrency(item.actualTotalExpenses, item.currency)}
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await addExpense.mutateAsync({
            amount: Number(fd.get("amount")),
            date: fd.get("date"),
            category: fd.get("category") || "General",
          });
          e.currentTarget.reset();
        }}
      >
        <Input name="amount" type="number" step="0.01" min="0.01" required />
        <Input name="date" type="date" required />
        <Input name="category" placeholder="Category" />
        <Button type="submit">Add expense</Button>
      </form>
      <ul className="divide-y divide-border text-sm">
        {(item.expenses || []).map((expense, index) => (
          <li key={expense._id || index} className="py-1">
            {formatCurrency(expense.amount, item.currency)} · {expense.category} ·{" "}
            {formatDate(expense.date)}
          </li>
        ))}
      </ul>
    </div>
  );
}
