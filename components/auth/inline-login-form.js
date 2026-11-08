"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api-client";
import { safeAppPath } from "@/lib/security/request";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";

export default function InlineLoginForm({ onCancel, onSuccess }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.login({ username, password });
      onSuccess?.();
      const from = safeAppPath(searchParams.get("from") || "/dashboard");
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="surface-card mx-auto w-full max-w-sm p-4 text-card-foreground"
    >
      <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Access tasks, plans, and financial tools.
      </p>

      {error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block space-y-1 text-xs font-medium">
          <span>Username</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block space-y-1 text-xs font-medium">
          <span>Password</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back
          </Button>
        ) : null}
      </div>
    </form>
  );
}
