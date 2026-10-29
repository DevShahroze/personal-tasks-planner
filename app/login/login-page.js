"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api-client";
import { safeAppPath } from "@/lib/security/request";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function LoginPage() {
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
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-11 w-full items-center justify-between gap-3 px-3">
          <p className="text-sm font-semibold text-foreground">Tasks & Plans</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-3">
        <form
          onSubmit={onSubmit}
          className="surface-card w-full max-w-sm p-4 text-card-foreground"
        >
          <h1 className="page-title">Sign in</h1>
          <p className="page-lead mt-0.5">Private personal task tracker</p>

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

          <Button type="submit" className="mt-4 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </main>
    </div>
  );
}
