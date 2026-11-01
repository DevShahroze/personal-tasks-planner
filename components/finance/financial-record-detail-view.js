"use client";

import Link from "next/link";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_TYPE_LABEL } from "@/lib/finance/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

function ViewSection({ title, children }) {
  if (!children) {
    return null;
  }
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailGrid({ rows }) {
  const visible = rows.filter((row) => row.value != null && row.value !== "");
  if (!visible.length) {
    return null;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((row) => (
        <div key={row.label} className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-sm whitespace-pre-wrap">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function FinancialRecordDetailView({ record }) {
  const taskId = record.taskId?._id || record.taskId;
  const taskTitle = record.taskId?.title;

  return (
    <div className="flex flex-col gap-4">
      <ViewSection title="Record details">
        <DetailGrid
          rows={[
            { label: "Type", value: FINANCIAL_TYPE_LABEL[record.type] || record.type },
            { label: "Party", value: record.partyName },
            {
              label: "Status",
              value: FINANCIAL_STATUS_LABEL[record.status] || record.status,
            },
            {
              label: "Expected date",
              value: record.expectedDate ? formatDate(record.expectedDate) : null,
            },
            { label: "Currency", value: record.currency },
            {
              label: "Outstanding",
              value: formatCurrency(record.outstandingBalance, record.currency),
            },
            {
              label: "Original amount",
              value: formatCurrency(record.originalAmount, record.currency),
            },
            { label: "Updated", value: formatDateTime(record.updatedAt) },
            record.overdue ? { label: "Reminder", value: "Overdue" } : null,
          ].filter(Boolean)}
        />
        {record.description ? (
          <div className="mt-4 space-y-0.5">
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap text-sm">{record.description}</p>
          </div>
        ) : null}
        {record.notes ? (
          <div className="mt-4 space-y-0.5">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap text-sm">{record.notes}</p>
          </div>
        ) : null}
        {taskId ? (
          <div className="mt-4 space-y-0.5">
            <p className="text-xs text-muted-foreground">Linked task</p>
            <Link
              href={`/tasks/${taskId}`}
              className="text-sm font-medium hover:underline"
            >
              {taskTitle || "View task"}
            </Link>
          </div>
        ) : null}
      </ViewSection>
    </div>
  );
}
