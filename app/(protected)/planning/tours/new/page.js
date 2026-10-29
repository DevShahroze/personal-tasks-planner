"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function NewTourPage() {
  const router = useRouter();
  const create = useMutation({
    mutationFn: planningApi.tours.create,
    onSuccess: (data) => router.push(`/planning/tours/${data._id}`),
  });
  return (
    <div className="page-stack mx-auto max-w-xl">
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await create.mutateAsync({
            name: fd.get("name"),
            destination: fd.get("destination"),
            startDate: fd.get("startDate"),
            endDate: fd.get("endDate"),
            estimatedBudget: fd.get("estimatedBudget") ? Number(fd.get("estimatedBudget")) : null,
          });
        }}
      >
        <Input name="name" required placeholder="Tour name" />
        <Input name="destination" placeholder="Destination" />
        <Input name="startDate" type="date" required />
        <Input name="endDate" type="date" required />
        <Input name="estimatedBudget" type="number" step="0.01" placeholder="Estimated budget" />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
