"use client";

import Link from "next/link";
import { useInsurancePolicies } from "@/hooks/use-planning";
import { formatCurrency, formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";

export default function InsurancePoliciesClient() {
  const query = useInsurancePolicies();
  if (query.isLoading) {
    return <Spinner label="Loading insurance…" />;
  }
  if (query.isError) {
    return <Alert variant="error">Could not load insurance policies.</Alert>;
  }
  const items = query.data?.items || [];
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <p className="text-sm text-muted-foreground">
        <Link href="/planning" className="hover:underline">
          Planning
        </Link>{" "}
        / Insurance
      </p>
      <h1 className="page-title">Insurance</h1>
      <Link
        href="/planning/insurance/new"
        className="inline-flex rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
      >
        New policy
      </Link>
      {!items.length ? (
        <EmptyState
          title="No policies"
          description="Add an insurance policy to track premiums."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {items.map((item) => (
            <li key={item._id} className="px-3 py-2">
              <Link
                href={`/planning/insurance/${item._id}`}
                className="block hover:underline"
              >
                <span className="font-medium">{item.insurerName}</span>
                <span className="text-muted-foreground"> · {item.policyNumber}</span>
                <p className="text-xs text-muted-foreground">
                  {item.status} · Premium{" "}
                  {formatCurrency(item.premiumAmount, item.currency)}
                  {item.nextDueDate
                    ? ` · Next due ${formatDate(item.nextDueDate)}`
                    : ""}
                  {item.termYears ? ` · ${item.termYears} yr term` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
