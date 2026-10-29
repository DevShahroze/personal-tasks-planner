"use client";

import Link from "next/link";
import { useSubscriptions } from "@/hooks/use-planning";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";

export default function SubscriptionsPage() {
  const query = useSubscriptions();
  if (query.isLoading) return <Spinner label="Loading…" />;
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <Link href="/planning" className="text-sm hover:underline">
        Planning
      </Link>
      <h1 className="page-title">Subscriptions</h1>
      <Link href="/planning/subscriptions/new" className="text-xs underline">
        New subscription
      </Link>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {(query.data?.items || []).map((item) => (
          <li key={item._id} className="px-3 py-2">
            <Link
              href={`/planning/subscriptions/${item._id}`}
              className="hover:underline"
            >
              {item.serviceName} · {formatCurrency(item.amount, item.currency)} · Next{" "}
              {formatDate(item.nextBillingDate)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
