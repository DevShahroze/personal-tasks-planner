"use client";

import Link from "next/link";

const modules = [
  {
    href: "/admin/task-processor",
    title: "Task processor",
    description: "Daily rollover and which task statuses roll forward.",
  },
  {
    href: "/admin/privacy-security",
    title: "Privacy & security",
    description: "PIN screen, session privacy, and related controls.",
  },
];

export default function AdminHomePage() {
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-lead">Configure modules for your workspace.</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {modules.map((module) => (
          <li key={module.href}>
            <Link
              href={module.href}
              className="surface-card block p-4 transition-colors hover:border-ring"
            >
              <h2 className="text-sm font-semibold">{module.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
