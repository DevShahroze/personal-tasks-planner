"use client";

import { PLAN_STATUSES } from "@/lib/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";

export default function PlanForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save plan",
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          title: data.get("title"),
          description: data.get("description"),
          status: data.get("status"),
          startDate: data.get("startDate") || null,
          targetDate: data.get("targetDate") || null,
        });
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>Title *</span>
        <Input name="title" defaultValue={initialValues?.title || ""} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <Textarea
          name="description"
          rows={4}
          defaultValue={initialValues?.description || ""}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Status</span>
        <Select name="status" defaultValue={initialValues?.status || "Considering"}>
          {PLAN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Start date</span>
          <Input
            type="date"
            name="startDate"
            defaultValue={
              initialValues?.startDate
                ? new Date(initialValues.startDate).toISOString().slice(0, 10)
                : ""
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Target date</span>
          <Input
            type="date"
            name="targetDate"
            defaultValue={
              initialValues?.targetDate
                ? new Date(initialValues.targetDate).toISOString().slice(0, 10)
                : ""
            }
          />
        </label>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
