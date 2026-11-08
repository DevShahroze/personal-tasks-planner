"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatDateTime } from "@/lib/format";

export default function ImportantInfoDetailView({ record }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Record details</h2>
      <dl className="grid gap-3 md:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Category</dt>
          <dd className="mt-0.5 text-sm">{record.category || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Person / subject</dt>
          <dd className="mt-0.5 text-sm">{record.subjectName || "—"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-xs text-muted-foreground">Value</dt>
          <dd className="mt-0.5 font-mono text-sm break-all whitespace-pre-wrap">
            {record.value || "—"}
          </dd>
        </div>
      </dl>
      {record.notes ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Notes</p>
          <div className="mt-2">
            <RichTextContent html={record.notes} />
          </div>
        </div>
      ) : null}
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Updated {formatDateTime(record.updatedAt)}
      </p>
    </section>
  );
}
