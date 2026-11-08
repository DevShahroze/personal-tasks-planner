"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { formatInsuranceAnnualDueLabel } from "@/lib/planning/insurance";

export default function InsuranceDetailView({ policy }) {
  const dueLabel = formatInsuranceAnnualDueLabel(
    policy.premiumDueMonth,
    policy.premiumDueDay,
  );

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Policy</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Insurer / plan</dt>
            <dd className="mt-0.5 text-sm">{policy.insurerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Policy number</dt>
            <dd className="mt-0.5 font-mono text-sm break-all">
              {policy.policyNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sum assured</dt>
            <dd className="mt-0.5 text-sm">
              {policy.sumAssured != null
                ? formatCurrency(policy.sumAssured, policy.currency)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Premium (each payment)</dt>
            <dd className="mt-0.5 text-sm">
              {formatCurrency(policy.premiumAmount, policy.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Due date</dt>
            <dd className="mt-0.5 text-sm">
              {dueLabel || formatDate(policy.nextDueDate) || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5 text-sm">{policy.status}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="text-sm font-semibold tracking-tight">App login</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Login name</dt>
            <dd className="mt-0.5 font-mono text-sm break-all">
              {policy.appLoginName || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="text-sm font-semibold tracking-tight">Amount submitted</h2>
        {policy.annualSubmissions?.length ? (
          <ul className="space-y-2">
            {policy.annualSubmissions.map((row) => (
              <li
                key={row.year}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">Year {row.year}</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(row.amount, policy.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No yearly submissions recorded.
          </p>
        )}
      </section>

      {policy.description ? (
        <section className="space-y-2 border-t border-border pt-4">
          <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
          <RichTextContent html={policy.description} />
        </section>
      ) : null}

      <section className="grid gap-2 border-t border-border pt-4 text-sm md:grid-cols-2">
        <p>Outstanding: {formatCurrency(policy.outstandingBalance, policy.currency)}</p>
        <p>
          Total premium: {formatCurrency(policy.totalPremiumAmount, policy.currency)}
        </p>
        <p>Premiums paid: {policy.premiumsPaid}</p>
        <p>Next due: {formatDate(policy.nextDueDate)}</p>
        {policy.termYears ? <p>Term: {policy.termYears} years</p> : null}
        {policy.totalPremiumPayments ? (
          <p>Total payments: {policy.totalPremiumPayments}</p>
        ) : null}
        <p>Policy start: {formatDate(policy.startDate)}</p>
        <p>End date: {formatDate(policy.endDate)}</p>
      </section>

      <p className="text-xs text-muted-foreground">
        Updated {formatDateTime(policy.updatedAt)}
      </p>
    </div>
  );
}
