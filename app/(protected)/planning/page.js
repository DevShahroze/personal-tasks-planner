"use client";

import Link from "next/link";

const sections = [
  {
    href: "/planning/installments",
    title: "Installments & dues",
    description:
      "Commitments with recurring installment schedules and payment history.",
  },
  {
    href: "/planning/kameti",
    title: "Kameti",
    description: "Track contributions, payouts, and remaining obligations separately.",
  },
  {
    href: "/planning/subscriptions",
    title: "Subscriptions",
    description: "Billing cycles, renewals, and recorded payments.",
  },
  {
    href: "/planning/applications",
    title: "University applications",
    description: "Deadlines, fees, and application status.",
  },
  {
    href: "/planning/tours",
    title: "Tours & trips",
    description: "Multi-day plans, budgets, and expense records.",
  },
];

export default function PlanningHubPage() {
  return (
    <div className="page-stack mx-auto max-w-3xl">
      <div>
        <h1 className="page-title">Planning</h1>
        <p className="page-lead">
          Installments, Kameti, subscriptions, applications, and trips — integrated with
          your calendar.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {sections.map((section) => (
          <li key={section.href}>
            <Link href={section.href} className="block px-3 py-3 hover:bg-muted">
              <p className="font-medium">{section.title}</p>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Simple money lent/borrowed records remain under{" "}
        <Link href="/financial-records" className="underline">
          Financial
        </Link>
        .
      </p>
    </div>
  );
}
