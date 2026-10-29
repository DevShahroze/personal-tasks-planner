"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlanForm from "@/components/plans/plan-form";
import { useCreatePlanMutation } from "@/hooks/use-plans";
import Alert from "@/components/ui/alert";

export default function NewPlanPage() {
  const router = useRouter();
  const createPlan = useCreatePlanMutation();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Create plan</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <PlanForm
          submitting={createPlan.isPending}
          submitLabel="Create plan"
          onSubmit={async (values) => {
            try {
              const plan = await createPlan.mutateAsync(values);
              router.push(`/plans/${plan._id}`);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      </div>
    </div>
  );
}
