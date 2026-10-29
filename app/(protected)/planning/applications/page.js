"use client";

import Link from "next/link";
import { useUniversityApplications } from "@/hooks/use-planning";
import { formatDate } from "@/lib/format";
import Spinner from "@/components/ui/spinner";

export default function ApplicationsPage() {
  const query = useUniversityApplications();
  if (query.isLoading) return <Spinner label="Loading…" />;
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <Link href="/planning" className="text-sm hover:underline">
        Planning
      </Link>
      <h1 className="page-title">University applications</h1>
      <Link href="/planning/applications/new" className="text-xs underline">
        New application
      </Link>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {(query.data?.items || []).map((item) => (
          <li key={item._id} className="px-3 py-2">
            <Link
              href={`/planning/applications/${item._id}`}
              className="hover:underline"
            >
              {item.universityName} — {item.programName} · Deadline{" "}
              {formatDate(item.applicationDeadline)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
