"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

function statusLabel(status) {
  if (status === "ok" || status === "configured") {
    return "Healthy";
  }
  if (status === "local" || status === "not_linked") {
    return "Info";
  }
  return "Issue";
}

function PlatformCard({ item }) {
  if (!item) {
    return null;
  }

  return (
    <li className="surface-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold">{item.platform}</p>
        <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
          {statusLabel(item.status)}
        </span>
      </div>
      <p className="text-sm text-foreground">{item.summary}</p>
      {item.metrics ? (
        <dl className="grid gap-2 text-xs">
          {Object.entries(item.metrics).map(([key, value]) =>
            value != null && value !== "" ? (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="text-right font-mono">{String(value)}</dd>
              </div>
            ) : null,
          )}
        </dl>
      ) : null}
      <p className="text-xs text-muted-foreground">{item.usageNote}</p>
      {item.dashboardUrl ? (
        <a href={item.dashboardUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary" className="w-full sm:w-auto">
            Open {item.platform} dashboard
          </Button>
        </a>
      ) : null}
    </li>
  );
}

export default function PlatformHealthAdminPage() {
  const query = useQuery({
    queryKey: ["admin", "platform-health"],
    queryFn: () => apiFetch("/api/admin/platform-health"),
    staleTime: 60_000,
  });

  return (
    <div className="page-stack">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          / Platform health
        </p>
        <h1 className="page-title">Platform health &amp; free-tier usage</h1>
        <p className="page-lead">
          Live MongoDB check plus Vercel and Firebase links for quota and billing.
        </p>
      </div>

      {query.isLoading ? <Spinner label="Checking platforms…" /> : null}
      {query.isError ? (
        <Alert variant="error">Could not load platform health.</Alert>
      ) : null}

      {query.data ? (
        <>
          <p className="text-xs text-muted-foreground">
            Last checked {formatDateTime(query.data.checkedAt)}
          </p>
          <ul className="grid gap-3 lg:grid-cols-3">
            <PlatformCard item={query.data.mongodb} />
            <PlatformCard item={query.data.vercel} />
            <PlatformCard item={query.data.firebase} />
          </ul>
        </>
      ) : null}
    </div>
  );
}
