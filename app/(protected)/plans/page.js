"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PLAN_STATUSES } from "@/lib/constants";
import { usePlans } from "@/hooks/use-plans";
import { useDebounce } from "@/hooks/use-debounce";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";

export default function PlansPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const filters = useMemo(
    () => ({
      page: String(page),
      limit: "20",
      search: debouncedSearch || undefined,
      status: status || undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    [page, debouncedSearch, status],
  );

  const plansQuery = usePlans(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">Future intentions and goals</p>
        </div>
        <Link href="/plans/new">
          <Button>Create plan</Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Search title or description"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {PLAN_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {plansQuery.isLoading ? <Spinner label="Loading plans…" /> : null}

      {plansQuery.data?.items?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Tasks</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {plansQuery.data.items.map((plan) => (
                <tr key={plan._id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/plans/${plan._id}`}
                      className="font-medium hover:underline"
                    >
                      {plan.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{plan.status}</td>
                  <td className="px-3 py-2">{formatDate(plan.startDate)}</td>
                  <td className="px-3 py-2">{formatDate(plan.targetDate)}</td>
                  <td className="px-3 py-2">{plan.linkedTaskCount}</td>
                  <td className="px-3 py-2">{formatDateTime(plan.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !plansQuery.isLoading && (
          <EmptyState title="No plans yet" description="Create your first plan." />
        )
      )}
    </div>
  );
}
