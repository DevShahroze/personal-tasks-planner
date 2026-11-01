"use client";

import Link from "next/link";

const submodules = [
  {
    href: "/admin/privacy-security/pin-screen",
    title: "PIN screen",
    description: "Require a 4-digit PIN after inactivity. Tampering logs you out.",
  },
  {
    href: "/admin/privacy-security/session-timeout",
    title: "Session timeout",
    description: "Sign out automatically after a period with no activity.",
  },
];

export default function PrivacySecurityAdminPage() {
  return (
    <div className="page-stack">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          / Privacy & security
        </p>
        <h1 className="page-title">Privacy & security</h1>
        <p className="page-lead">Submodules for access control and privacy.</p>
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
