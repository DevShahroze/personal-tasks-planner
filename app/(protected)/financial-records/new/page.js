"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFinancialRecordMutations } from "@/hooks/use-financial-records";
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_TYPE_LABEL,
  DEFAULT_FINANCIAL_CURRENCY,
} from "@/lib/finance/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";

export default function NewFinancialRecordPage() {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef(null);
  const { create } = useFinancialRecordMutations();
  const [error, setError] = useState("");

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) {
        formRef.current?.reset();
        setError("");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/financial-records" className="hover:underline">
            Financial
          </Link>{" "}
          / New
        </p>
        <h1 className="page-title">New financial record</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        key={pathname}
        ref={formRef}
        autoComplete="off"
        className="surface-card space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const formData = new FormData(event.currentTarget);
          try {
            await create.mutateAsync({
              type: formData.get("type"),
              partyName: formData.get("partyName"),
              description: formData.get("description"),
              originalAmount: Number(formData.get("originalAmount")),
              currency: formData.get("currency") || DEFAULT_FINANCIAL_CURRENCY,
              expectedDate: formData.get("expectedDate") || null,
              notes: formData.get("notes"),
              taskId: formData.get("taskId") || null,
            });
            event.currentTarget.reset();
            router.push("/financial-records");
          } catch (err) {
            if (Array.isArray(err.details)) {
              setError(err.details.join(", "));
            } else {
              setError(err.message || "Could not create record");
            }
          }
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>Type *</span>
          <Select name="type" required defaultValue="receivable">
            {FINANCIAL_RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FINANCIAL_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Party name *</span>
          <Input name="partyName" required autoComplete="off" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Original amount *</span>
          <Input name="originalAmount" type="number" min="0.01" step="0.01" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Currency</span>
          <Input
            name="currency"
            defaultValue={DEFAULT_FINANCIAL_CURRENCY}
            maxLength={8}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Expected date</span>
          <Input name="expectedDate" type="date" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Linked task id (optional)</span>
          <Input name="taskId" placeholder="MongoDB task id" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Description</span>
          <Textarea name="description" rows={3} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Notes</span>
          <Textarea name="notes" rows={3} />
        </label>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create record"}
        </Button>
      </form>
    </div>
  );
}
