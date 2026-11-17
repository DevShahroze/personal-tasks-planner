"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CurrentProjectForm from "@/components/current-projects/current-project-form";
import { useCreateCurrentProjectMutation } from "@/hooks/use-current-projects";
import Alert from "@/components/ui/alert";
import { toastApiError } from "@/lib/toast-bus";

export default function NewCurrentProjectPage() {
  const router = useRouter();
  const create = useCreateCurrentProjectMutation();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/current-projects" className="hover:underline">
          Current projects
        </Link>{" "}
        / New
      </p>
      <h1 className="text-lg font-semibold tracking-tight">New project</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <CurrentProjectForm
          submitting={create.isPending}
          submitLabel="Create project"
          onSubmit={async (values) => {
            setError("");
            try {
              const record = await create.mutateAsync(values);
              router.push(`/current-projects/${record._id}`);
            } catch (err) {
              toastApiError(err, "Create project");
              setError(err.message || "Could not create project");
            }
          }}
        />
      </div>
    </div>
  );
}
