"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import CurrentProjectForm from "@/components/current-projects/current-project-form";
import CurrentProjectDetailView from "@/components/current-projects/current-project-detail-view";
import CurrentProjectMilestones from "@/components/current-projects/current-project-milestones";
import {
  useCurrentProject,
  useDeleteCurrentProjectMutation,
  useUpdateCurrentProjectMutation,
} from "@/hooks/use-current-projects";
import { useConfirm } from "@/contexts/confirm-context";
import Button from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { SHELL_FIXED_CHROME_CLASS } from "@/lib/layout/shell-nav";
import { toastApiError, toastSuccess } from "@/lib/toast-bus";

export default function CurrentProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const query = useCurrentProject(id);
  const update = useUpdateCurrentProjectMutation();
  const remove = useDeleteCurrentProjectMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (query.isLoading) {
    return <Spinner label="Loading project…" />;
  }

  if (query.isError || !query.data) {
    return <Alert variant="error">Project not found</Alert>;
  }

  const project = query.data;
  const showReadOnlyFooter = !editing;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete project?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    try {
      await remove.mutateAsync(id);
      router.push("/current-projects");
    } catch (err) {
      toastApiError(err, "Delete project");
    }
  };

  const milestonePending = update.isPending;

  return (
    <div
      className={`mx-auto max-w-4xl space-y-4 ${showReadOnlyFooter || editing ? "pb-24" : ""}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/current-projects" className="hover:underline">
            Current projects
          </Link>{" "}
          / {project.title}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{project.title}</h1>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4">
        {editing ? (
          <CurrentProjectForm
            key={`${id}-${project.updatedAt}`}
            isEditForm
            initialValues={project}
            submitting={update.isPending}
            deleting={remove.isPending}
            submitLabel="Save changes"
            onCancelEdit={() => {
              setEditing(false);
              setError("");
            }}
            onDelete={onDelete}
            onSubmit={async (values) => {
              setError("");
              try {
                await update.mutateAsync({ id, body: values });
                toastSuccess("Project updated");
                setEditing(false);
              } catch (err) {
                toastApiError(err, "Update project");
                setError(err.message || "Could not save project");
              }
            }}
          />
        ) : (
          <CurrentProjectDetailView project={project} />
        )}
      </div>

      <CurrentProjectMilestones
        project={project}
        pending={milestonePending}
        onAddMilestone={async (addMilestone) => {
          await update.mutateAsync({ id, body: { addMilestone } });
          toastSuccess("Milestone added");
        }}
        onAchieveMilestone={async (achieveMilestone) => {
          await update.mutateAsync({ id, body: { achieveMilestone } });
          toastSuccess("Milestone achieved");
        }}
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
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
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
