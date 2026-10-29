"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useThoughts } from "@/hooks/use-thoughts";
import { useDebounce } from "@/hooks/use-debounce";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDateTime, previewText } from "@/lib/format";

export default function ThoughtsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const filters = useMemo(
    () => ({
      page: String(page),
      limit: "20",
      search: debouncedSearch || undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    [page, debouncedSearch],
  );
  const thoughtsQuery = useThoughts(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Thoughts</h1>
          <p className="text-sm text-muted-foreground">
            Capture ideas and observations
          </p>
        </div>
        <Link href="/thoughts/new">
          <Button>Create thought</Button>
        </Link>
      </div>

      <Input
        placeholder="Search title or content"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
      />

      {thoughtsQuery.isLoading ? <Spinner label="Loading thoughts…" /> : null}

      {thoughtsQuery.data?.items?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Tasks</th>
                <th className="px-3 py-2">Plans</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {thoughtsQuery.data.items.map((thought) => (
                <tr key={thought._id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/thoughts/${thought._id}`}
                      className="font-medium hover:underline"
                    >
                      {thought.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{previewText(thought.content)}</td>
                  <td className="px-3 py-2">{thought.linkedTaskCount}</td>
                  <td className="px-3 py-2">{thought.linkedPlanCount}</td>
                  <td className="px-3 py-2">{formatDateTime(thought.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !thoughtsQuery.isLoading && (
          <EmptyState
            title="No thoughts yet"
            description="Create your first thought."
          />
        )
      )}
    </div>
  );
}
