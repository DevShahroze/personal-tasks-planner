"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function NewKametiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await create.mutateAsync({
            planName: fd.get("planName"),
            totalParticipants: Number(fd.get("totalParticipants")),
            contributionAmount: Number(fd.get("contributionAmount")),
            contributionFrequency: fd.get("contributionFrequency") || "monthly",
            startDate: fd.get("startDate"),
            expectedPayoutDate: fd.get("expectedPayoutDate") || null,
          });
        }}
      >
        <Input name="planName" placeholder="Plan name" required />
        <Input name="totalParticipants" type="number" min="1" placeholder="Participants" required />
        <Input name="contributionAmount" type="number" step="0.01" min="0.01" placeholder="Contribution" required />
        <Input name="startDate" type="date" required />
        <Input name="expectedPayoutDate" type="date" />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
