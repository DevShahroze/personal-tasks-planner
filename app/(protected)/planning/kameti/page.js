"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";

export default function KametiListPage() {
  const query = useQuery({
    queryKey: ["planning", "kameti"],
    queryFn: () => planningApi.kameti.list({ limit: 50 }),
  });
  if (query.isLoading) return <Spinner label="Loading Kameti plans…" />;
  const items = query.data?.items || [];
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <p className="text-sm text-muted-foreground">
        <Link href="/planning" className="hover:underline">
          Planning
        </Link>{" "}
        / Kameti
      </p>
      <h1 className="page-title">Kameti plans</h1>
      <Link
        href="/planning/kameti/new"
        className="inline-flex rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground"
      >
        New plan
      </Link>
      {!items.length ? (
        <EmptyState title="No Kameti plans" />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {items.map((item) => (
            <li key={item._id} className="px-3 py-2">
              <Link
                href={`/planning/kameti/${item._id}`}
                className="block hover:underline"
              >
                {item.planName} · {item.status}
                <span className="block text-xs text-muted-foreground">
                  Remaining{" "}
                  {formatCurrency(item.remainingContributionsOwed, item.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
