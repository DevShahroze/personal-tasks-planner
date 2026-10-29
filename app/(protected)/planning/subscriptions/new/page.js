"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";
import { validateSubscriptionCreate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: planningApi.subscriptions.create,
    onSuccess: (data) => router.push(`/planning/subscriptions/${data._id}`),
  });
  return (
    <div className="page-stack mx-auto max-w-xl">
      <Link href="/planning/subscriptions" className="text-sm hover:underline">
        Subscriptions
      </Link>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const fd = new FormData(e.currentTarget);
          const payload = {
            serviceName: fd.get("serviceName"),
            amount: fd.get("amount"),
            billingFrequency: fd.get("billingFrequency") || "monthly",
            startDate: fd.get("startDate"),
            prepaidPaymentsCount: fd.get("prepaidPaymentsCount") || 0,
          };
          const validated = validateSubscriptionCreate(payload);
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
        <Input name="serviceName" required placeholder="Service name" />
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="Amount"
        />
        <Input name="startDate" type="date" required />
        <PrepaidPaymentsFields periodAmountLabel="the subscription amount" />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
