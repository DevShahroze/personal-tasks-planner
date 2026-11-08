"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ThoughtForm from "@/components/thoughts/thought-form";
import ThoughtDetailView from "@/components/thoughts/thought-detail-view";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  useThought,
  useUpdateThoughtMutation,
  useDeleteThoughtMutation,
} from "@/hooks/use-thoughts";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { useConfirm } from "@/contexts/confirm-context";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastSuccess } from "@/lib/toast-bus";

export default function ThoughtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const thoughtId = params.id;
  const thoughtQuery = useThought(thoughtId);
  const updateThought = useUpdateThoughtMutation();
  const deleteThought = useDeleteThoughtMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (thoughtQuery.isLoading) return <Spinner label="Loading thought…" />;
  if (thoughtQuery.isError || !thoughtQuery.data) {
    return <Alert variant="error">Thought not found</Alert>;
  }

  const thought = thoughtQuery.data;
  const showReadOnlyFooter = !editing;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete thought?",
      description: "Delete this thought? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await deleteThought.mutateAsync(thoughtId);
    router.push("/thoughts");
  };

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/thoughts" className="hover:underline">
            Thoughts
          </Link>{" "}
          / {thought.title}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{thought.title}</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4">
        {editing ? (
          <ThoughtForm
            key={`${thoughtId}-${thought.updatedAt}`}
            isEditForm
            initialValues={thought}
            submitting={updateThought.isPending}
            deleting={deleteThought.isPending}
            submitLabel="Save changes"
            onCancelEdit={() => {
              setEditing(false);
              setError("");
            }}
            onDelete={onDelete}
            onSubmit={async (values) => {
              setError("");
              try {
                await updateThought.mutateAsync({ id: thoughtId, body: values });
                toastSuccess("Thought updated");
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        ) : (
          <ThoughtDetailView thought={thought} />
        )}
      </div>

      <EntityLinksPanel
        entityType="thought"
        entityId={thoughtId}
        linkedTasks={thought.linkedTasks || []}
        linkedPlans={thought.linkedPlans || []}
      />

      {showReadOnlyFooter ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 md:px-4 ${SHELL_FIXED_CHROME_CLASS}`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={deleteThought.isPending}
            >
              {deleteThought.isPending ? "Deleting…" : "Delete"}
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
