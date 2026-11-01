"use client";

import Link from "next/link";

const submodules = [
  {
    href: "/admin/task-processor/rollover",
    title: "Rollover statuses",
    description: "Choose which task statuses are included in daily rollover.",
  },
];

export default function TaskProcessorAdminPage() {
  return (
    <div className="page-stack">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          / Task processor
        </p>
        <h1 className="page-title">Task processor</h1>
        <p className="page-lead">Configure automatic daily task rollover.</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {submodules.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="surface-card block p-4 transition-colors hover:border-ring"
            >
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
