"use client";

import { IMPORTANT_INFO_CATEGORIES } from "@/lib/important-info/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import RichTextEditor from "@/components/ui/rich-text/rich-text-editor";
import Select from "@/components/ui/select";

export default function ImportantInfoForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save",
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          title: data.get("title"),
          category: data.get("category"),
          subjectName: data.get("subjectName"),
          value: data.get("value"),
          notes: data.get("notes"),
        });
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>Title *</span>
        <Input
          name="title"
          defaultValue={initialValues?.title || ""}
          placeholder="e.g. National ID, Passport, Bank account"
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Category</span>
        <Select name="category" defaultValue={initialValues?.category || "Identity"}>
          {IMPORTANT_INFO_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Person / subject</span>
        <Input
          name="subjectName"
          defaultValue={initialValues?.subjectName || ""}
          placeholder="Optional — whose record this is"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Value *</span>
        <Input
          name="value"
          defaultValue={initialValues?.value || ""}
          placeholder="ID number, account number, policy number, etc."
          required
          autoComplete="off"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Notes</span>
        <RichTextEditor
          name="notes"
          rows={4}
          resetKey={initialValues?.updatedAt || initialValues?._id || "new"}
          defaultValue={initialValues?.notes || ""}
          placeholder="Expiry, issuing authority, where the document is kept…"
        />
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
