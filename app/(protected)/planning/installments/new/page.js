"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";
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
      <p className="text-sm text-muted-foreground">
        <Link href="/planning/installments" className="hover:underline">
          Installments
        </Link>{" "}
        / New
      </p>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const formData = new FormData(event.currentTarget);
          const payload = {
            name: formData.get("name"),
            description: formData.get("description"),
            totalAmount: formData.get("totalAmount"),
            installmentAmount: formData.get("installmentAmount") || null,
            frequency: formData.get("frequency"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate") || null,
            totalInstallments: formData.get("totalInstallments") || null,
            prepaidPaymentsCount: formData.get("prepaidPaymentsCount") || 0,
            prepaidPaymentAmounts: formData.get("prepaidPaymentAmounts") || "",
          };
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
        <Input name="name" placeholder="Name" required />
        <Textarea name="description" rows={2} placeholder="Description" />
        <Input
          name="totalAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Total amount"
          required
        />
        <Input
          name="installmentAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Typical installment (optional if amounts vary)"
        />
        <Select name="frequency" defaultValue="monthly">
          {PAYMENT_FREQUENCIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Input name="startDate" type="date" required />
        <Input name="endDate" type="date" />
        <Input
          name="totalInstallments"
          type="number"
          min="1"
          placeholder="Total installments (optional)"
        />
        <PrepaidPaymentsFields
          periodAmountLabel="each installment amount when using the count field"
          variableAmounts
        />
        <Button type="submit" disabled={create.isPending}>
          Create
        </Button>
      </form>
    </div>
  );
}
