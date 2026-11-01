"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFinancialRecordMutations } from "@/hooks/use-financial-records";
import Alert from "@/components/ui/alert";
import FinancialRecordForm from "@/components/finance/financial-record-form";

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
    <div className="page-stack w-full max-w-4xl pb-24">
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

      <FinancialRecordForm
        key={`${pathname}-${formKey}`}
        idPrefix="new-financial"
        forCreate
        submitting={create.isPending}
        submitLabel="Create record"
        onSubmit={async (payload) => {
          setError("");
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
      />
    </div>
  );
}
