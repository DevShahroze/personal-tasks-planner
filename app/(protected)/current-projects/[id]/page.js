"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CurrentProjectForm from "@/components/current-projects/current-project-form";
import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import {
  useCurrentProject,
  useDeleteCurrentProjectMutation,
  useUpdateCurrentProjectMutation,
} from "@/hooks/use-current-projects";
import { useConfirm } from "@/contexts/confirm-context";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import { formatDate, formatDateTime } from "@/lib/format";
import { toastApiError } from "@/lib/toast-bus";

export default function CurrentProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const query = useCurrentProject(id);
  const update = useUpdateCurrentProjectMutation();
  const remove = useDeleteCurrentProjectMutation();

  if (query.isLoading) {
    return <Spinner label="Loading…" />;
  }

  const item = query.data;
  if (!item) {
    return <Alert variant="error">Project not found</Alert>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/current-projects" className="hover:underline">
          Current projects
        </Link>{" "}
        / {item.title}
      </p>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{item.title}</h1>
        <p className="text-sm text-muted-foreground">
          {item.status}
          {item.startedAt ? ` · Started ${formatDate(item.startedAt)}` : ""}
          {item.targetDate ? ` · Target ${formatDate(item.targetDate)}` : ""}
          {` · Updated ${formatDateTime(item.updatedAt)}`}
        </p>
      </div>

      {item.notes ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Notes</h2>
          <RichTextContent html={item.notes} className="text-sm" />
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Edit project</h2>
        <CurrentProjectForm
          initialValues={item}
          submitting={update.isPending}
          submitLabel="Save changes"
          deleting={remove.isPending}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({ id, body: values });
            } catch (err) {
              toastApiError(err, "Update project");
            }
          }}
          onDelete={async () => {
            const ok = await confirm({
              title: "Delete project?",
              description: "Remove this project permanently?",
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
          }}
        />
      </div>
    </div>
  );
}
