"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import Spinner from "@/components/ui/spinner";
import { toastSuccess } from "@/lib/toast-bus";

function RolloverStatusesForm({ settings }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState(() => new Set(settings.statuses));
  const [formError, setFormError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (body) => adminApi.taskRollover.update(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.taskRollover, data);
      setPassword("");
      setFormError("");
      setSelected(new Set(data.statuses));
      toastSuccess("Rollover settings saved");
    },
    onError: (err) => {
      setFormError(err.message || "Could not save settings");
    },
  });

  const toggleStatus = (status) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!password) {
      setFormError("Your account password is required");
      return;
    }
    if (selected.size === 0) {
      setFormError("Select at least one status");
      return;
    }
    await saveMutation.mutateAsync({
      password,
      statuses: [...selected],
    });
  };

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-4">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Include tasks with status</legend>
        <p className="text-xs text-muted-foreground">
          Open tasks on a business date that match these statuses are moved to the next
          day during rollover. Default: To Do and In Progress.
        </p>
        <ul className="space-y-2">
          {settings.availableStatuses.map((status) => (
            <li key={status}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-4 w-4 rounded border-border"
                />
                {status}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <label className="block space-y-1 text-xs font-medium">
        <span>Account password (required)</span>
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving…" : "Save rollover settings"}
      </Button>
    </form>
  );
}

export default function TaskRolloverAdminPage() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.taskRollover,
    queryFn: () => adminApi.taskRollover.get(),
    ...catalogQueryOptions(),
  });

  if (settingsQuery.isLoading) {
    return <Spinner label="Loading rollover settings…" />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return <Alert variant="error">Could not load rollover settings</Alert>;
  }

  const settings = settingsQuery.data;

  return (
    <div className="page-stack mx-auto max-w-lg">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          /{" "}
          <Link href="/admin/task-processor" className="hover:underline">
            Task processor
          </Link>{" "}
          / Rollover statuses
        </p>
        <h1 className="page-title">Rollover statuses</h1>
        <p className="page-lead">
          Control which tasks the daily processor rolls to the next calendar day.
        </p>
      </div>

      <RolloverStatusesForm key={settings.statuses.join(",")} settings={settings} />
    </div>
  );
}
