"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import InsurancePolicyForm from "@/components/planning/insurance-policy-form";
import { validateInsuranceCreate } from "@/lib/planning/validate";
import { toastValidationErrors } from "@/lib/planning/form-errors";

export default function NewInsurancePolicyClient() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const create = useMutation({
    mutationFn: planningApi.insurance.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "insurance"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
    },
  });

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
    <div className="page-stack mx-auto max-w-4xl">
      <p className="text-sm text-muted-foreground">
        <Link href="/planning/insurance" className="hover:underline">
          Insurance
        </Link>{" "}
        / New
      </p>
      <h1 className="page-title">New insurance policy</h1>
      <div className="surface-card">
        <InsurancePolicyForm
          key={`${pathname}-${formKey}`}
          idPrefix="new-insurance"
          formId="new-insurance-form"
          showPrepaid
          submitting={create.isPending}
          submitLabel="Create policy"
          onSubmit={async (payload) => {
            const validated = validateInsuranceCreate(payload);
            if (!validated.ok) {
              toastValidationErrors(validated.errors);
              return;
            }
            await create.mutateAsync(validated.value);
            setFormKey((value) => value + 1);
            router.push("/planning/insurance");
          }}
        />
      </div>
    </div>
  );
}
