"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useFinancialRecords } from "@/hooks/use-financial-records";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_TYPE_LABEL } from "@/lib/finance/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import Button from "@/components/ui/button";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";

export default function FinancialRecordsPage() {
  const clientToday = useClientTodayYmd();
  const todayYmd = clientToday?.ymd || "";
  const [typeFilter, setTypeFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filters = useMemo(
    () => ({
      type: typeFilter || undefined,
      overdue: overdueOnly ? "1" : undefined,
      todayYmd: todayYmd || undefined,
      limit: 50,
    }),
    [typeFilter, overdueOnly, todayYmd],
  );

  const recordsQuery = useFinancialRecords(filters, Boolean(todayYmd));
  const items = recordsQuery.data?.items || [];
  const outstandingTotals = recordsQuery.data?.summary?.outstandingByCurrency || [];

  return (
    <div className="page-stack mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Financial records</h1>
          <p className="page-lead">
            Track money lent, borrowed, payable, and receivable.
          </p>
        </div>
        <Link
          href="/financial-records/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
        >
          New record
        </Link>
      </div>

      <div className="surface-card flex flex-wrap gap-2">
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="w-auto min-w-[10rem]"
        >
          <option value="">All types</option>
          {Object.entries(FINANCIAL_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant={overdueOnly ? "primary" : "secondary"}
          onClick={() => setOverdueOnly((value) => !value)}
        >
          Overdue only
        </Button>
      </div>

      {!todayYmd || recordsQuery.isLoading ? (
        <Spinner label="Loading records…" />
      ) : !items.length ? (
        <EmptyState
          title="No records"
          description="Create a financial record to get started."
        />
      ) : (
        <>
          {outstandingTotals.length ? (
            <section className="dashboard-panel">
              <div className="dashboard-panel-header">Total outstanding</div>
              <div className="dashboard-panel-body space-y-2">
                {outstandingTotals.map((row) => (
                  <div
                    key={row.currency}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {outstandingTotals.length > 1 ? row.currency : "All records"}
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatCurrency(row.outstanding, row.currency)}
                    </span>
                  </div>
                ))}
                {recordsQuery.data?.total != null &&
                recordsQuery.data.total > items.length ? (
                  <p className="text-xs text-muted-foreground">
                    Totals include all {recordsQuery.data.total} matching records.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {items.map((record) => (
              <li key={record._id} className="px-3 py-2">
                <Link
                  href={`/financial-records/${record._id}`}
                  className="block hover:underline"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {record.partyName} · {FINANCIAL_TYPE_LABEL[record.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {FINANCIAL_STATUS_LABEL[record.status]}
                      {record.overdue ? " · Overdue" : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Outstanding{" "}
                    {formatCurrency(record.outstandingBalance, record.currency)} of{" "}
                    {formatCurrency(record.originalAmount, record.currency)}
                    {record.expectedDate
                      ? ` · Expected ${formatDate(record.expectedDate)}`
                      : ""}
                    {record.taskId?.title ? ` · Task: ${record.taskId.title}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
