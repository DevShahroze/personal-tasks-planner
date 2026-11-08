"use client";

import Link from "next/link";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_TYPE_LABEL } from "@/lib/finance/constants";
import { describeFinancialObligation } from "@/lib/finance/obligations";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import RichTextContent from "@/components/ui/rich-text/rich-text-content";

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
  const obligation = describeFinancialObligation(record);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-lg border px-4 py-3 ${
          obligation.settled
            ? "border-border bg-muted/30"
            : obligation.direction === "receive"
              ? "border-success/30 bg-success/5"
              : "border-destructive/30 bg-destructive/5"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {obligation.heading}
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{obligation.label}</p>
      </div>

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
              label: obligation.heading,
              value: obligation.shortLabel,
            },
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
            <RichTextContent html={record.description} />
          </div>
        ) : null}
        {record.notes ? (
          <div className="mt-4 space-y-0.5">
            <p className="text-xs text-muted-foreground">Notes</p>
            <RichTextContent html={record.notes} />
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
