"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PlanForm from "@/components/plans/plan-form";
import PlanDetailView from "@/components/plans/plan-detail-view";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  usePlan,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} from "@/hooks/use-plans";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { useConfirm } from "@/contexts/confirm-context";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastSuccess } from "@/lib/toast-bus";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
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
  const showReadOnlyFooter = !editing;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete plan?",
      description: "Delete this plan? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await deletePlan.mutateAsync(planId);
    router.push("/plans");
  };

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/plans" className="hover:underline">
            Plans
          </Link>{" "}
          / {plan.title}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{plan.title}</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4">
        {editing ? (
          <PlanForm
            key={`${planId}-${plan.updatedAt}`}
            isEditForm
            initialValues={plan}
            submitting={updatePlan.isPending}
            deleting={deletePlan.isPending}
            submitLabel="Save changes"
            onCancelEdit={() => {
              setEditing(false);
              setError("");
            }}
            onDelete={onDelete}
            onSubmit={async (values) => {
              setError("");
              try {
                await updatePlan.mutateAsync({ id: planId, body: values });
                toastSuccess("Plan updated");
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        ) : (
          <PlanDetailView plan={plan} />
        )}
      </div>

      <EntityLinksPanel
        entityType="plan"
        entityId={planId}
        linkedTasks={plan.linkedTasks || []}
        linkedThoughts={plan.linkedThoughts || []}
      />

      {showReadOnlyFooter ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={deletePlan.isPending}
            >
              {deletePlan.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
