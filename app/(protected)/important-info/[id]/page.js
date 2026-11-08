"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ImportantInfoForm from "@/components/important-info/important-info-form";
import {
  useImportantInfoRecord,
  useUpdateImportantInfoMutation,
  useDeleteImportantInfoMutation,
} from "@/hooks/use-important-info";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { useConfirm } from "@/contexts/confirm-context";

export default function ImportantInfoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const recordId = params.id;
  const recordQuery = useImportantInfoRecord(recordId);
  const updateRecord = useUpdateImportantInfoMutation();
  const deleteRecord = useDeleteImportantInfoMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (recordQuery.isLoading) {
    return <Spinner label="Loading record…" />;
  }
  if (recordQuery.isError || !recordQuery.data) {
    return <Alert variant="error">Record not found</Alert>;
  }

  const record = recordQuery.data;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/important-info" className="hover:underline">
              Important information
            </Link>{" "}
            / {record.title}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{record.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete record?",
                description: "This cannot be undone.",
                confirmLabel: "Delete",
                variant: "danger",
              });
              if (!ok) {
                return;
              }
              await deleteRecord.mutateAsync(recordId);
              router.push("/important-info");
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <ImportantInfoForm
            initialValues={record}
            submitting={updateRecord.isPending}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              try {
                await updateRecord.mutateAsync({ id: recordId, body: values });
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <Meta label="Category" value={record.category} />
          <Meta label="Person / subject" value={record.subjectName || "—"} />
          <Meta label="Updated" value={formatDateTime(record.updatedAt)} />
          <div className="md:col-span-2">
            <Meta label="Value" value={record.value} mono />
          </div>
          <div className="md:col-span-2">
            <Meta label="Notes" value={record.notes} rich />
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, mono = false, rich = false }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {rich ? (
        value ? (
          <div className="mt-1">
            <RichTextContent html={value} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">—</p>
        )
      ) : (
        <p
          className={`mt-1 text-sm whitespace-pre-wrap break-all ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </p>
      )}
    </div>
  );
}
