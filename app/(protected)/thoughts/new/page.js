"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCreateThoughtMutation } from "@/hooks/use-thoughts";
import ThoughtForm from "@/components/thoughts/thought-form";
import Alert from "@/components/ui/alert";

export default function NewThoughtPage() {
  const router = useRouter();
  const pathname = usePathname();
  const createThought = useCreateThoughtMutation();
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
      <h1 className="text-lg font-semibold tracking-tight">Create thought</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <ThoughtForm
          key={`${pathname}-${formKey}`}
          submitting={createThought.isPending}
          submitLabel="Create thought"
          onSubmit={async (values) => {
            setError("");
            try {
              const thought = await createThought.mutateAsync(values);
              setFormKey((value) => value + 1);
              router.push(`/thoughts/${thought._id}`);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      </div>
    </div>
  );
}
