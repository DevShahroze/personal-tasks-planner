"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ImportantInfoForm from "@/components/important-info/important-info-form";
import ImportantInfoDetailView from "@/components/important-info/important-info-detail-view";
import {
  useImportantInfoRecord,
  useUpdateImportantInfoMutation,
  useDeleteImportantInfoMutation,
} from "@/hooks/use-important-info";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { useConfirm } from "@/contexts/confirm-context";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastSuccess } from "@/lib/toast-bus";

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
  const showReadOnlyFooter = !editing;

  const onDelete = async () => {
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
  };

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/important-info" className="hover:underline">
            Important information
          </Link>{" "}
          / {record.title}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{record.title}</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4">
        {editing ? (
          <ImportantInfoForm
            key={`${recordId}-${record.updatedAt}`}
            isEditForm
            initialValues={record}
            submitting={updateRecord.isPending}
            deleting={deleteRecord.isPending}
            submitLabel="Save changes"
            onCancelEdit={() => {
              setEditing(false);
              setError("");
            }}
            onDelete={onDelete}
            onSubmit={async (values) => {
              setError("");
              try {
                await updateRecord.mutateAsync({ id: recordId, body: values });
                toastSuccess("Record updated");
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        ) : (
          <ImportantInfoDetailView record={record} />
        )}
      </div>

      {showReadOnlyFooter ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={deleteRecord.isPending}
            >
              {deleteRecord.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
