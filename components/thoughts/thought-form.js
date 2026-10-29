"use client";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

export default function ThoughtForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save thought",
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          title: data.get("title"),
          content: data.get("content"),
        });
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>Title *</span>
        <Input name="title" defaultValue={initialValues?.title || ""} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Content</span>
        <Textarea name="content" rows={8} defaultValue={initialValues?.content || ""} />
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
