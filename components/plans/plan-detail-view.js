"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatDate, formatDateTime } from "@/lib/format";

function DetailGrid({ rows }) {
  const visible = rows.filter((row) => row.value != null && row.value !== "");
  if (!visible.length) {
    return null;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {visible.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PlanDetailView({ plan }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Progress from linked tasks</p>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${plan.progress || 0}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {plan.progress || 0}% complete
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Plan details</h2>
        <DetailGrid
          rows={[
            { label: "Status", value: plan.status },
            {
              label: "Start date",
              value: plan.startDate ? formatDate(plan.startDate) : null,
            },
            {
              label: "Target date",
              value: plan.targetDate ? formatDate(plan.targetDate) : null,
            },
            { label: "Last updated", value: formatDateTime(plan.updatedAt) },
          ]}
        />
        {plan.description ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Description</p>
            <div className="mt-2">
              <RichTextContent html={plan.description} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
