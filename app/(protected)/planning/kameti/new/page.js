"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import KametiFormFields, {
  kametiPayloadFromFormData,
} from "@/components/planning/kameti-form-fields";
import { validateKametiCreate } from "@/lib/planning/validate";
import { toastValidationErrors } from "@/lib/planning/form-errors";

export default function NewKametiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: planningApi.kameti.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "kameti"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/kameti");
    },
  });

  return (
    <div className="page-stack mx-auto max-w-xl">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/planning/kameti" className="hover:underline">
            Kameti
          </Link>{" "}
          / New
        </p>
        <h1 className="page-title">New Kameti plan</h1>
        <p className="page-lead">
          Track a rotating savings pool: regular contributions from each member and an
          expected payout date on your calendar.
        </p>
      </div>

      <form
        className="surface-card space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const payload = kametiPayloadFromFormData(new FormData(event.currentTarget), {
            includePrepaid: true,
            includeStartPaused: true,
          });
          const validated = validateKametiCreate(payload);
          if (!validated.ok) {
            toastValidationErrors(validated.errors);
            return;
          }
          await create.mutateAsync(validated.value);
        }}
      >
        <KametiFormFields idPrefix="new-kameti" showStartPaused />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create plan"}
        </Button>
      </form>
    </div>
  );
}
