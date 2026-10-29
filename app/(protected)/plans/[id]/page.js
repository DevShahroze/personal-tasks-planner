"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PlanForm from "@/components/plans/plan-form";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  usePlan,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} from "@/hooks/use-plans";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { formatDate, formatDateTime } from "@/lib/format";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id;
  const planQuery = usePlan(planId);
  const updatePlan = useUpdatePlanMutation();
  const deletePlan = useDeletePlanMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (planQuery.isLoading) return <Spinner label="Loading plan…" />;
  if (planQuery.isError || !planQuery.data) {
    return <Alert variant="error">Plan not found</Alert>;
  }

  const plan = planQuery.data;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/plans" className="hover:underline">
              Plans
            </Link>{" "}
            / {plan.title}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{plan.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!window.confirm("Delete this plan?")) return;
              await deletePlan.mutateAsync(planId);
              router.push("/plans");
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

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

      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <PlanForm
            initialValues={plan}
            submitting={updatePlan.isPending}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              try {
                await updatePlan.mutateAsync({ id: planId, body: values });
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <Meta label="Status" value={plan.status} />
          <Meta label="Start date" value={formatDate(plan.startDate)} />
          <Meta label="Target date" value={formatDate(plan.targetDate)} />
          <Meta label="Updated" value={formatDateTime(plan.updatedAt)} />
          <div className="md:col-span-2">
            <Meta label="Description" value={plan.description || "—"} />
          </div>
        </div>
      )}

      <EntityLinksPanel
        entityType="plan"
        entityId={planId}
        linkedTasks={plan.linkedTasks || []}
        linkedThoughts={plan.linkedThoughts || []}
      />
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
