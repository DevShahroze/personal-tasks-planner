"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IMPORTANT_INFO_CATEGORIES } from "@/lib/important-info/constants";
import { useImportantInfoList } from "@/hooks/use-important-info";
import { useDebounce } from "@/hooks/use-debounce";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";

export default function ImportantInfoPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const filters = useMemo(
    () => ({
      page: String(page),
      limit: "20",
      search: debouncedSearch || undefined,
      category: category || undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    [page, debouncedSearch, category],
  );

  const listQuery = useImportantInfoList(filters);
  const pagination = listQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Important information
          </h1>
          <p className="text-sm text-muted-foreground">
            ID numbers, account details, and other records to keep handy
          </p>
        </div>
        <Link href="/important-info/new">
          <Button>Add record</Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Search title, person, or notes"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {IMPORTANT_INFO_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {listQuery.isLoading ? <Spinner label="Loading records…" /> : null}

      {listQuery.data?.items?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((item) => (
                <tr key={item._id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/important-info/${item._id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.category}</td>
                  <td className="px-3 py-2">{item.subjectName || "—"}</td>
                  <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !listQuery.isLoading && (
          <EmptyState
            title="No records yet"
            description="Add ID numbers, accounts, or anything you want saved for later."
          />
        )
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
