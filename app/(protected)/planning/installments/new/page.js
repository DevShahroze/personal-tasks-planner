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
import FieldLabel from "@/components/ui/field-label";
import { PAYMENT_FREQUENCIES } from "@/lib/schedules/frequency";
import PrepaidPaymentsFields from "@/components/planning/prepaid-payments-fields";
import { validateInstallmentCreate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";

function frequencyLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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
        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-name"
            label="Commitment name"
            required
            info="A short label you will recognize later, e.g. “Phone EMI” or “Car loan”."
          />
          <Input id="installment-name" name="name" required />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-description"
            label="Description"
            info="Optional context: seller, account number, or what the installments are for."
          />
          <Textarea id="installment-description" name="description" rows={2} />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-total"
            label="Total amount"
            required
            info="Full commitment amount (principal or total price). Outstanding balance is reduced as you log payments."
          />
          <Input
            id="installment-total"
            name="totalAmount"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-amount"
            label="Typical installment amount"
            info="Default amount for each billing period when every installment is the same. Leave empty if amounts vary and you will use variable prepaid lines or enter payments manually later."
          />
          <Input
            id="installment-amount"
            name="installmentAmount"
            type="number"
            step="0.01"
            min="0.01"
          />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-frequency"
            label="Payment frequency"
            required
            info="How often an installment is due. Due dates on the calendar are calculated from the start date using this schedule."
          />
          <Select id="installment-frequency" name="frequency" defaultValue="monthly">
            {PAYMENT_FREQUENCIES.map((value) => (
              <option key={value} value={value}>
                {frequencyLabel(value)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-start"
            label="Start date"
            required
            info="Date of the first installment (or the first period you are tracking). Used for the payment schedule and for prepaid catch-up."
          />
          <Input id="installment-start" name="startDate" type="date" required />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-end"
            label="End date"
            info="Optional last due date. You can leave this empty if you prefer to set a total number of installments instead."
          />
          <Input id="installment-end" name="endDate" type="date" />
        </div>

        <div className="space-y-1">
          <FieldLabel
            htmlFor="installment-count"
            label="Total installments"
            info="Optional cap on how many payments complete the commitment. Helpful when you know the exact count (e.g. 12 monthly payments)."
          />
          <Input
            id="installment-count"
            name="totalInstallments"
            type="number"
            min="1"
            step="1"
          />
        </div>

        <PrepaidPaymentsFields
          periodAmountLabel="each installment amount when using the count field"
          variableAmounts
        />

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create commitment"}
        </Button>
      </form>
    </div>
  );
}
