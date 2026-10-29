"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import InstallmentFormFields, {
  installmentPayloadFromFormData,
} from "@/components/planning/installment-form-fields";
import { validateInstallmentCreate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";

export default function NewInstallmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: planningApi.installments.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["planning", "installments"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push(`/planning/installments/${data._id}`);
    },
  });

  return (
    <div className="page-stack mx-auto max-w-xl">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/planning/installments" className="hover:underline">
            Installments
          </Link>{" "}
          / New
        </p>
        <h1 className="page-title">New installment commitment</h1>
        <p className="page-lead">
          Track a purchase or loan paid in recurring installments (EMI, hire purchase,
          etc.).
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        className="surface-card space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const payload = installmentPayloadFromFormData(
            new FormData(event.currentTarget),
            {
              includePrepaid: true,
              includeDownPayment: true,
            },
          );
          const validated = validateInstallmentCreate(payload);
          if (!validated.ok) {
            setError(formatValidationErrors(validated.errors));
            return;
          }
          try {
            await create.mutateAsync(payload);
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        }}
      >
        <InstallmentFormFields idPrefix="new-installment" showPrepaid showDownPayment />

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create commitment"}
        </Button>
      </form>
    </div>
  );
}
