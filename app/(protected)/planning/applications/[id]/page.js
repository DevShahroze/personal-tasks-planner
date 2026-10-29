"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["planning", "applications", id],
    queryFn: () => planningApi.applications.get(id),
  });
  if (query.isLoading) return <Spinner label="Loading…" />;
  const item = query.data;
  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Link href="/planning/applications" className="text-sm hover:underline">
        Applications
      </Link>
      <h1 className="page-title">
        {item.universityName} — {item.programName}
      </h1>
      <p className="text-sm">
        Status: {item.applicationStatus} · Fee {formatCurrency(item.applicationFee, item.feeCurrency)} (
        {item.feePaymentStatus}) · Deadline {formatDate(item.applicationDeadline)}
      </p>
      {item.notes ? <p className="whitespace-pre-wrap text-sm">{item.notes}</p> : null}
    </div>
  );
}
