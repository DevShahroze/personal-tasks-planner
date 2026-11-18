"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CURRENT_PROJECT_STATUSES } from "@/lib/current-projects/constants";
import { useCurrentProjects } from "@/hooks/use-current-projects";
import { useDebounce } from "@/hooks/use-debounce";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";

export default function CurrentProjectsPage() {
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
      sortBy: "title",
      sortOrder: "asc",
    }),
    [page, debouncedSearch, status],
  );

  const listQuery = useCurrentProjects(filters);
  const pagination = listQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Current projects</h1>
          <p className="text-sm text-muted-foreground">
            Work you are actively running — separate from long-term plans
          </p>
        </div>
        <Link href="/current-projects/new">
          <Button>Add project</Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Search title or summary"
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
          {CURRENT_PROJECT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {listQuery.isLoading ? <Spinner label="Loading projects…" /> : null}

      {listQuery.data?.items?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((item) => (
                <tr key={item._id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/current-projects/${item._id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.summary ? (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {item.summary}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{formatDate(item.targetDate)}</td>
                  <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.data?.items?.length ? (
        <EmptyState
          title="No projects yet"
          description="Add a current project to track active work."
          action={
            <Link href="/current-projects/new">
              <Button>Add project</Button>
            </Link>
          }
        />
      ) : null}

      {pagination ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
