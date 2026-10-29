"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFinancialRecordMutations } from "@/hooks/use-financial-records";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import FinancialRecordFormFields, {
  financialRecordPayloadFromFormData,
} from "@/components/finance/financial-record-form-fields";

export default function NewFinancialRecordPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { create } = useFinancialRecordMutations();
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) {
        setFormKey((value) => value + 1);
        setError("");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/financial-records" className="hover:underline">
            Financial
          </Link>{" "}
          / New
        </p>
        <h1 className="page-title">New financial record</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        key={`${pathname}-${formKey}`}
        autoComplete="off"
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const form = event.currentTarget;
          const payload = financialRecordPayloadFromFormData(new FormData(form), {
            forCreate: true,
          });
          try {
            await create.mutateAsync(payload);
            setFormKey((value) => value + 1);
            router.push("/financial-records");
          } catch (err) {
            if (Array.isArray(err.details)) {
              setError(err.details.join(", "));
            } else {
              setError(err.message || "Could not create record");
            }
          }
        }}
      >
        <FinancialRecordFormFields idPrefix="new-financial" />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create record"}
        </Button>
      </form>
    </div>
  );
}
