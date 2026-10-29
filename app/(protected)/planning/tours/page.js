"use client";

import Link from "next/link";
import { useTours } from "@/hooks/use-planning";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";

export default function ToursPage() {
  const query = useTours();
  if (query.isLoading) return <Spinner label="Loading…" />;
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <Link href="/planning" className="text-sm hover:underline">
        Planning
      </Link>
      <h1 className="page-title">Tours & trips</h1>
      <Link href="/planning/tours/new" className="text-xs underline">
        New tour
      </Link>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {(query.data?.items || []).map((item) => (
          <li key={item._id} className="px-3 py-2">
            <Link href={`/planning/tours/${item._id}`} className="hover:underline">
              {item.name} · {formatDate(item.startDate)} – {formatDate(item.endDate)} ·{" "}
              {item.durationDays} days
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
