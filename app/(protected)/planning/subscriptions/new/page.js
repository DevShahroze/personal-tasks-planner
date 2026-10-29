"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const create = useMutation({
    mutationFn: planningApi.subscriptions.create,
    onSuccess: (data) => router.push(`/planning/subscriptions/${data._id}`),
  });
  return (
    <div className="page-stack mx-auto max-w-xl">
      <Link href="/planning/subscriptions" className="text-sm hover:underline">
        Subscriptions
      </Link>
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await create.mutateAsync({
            serviceName: fd.get("serviceName"),
            amount: Number(fd.get("amount")),
            billingFrequency: fd.get("billingFrequency") || "monthly",
            startDate: fd.get("startDate"),
          });
        }}
      >
        <Input name="serviceName" required placeholder="Service name" />
        <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount" />
        <Input name="startDate" type="date" required />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
