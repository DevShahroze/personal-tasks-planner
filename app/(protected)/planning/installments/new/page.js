"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import InstallmentFormFields, {
  installmentPayloadFromFormData,
} from "@/components/planning/installment-form-fields";
import { validateInstallmentCreate } from "@/lib/planning/validate";
import { toastValidationErrors } from "@/lib/planning/form-errors";

export default function NewInstallmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: planningApi.installments.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "installments"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/installments");
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

      <form
        className="surface-card space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const payload = installmentPayloadFromFormData(
            new FormData(event.currentTarget),
            {
              includePrepaid: true,
              includeDownPayment: true,
              includeStartPaused: true,
            },
          );
          const validated = validateInstallmentCreate(payload);
          if (!validated.ok) {
            toastValidationErrors(validated.errors);
            return;
          }
          await create.mutateAsync(validated.value);
        }}
      >
        <InstallmentFormFields
          idPrefix="new-installment"
          showPrepaid
          showDownPayment
          showStartPaused
        />

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create commitment"}
        </Button>
      </form>
    </div>
  );
}
