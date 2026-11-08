"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatDateTime } from "@/lib/format";

export default function ThoughtDetailView({ thought }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Content</h2>
      {thought.content ? (
        <RichTextContent html={thought.content} />
      ) : (
        <p className="text-sm text-muted-foreground">No content yet.</p>
      )}
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Updated {formatDateTime(thought.updatedAt)}
      </p>
    </section>
  );
}
