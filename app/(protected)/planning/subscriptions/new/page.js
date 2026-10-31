"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import SubscriptionFormFields, {
  subscriptionPayloadFromFormData,
} from "@/components/planning/subscription-form-fields";
import { validateSubscriptionCreate } from "@/lib/planning/validate";
import { toastValidationErrors } from "@/lib/planning/form-errors";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const create = useMutation({
    mutationFn: planningApi.subscriptions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "subscriptions"] });
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
    <div className="page-stack mx-auto max-w-xl">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/planning/subscriptions" className="hover:underline">
            Subscriptions
          </Link>{" "}
          / New
        </p>
        <h1 className="page-title">New subscription</h1>
        <p className="page-lead">
          Track a recurring charge (streaming, utilities, memberships). You pay the same
          billing amount on a fixed schedule; due dates show on your calendar.
        </p>
      </div>
      <form
        key={`${pathname}-${formKey}`}
        autoComplete="off"
        className="surface-card space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const payload = subscriptionPayloadFromFormData(
            new FormData(e.currentTarget),
            {
              includePrepaid: true,
              includeStartPaused: true,
            },
          );
          const validated = validateSubscriptionCreate(payload);
          if (!validated.ok) {
            toastValidationErrors(validated.errors);
            return;
          }
          await create.mutateAsync(validated.value);
          setFormKey((value) => value + 1);
          router.push("/planning/subscriptions");
        }}
      >
        <SubscriptionFormFields
          idPrefix="new-subscription"
          showPrepaid
          showStartPaused
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create subscription"}
        </Button>
      </form>
    </div>
  );
}
