"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/use-planning";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SubscriptionFormFields, {
  subscriptionPayloadFromFormData,
} from "@/components/planning/subscription-form-fields";
import { validateSubscriptionUpdate } from "@/lib/planning/validate";
import { formatValidationErrors } from "@/lib/planning/money-fields";
import { apiErrorMessage } from "@/lib/planning/form-errors";

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [editKey, setEditKey] = useState(0);
  const query = useSubscription(id);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.planning.subscriptions.detail(id),
    });
    queryClient.invalidateQueries({ queryKey: ["planning", "subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
  };

  const addPayment = useMutation({
    mutationFn: (body) => planningApi.subscriptions.addPayment(id, body),
    onSuccess: invalidate,
  });

  const removePayment = useMutation({
    mutationFn: (paymentId) => planningApi.subscriptions.removePayment(id, paymentId),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (body) => planningApi.subscriptions.update(id, body),
    onSuccess: () => {
      invalidate();
      setEditKey((value) => value + 1);
    },
  });

  const remove = useMutation({
    mutationFn: () => planningApi.subscriptions.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/subscriptions");
    },
  });

  if (query.isLoading) {
    return <Spinner label="Loading…" />;
  }

  const item = query.data;
  if (!item) {
    return <Alert variant="error">Subscription not found</Alert>;
  }

  const onDelete = async () => {
    if (!window.confirm("Delete this subscription and its payment history?")) {
      return;
    }
    setError("");
    try {
      await remove.mutateAsync();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="page-stack mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/planning/subscriptions" className="hover:underline">
              Subscriptions
            </Link>{" "}
            / {item.serviceName}
          </p>
          <h1 className="page-title">{item.serviceName}</h1>
          <p className="page-lead">
            {item.manualBilling ? "Manual billing · " : ""}
            {formatCurrency(item.amount, item.currency)}
            {!item.manualBilling ? (
              <>
                {" "}
                billed {item.billingFrequency}
                {item.billingFrequency === "custom" && item.customIntervalDays
                  ? ` (every ${item.customIntervalDays} days)`
                  : ""}
              </>
            ) : null}{" "}
            · Next billing {formatDate(item.nextBillingDate)} · {item.status}
          </p>
        </div>
        <Button
          variant="danger"
          type="button"
          onClick={onDelete}
          disabled={remove.isPending}
        >
          Delete
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        key={editKey}
        className="surface-card space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const payload = subscriptionPayloadFromFormData(
            new FormData(e.currentTarget),
            {
              includeStatus: true,
            },
          );
          const validated = validateSubscriptionUpdate(payload);
          if (!validated.ok) {
            setError(formatValidationErrors(validated.errors));
            return;
          }
          try {
            await update.mutateAsync(validated.patch);
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        }}
      >
        <h2 className="text-sm font-semibold">Subscription details</h2>
        <SubscriptionFormFields
          idPrefix="edit-subscription"
          defaults={item}
          showStatus
          currency={item.currency}
        />
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="surface-card space-y-3">
        <h2 className="text-sm font-semibold">Payment history</h2>
        {!item.paymentHistory?.length ? (
          <p className="text-xs text-muted-foreground">No payments logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {item.paymentHistory.map((payment, index) => (
              <li
                key={payment._id || index}
                className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm"
              >
                <div>
                  {formatCurrency(payment.amount, item.currency)} on{" "}
                  {formatDate(payment.paidAt)}
                  {payment.note ? ` · ${payment.note}` : ""}
                  <span className="block text-xs text-muted-foreground">
                    Logged {formatDateTime(payment.createdAt)}
                  </span>
                </div>
                {payment._id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 text-xs"
                    disabled={removePayment.isPending}
                    onClick={async () => {
                      if (!window.confirm("Remove this payment from history?")) {
                        return;
                      }
                      setError("");
                      try {
                        await removePayment.mutateAsync(payment._id);
                      } catch (err) {
                        setError(apiErrorMessage(err));
                      }
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const form = e.currentTarget;
            const fd = new FormData(form);
            try {
              const paidAt = fd.get("paidAt");
              await addPayment.mutateAsync({
                amount: Number(fd.get("amount")),
                ...(paidAt ? { paidAt: String(paidAt) } : {}),
              });
              form.reset();
            } catch (err) {
              setError(apiErrorMessage(err));
            }
          }}
        >
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Amount"
            className="max-w-[10rem]"
          />
          <Input
            name="paidAt"
            type="date"
            title="Payment date"
            className="max-w-[10rem]"
          />
          <Button type="submit" disabled={addPayment.isPending}>
            Log payment
          </Button>
        </form>
      </div>
    </div>
  );
}
