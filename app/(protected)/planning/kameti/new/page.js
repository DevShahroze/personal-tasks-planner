"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import { validateKametiCreate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";

export default function NewKametiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: planningApi.kameti.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["planning", "kameti"] });
      router.push(`/planning/kameti/${data._id}`);
    },
  });

  return (
    <div className="page-stack mx-auto max-w-xl">
      <Link href="/planning/kameti" className="text-sm hover:underline">
        ← Kameti
      </Link>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const fd = new FormData(e.currentTarget);
          const payload = {
            planName: fd.get("planName"),
            totalParticipants: fd.get("totalParticipants"),
            contributionAmount: fd.get("contributionAmount"),
            contributionFrequency: fd.get("contributionFrequency") || "monthly",
            startDate: fd.get("startDate"),
            expectedPayoutDate: fd.get("expectedPayoutDate") || null,
            prepaidPaymentsCount: fd.get("prepaidPaymentsCount") || 0,
          };
          const validated = validateKametiCreate(payload);
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
        <Input name="planName" placeholder="Plan name" required />
        <Input
          name="totalParticipants"
          type="number"
          min="1"
          placeholder="Participants"
          required
        />
        <Input
          name="contributionAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Contribution"
          required
        />
        <Input name="startDate" type="date" required />
        <Input name="expectedPayoutDate" type="date" />
        <PrepaidPaymentsFields periodAmountLabel="the contribution amount" />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
