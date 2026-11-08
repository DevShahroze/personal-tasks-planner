"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PlanForm from "@/components/plans/plan-form";
import { useCreatePlanMutation } from "@/hooks/use-plans";
import Alert from "@/components/ui/alert";

export default function NewPlanPage() {
  const router = useRouter();
  const pathname = usePathname();
  const createPlan = useCreatePlanMutation();
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) {
        setFormKey((value) => value + 1);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Create plan</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <PlanForm
          key={`${pathname}-${formKey}`}
          submitting={createPlan.isPending}
          submitLabel="Create plan"
          onSubmit={async (values) => {
            setError("");
            try {
              const plan = await createPlan.mutateAsync(values);
              setFormKey((value) => value + 1);
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
