"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import InsuranceFormFields, {
  insurancePayloadFromFormData,
} from "@/components/planning/insurance-form-fields";
import { validateInsuranceCreate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";

export default function NewInsurancePolicyClient() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
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
        setError("");
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
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form
        key={`${pathname}-${formKey}`}
        autoComplete="off"
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const payload = insurancePayloadFromFormData(
            new FormData(event.currentTarget),
            {
              includePrepaid: true,
            },
          );
          const validated = validateInsuranceCreate(payload);
          if (!validated.ok) {
            setError(formatValidationErrors(validated.errors));
            return;
          }
          try {
            await create.mutateAsync(validated.value);
            setFormKey((value) => value + 1);
            setError("");
            router.push("/planning/insurance");
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        }}
      >
        <InsuranceFormFields idPrefix="new-insurance" showPrepaid />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create policy"}
        </Button>
      </form>
    </div>
  );
}
