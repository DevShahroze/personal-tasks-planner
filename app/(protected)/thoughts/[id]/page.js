"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ThoughtForm from "@/components/thoughts/thought-form";
import EntityLinksPanel from "@/components/relationships/entity-links-panel";
import {
  useThought,
  useUpdateThoughtMutation,
  useDeleteThoughtMutation,
} from "@/hooks/use-thoughts";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import { useConfirm } from "@/contexts/confirm-context";

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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/thoughts" className="hover:underline">
              Thoughts
            </Link>{" "}
            / {thought.title}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{thought.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
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
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <ThoughtForm
            initialValues={thought}
            submitting={updateThought.isPending}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              try {
                await updateThought.mutateAsync({ id: thoughtId, body: values });
                setEditing(false);
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm">{thought.content || "—"}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Updated {formatDateTime(thought.updatedAt)}
          </p>
        </div>
      )}

      <EntityLinksPanel
        entityType="thought"
        entityId={thoughtId}
        linkedTasks={thought.linkedTasks || []}
        linkedPlans={thought.linkedPlans || []}
      />
    </div>
  );
}
