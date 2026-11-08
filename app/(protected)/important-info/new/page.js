"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ImportantInfoForm from "@/components/important-info/important-info-form";
import { useCreateImportantInfoMutation } from "@/hooks/use-important-info";
import Alert from "@/components/ui/alert";

export default function NewImportantInfoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const createRecord = useCreateImportantInfoMutation();
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
      <h1 className="text-lg font-semibold tracking-tight">
        Add important information
      </h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="rounded-lg border border-border bg-card p-4">
        <ImportantInfoForm
          key={`${pathname}-${formKey}`}
          submitting={createRecord.isPending}
          submitLabel="Save record"
          onSubmit={async (values) => {
            setError("");
            try {
              const record = await createRecord.mutateAsync(values);
              setFormKey((value) => value + 1);
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
