"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { planningApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function NewApplicationPage() {
  const router = useRouter();
  const create = useMutation({
    mutationFn: planningApi.applications.create,
    onSuccess: (data) => router.push(`/planning/applications/${data._id}`),
  });
  return (
    <div className="page-stack mx-auto max-w-xl">
      <form
        className="surface-card space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await create.mutateAsync({
            universityName: fd.get("universityName"),
            programName: fd.get("programName"),
            applicationDeadline: fd.get("applicationDeadline") || null,
            applicationFee: fd.get("applicationFee") ? Number(fd.get("applicationFee")) : null,
          });
        }}
      >
        <Input name="universityName" required placeholder="University" />
        <Input name="programName" required placeholder="Program" />
        <Input name="applicationDeadline" type="date" />
        <Input name="applicationFee" type="number" step="0.01" placeholder="Application fee" />
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
