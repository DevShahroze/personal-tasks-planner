"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CurrentProjectForm from "@/components/current-projects/current-project-form";
import { useCreateCurrentProjectMutation } from "@/hooks/use-current-projects";
import Alert from "@/components/ui/alert";
import { toastApiError, toastSuccess } from "@/lib/toast-bus";

export default function NewCurrentProjectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const create = useCreateCurrentProjectMutation();
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
      <h1 className="text-lg font-semibold tracking-tight">Add project</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <CurrentProjectForm
          key={`${pathname}-${formKey}`}
          submitting={create.isPending}
          submitLabel="Save project"
          onSubmit={async (values) => {
            setError("");
            try {
              await create.mutateAsync(values);
              setFormKey((value) => value + 1);
              toastSuccess("Project added");
              router.push("/current-projects");
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
