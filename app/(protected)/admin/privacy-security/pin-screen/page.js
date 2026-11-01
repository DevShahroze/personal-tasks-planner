"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";
import { usePinLock } from "@/contexts/pin-lock-context";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";
import Spinner from "@/components/ui/spinner";
import { toastSuccess } from "@/lib/toast-bus";

const IDLE_OPTIONS = [
  { value: "1", label: "1 minute" },
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
];

function PinScreenSettingsForm({ settings }) {
  const queryClient = useQueryClient();
  const { invalidateSettings } = usePinLock();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [idleMinutes, setIdleMinutes] = useState(String(settings.idleMinutes ?? 5));
  const [formError, setFormError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (body) => adminApi.pinScreen.update(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.pinScreen, data);
      invalidateSettings();
      setPassword("");
      setPin("");
      setFormError("");
      toastSuccess("PIN screen settings saved");
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
    const body = {
      password,
      enabled,
      idleMinutes: Number(idleMinutes),
    };
    if (pin) {
      body.pin = pin;
    }
    if (enabled && !settings.configured && pin.length !== 4) {
      setFormError("Enter a new 4-digit PIN to enable PIN screen");
      return;
    }
    await saveMutation.mutateAsync(body);
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
        Enable PIN screen
      </label>

      <label className="block space-y-1 text-xs font-medium">
        <span>Idle duration before lock</span>
        <Select
          value={idleMinutes}
          onChange={(event) => setIdleMinutes(event.target.value)}
        >
          {IDLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="block space-y-1 text-xs font-medium">
        <span>{settings.configured ? "New PIN (optional)" : "4-digit PIN"}</span>
        <Input
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={pin}
          placeholder={settings.configured ? "Leave blank to keep current PIN" : "0000"}
          onChange={(event) =>
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
          className="tracking-[0.35em]"
        />
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
        Status:{" "}
        {settings.enabled && settings.configured
          ? `Enabled · lock after ${settings.idleMinutes} min idle`
          : settings.configured
            ? "Configured but disabled"
            : "Not configured"}
      </p>

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving…" : "Save PIN settings"}
      </Button>
    </form>
  );
}

export default function PinScreenAdminPage() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.pinScreen,
    queryFn: () => adminApi.pinScreen.get(),
    ...catalogQueryOptions(),
  });

  if (settingsQuery.isLoading) {
    return <Spinner label="Loading PIN settings…" />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return <Alert variant="error">Could not load PIN screen settings</Alert>;
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
          / PIN screen
        </p>
        <h1 className="page-title">PIN screen</h1>
        <p className="page-lead">
          After the idle duration, the app locks until the PIN is entered. Removing the
          lock overlay from the page logs you out and clears browser storage.
        </p>
      </div>

      <PinScreenSettingsForm
        key={`${settings.enabled}-${settings.idleMinutes}-${settings.configured}`}
        settings={settings}
      />
    </div>
  );
}
