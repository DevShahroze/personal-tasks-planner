"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImportantInfoForm from "@/components/important-info/important-info-form";
import { useCreateImportantInfoMutation } from "@/hooks/use-important-info";
import Alert from "@/components/ui/alert";

export default function NewImportantInfoPage() {
  const router = useRouter();
  const createRecord = useCreateImportantInfoMutation();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">
        Add important information
      </h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <ImportantInfoForm
          submitting={createRecord.isPending}
          submitLabel="Save record"
          onSubmit={async (values) => {
            try {
              const record = await createRecord.mutateAsync(values);
              router.push(`/important-info/${record._id}`);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      </div>
    </div>
  );
}
