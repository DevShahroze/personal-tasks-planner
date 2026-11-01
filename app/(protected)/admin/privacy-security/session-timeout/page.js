"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";
import { useSessionIdleLogoutSettings } from "@/contexts/session-idle-logout-context";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";
import Spinner from "@/components/ui/spinner";
import { toastSuccess } from "@/lib/toast-bus";

const IDLE_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "120", label: "2 hours" },
  { value: "480", label: "8 hours" },
];

const TOKEN_MAX_AGE_OPTIONS = [
  { value: "60", label: "1 hour" },
  { value: "480", label: "8 hours" },
  { value: "1440", label: "24 hours" },
  { value: "10080", label: "7 days" },
  { value: "20160", label: "14 days" },
  { value: "43200", label: "30 days" },
];

function formatTokenMaxAge(minutes) {
  const match = TOKEN_MAX_AGE_OPTIONS.find(
    (option) => Number(option.value) === minutes,
  );
  if (match) {
    return match.label;
  }
  if (minutes % 1440 === 0) {
    return `${minutes / 1440} days`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60} hours`;
  }
  return `${minutes} minutes`;
}

function SessionTimeoutSettingsForm({ settings }) {
  const queryClient = useQueryClient();
  const { invalidateSettings } = useSessionIdleLogoutSettings();
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [idleMinutes, setIdleMinutes] = useState(String(settings.idleMinutes ?? 30));
  const [tokenMaxAgeMinutes, setTokenMaxAgeMinutes] = useState(
    String(settings.tokenMaxAgeMinutes ?? 10080),
  );
  const [formError, setFormError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (body) => adminApi.sessionIdleLogout.update(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.sessionIdleLogout, data);
      invalidateSettings();
      setPassword("");
      setFormError("");
      toastSuccess("Session timeout settings saved");
    },
    onError: (err) => {
      setFormError(err.message || "Could not save settings");
    },
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!password) {
      setFormError("Your account password is required");
      return;
    }
    await saveMutation.mutateAsync({
      password,
      enabled,
      idleMinutes: Number(idleMinutes),
      tokenMaxAgeMinutes: Number(tokenMaxAgeMinutes),
    });
  };

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-4">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Sign out automatically after inactivity
      </label>

      <label className="block space-y-1 text-xs font-medium">
        <span>Idle duration before sign-out</span>
        <Select
          value={idleMinutes}
          onChange={(event) => setIdleMinutes(event.target.value)}
          disabled={!enabled}
        >
          {IDLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="block space-y-1 text-xs font-medium">
        <span>Maximum session length (token expiry)</span>
        <Select
          value={tokenMaxAgeMinutes}
          onChange={(event) => setTokenMaxAgeMinutes(event.target.value)}
        >
          {TOKEN_MAX_AGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <span className="block font-normal text-muted-foreground">
          Applies to the next sign-in. The app signs you out when the session token
          expires, even if you are still active.
        </span>
      </label>

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

      <p className="text-xs text-muted-foreground">
        Idle sign-out:{" "}
        {settings.enabled
          ? `enabled · ${settings.idleMinutes} min without activity`
          : "disabled"}
        <br />
        Token lifetime: {formatTokenMaxAge(settings.tokenMaxAgeMinutes ?? 10080)} (from
        last sign-in)
      </p>

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving…" : "Save session timeout"}
      </Button>
    </form>
  );
}

export default function SessionTimeoutAdminPage() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.sessionIdleLogout,
    queryFn: () => adminApi.sessionIdleLogout.get(),
    ...catalogQueryOptions(),
  });

  if (settingsQuery.isLoading) {
    return <Spinner label="Loading session timeout…" />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return <Alert variant="error">Could not load session timeout settings</Alert>;
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
          <Link href="/admin/privacy-security" className="hover:underline">
            Privacy & security
          </Link>{" "}
          / Session timeout
        </p>
        <h1 className="page-title">Session timeout</h1>
        <p className="page-lead">
          Control idle sign-out, maximum session length (token expiry), and how long a
          sign-in stays valid. Idle sign-out is separate from the PIN screen lock.
        </p>
      </div>

      <SessionTimeoutSettingsForm
        key={`${settings.enabled}-${settings.idleMinutes}-${settings.tokenMaxAgeMinutes}`}
        settings={settings}
      />
    </div>
  );
}
