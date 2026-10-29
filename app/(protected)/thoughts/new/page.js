"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateThoughtMutation } from "@/hooks/use-thoughts";
import ThoughtForm from "@/components/thoughts/thought-form";
import Alert from "@/components/ui/alert";

export default function NewThoughtPage() {
  const router = useRouter();
  const createThought = useCreateThoughtMutation();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Create thought</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <ThoughtForm
          submitting={createThought.isPending}
          submitLabel="Create thought"
          onSubmit={async (values) => {
            try {
              const thought = await createThought.mutateAsync(values);
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
