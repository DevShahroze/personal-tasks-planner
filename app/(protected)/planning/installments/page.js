"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";

export default function InstallmentsPage() {
  const query = useQuery({
    queryKey: ["planning", "installments"],
    queryFn: () => planningApi.installments.list({ limit: 50 }),
  });

  if (query.isLoading) {
    return <Spinner label="Loading installments…" />;
  }

  const items = query.data?.items || [];

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <p className="text-sm text-muted-foreground">
        <Link href="/planning" className="hover:underline">
          Planning
        </Link>{" "}
        / Installments
      </p>
      <h1 className="page-title">Installments & dues</h1>
      <Link
        href="/planning/installments/new"
        className="inline-flex rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
      >
        New commitment
      </Link>
      {!items.length ? (
        <EmptyState
          title="No commitments"
          description="Create an installment plan to track dues."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {items.map((item) => (
            <li key={item._id} className="px-3 py-2">
              <Link
                href={`/planning/installments/${item._id}`}
                className="block hover:underline"
              >
                <span className="font-medium">{item.name}</span>
                <p className="text-xs text-muted-foreground">
                  {item.status} · Outstanding{" "}
                  {formatCurrency(item.outstandingBalance, item.currency)}
                  {item.nextDueDate
                    ? ` · Next due ${formatDate(item.nextDueDate)}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
