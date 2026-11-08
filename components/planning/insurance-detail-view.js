"use client";

import RichTextContent from "@/components/ui/rich-text/rich-text-content";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { formatInsuranceAnnualDueLabel } from "@/lib/planning/insurance";

export default function InsuranceDetailView({ policy }) {
  const dueLabel = formatInsuranceAnnualDueLabel(
    policy.premiumDueMonth,
    policy.premiumDueDay,
  );
  const paymentYears =
    policy.premiumPaymentYears ?? policy.termYears ?? policy.totalPremiumPayments;
  const maturityYears = policy.maturityYears;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Policy</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Insurance company</dt>
            <dd className="mt-0.5 text-sm">{policy.insurerName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Policy number</dt>
            <dd className="mt-0.5 font-mono text-sm break-all">
              {policy.policyNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-0.5 text-sm">{policy.appLoginName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sum assured</dt>
            <dd className="mt-0.5 text-sm">
              {formatCurrency(policy.sumAssured, policy.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Due date</dt>
            <dd className="mt-0.5 text-sm">{dueLabel || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Years you will pay</dt>
            <dd className="mt-0.5 text-sm">{paymentYears ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Matures in</dt>
            <dd className="mt-0.5 text-sm">
              {maturityYears ? `${maturityYears} years` : "—"}
              {policy.maturityDate ? ` · ${formatDate(policy.maturityDate)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5 text-sm">{policy.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Next premium due</dt>
            <dd className="mt-0.5 text-sm">{formatDate(policy.nextDueDate)}</dd>
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
          <p className="text-sm text-muted-foreground">No submissions recorded.</p>
        )}
      </section>

      <section className="grid gap-2 border-t border-border pt-4 text-sm md:grid-cols-2">
        <p>
          Premium progress: {policy.premiumsPaid ?? 0}
          {paymentYears ? ` / ${paymentYears} years` : ""}
        </p>
        <p>Outstanding: {formatCurrency(policy.outstandingBalance, policy.currency)}</p>
      </section>

      {policy.description ? (
        <section className="space-y-2 border-t border-border pt-4">
          <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
          <RichTextContent html={policy.description} />
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Updated {formatDateTime(policy.updatedAt)}
      </p>
    </div>
  );
}
