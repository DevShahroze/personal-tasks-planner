"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatDate, formatDateTime } from "@/lib/format";

export default function CurrentProjectDetailView({ project }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Project details</h2>
      <dl className="grid gap-3 md:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-0.5 text-sm">{project.status || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Summary</dt>
          <dd className="mt-0.5 text-sm">{project.summary || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Started</dt>
          <dd className="mt-0.5 text-sm">{formatDate(project.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Target</dt>
          <dd className="mt-0.5 text-sm">{formatDate(project.targetDate)}</dd>
        </div>
      </dl>
      {project.notes ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Notes</p>
          <div className="mt-2">
            <RichTextContent html={project.notes} />
          </div>
        </div>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          No notes yet.
        </p>
      )}
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Updated {formatDateTime(project.updatedAt)}
      </p>
    </section>
  );
}
