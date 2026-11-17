"use client";

import Link from "next/link";
import { useState } from "react";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { usePlanningHubLists } from "@/hooks/use-planning-hub-lists";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import {
  PLANNING_HUB_SECTIONS,
  mergedHubRows,
  monthlyPaidLabelForSection,
  rowsForSection,
} from "@/lib/planning/hub-list";

function HubItemRow({ row }) {
  return (
    <Link href={row.href} className="block px-3 py-2 text-sm hover:bg-muted">
      <span className="font-medium">{row.title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{row.summary}</span>
    </Link>
  );
}

export default function PlanningHubClient() {
  const [viewMode, setViewMode] = useState("categorized");
  const clientToday = useClientTodayYmd();
  const { itemsByKey, isLoading, isError } = usePlanningHubLists(viewMode);
  const mergedRows = mergedHubRows(itemsByKey);
  const paidYear = clientToday?.year;
  const paidMonth = clientToday?.month;

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <div>
        <h1 className="page-title">Planning</h1>
        <p className="page-lead">
          Installments, Kameti, subscriptions, applications, and trips — integrated with
          your calendar.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">List format</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="planning-list-format"
              value="categorized"
              checked={viewMode === "categorized"}
              onChange={() => setViewMode("categorized")}
            />
            By category
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="planning-list-format"
              value="merged"
              checked={viewMode === "merged"}
              onChange={() => setViewMode("merged")}
            />
            Merged (all items)
          </label>
        </div>
      </fieldset>

      {isLoading ? <Spinner label="Loading planning items…" /> : null}
      {isError ? (
        <Alert variant="error">Could not load one or more planning lists.</Alert>
      ) : null}

      {!isLoading && !isError && viewMode === "categorized" ? (
        <div className="space-y-6">
          {PLANNING_HUB_SECTIONS.map((section) => {
            const rows = rowsForSection(section.key, itemsByKey[section.key]);
            const paidThisMonth = monthlyPaidLabelForSection(
              section.key,
              itemsByKey[section.key],
              paidYear,
              paidMonth,
            );
            return (
              <section key={section.key} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                    <Link
                      href={section.href}
                      className="text-base font-semibold hover:underline"
                    >
                      {section.title}
                    </Link>
                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Paid this month {paidThisMonth ?? "—"}
                    </span>
                  </div>
                  <Link
                    href={section.newHref}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {section.newLabel}
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
                {rows.length ? (
                  <ul className="divide-y divide-border rounded-md border border-border bg-card">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <HubItemRow row={row} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No items yet.</p>
                )}
              </section>
            );
          })}
        </div>
      ) : null}

      {!isLoading && !isError && viewMode === "merged" ? (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mergedRows.length ? (
                mergedRows.map((row) => (
                  <tr key={`${row.category}-${row.id}`} className="hover:bg-muted/50">
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {row.category}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link href={row.href} className="font-medium hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {row.summary}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    No planning items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Simple money lent/borrowed records remain under{" "}
        <Link href="/financial-records" className="underline">
          Financial
        </Link>
        .
      </p>
    </div>
  );
}
