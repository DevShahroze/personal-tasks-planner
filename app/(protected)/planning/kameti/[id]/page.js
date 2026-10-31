"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import { useKametiPlan } from "@/hooks/use-planning";
import { planningApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import {
  kametiContributionPaymentDescription,
  kametiExpectedPayoutAmount,
  kametiPayoutLooksAutoInferred,
  kametiPayoutRoundIndex,
  kametiPerPersonContribution,
  kametiPoolPerRound,
  kametiRoundsPaid,
  kametiRoundsRemaining,
  kametiYourPayoutMonthLabel,
} from "@/lib/planning/kameti.js";
import { validateKametiUpdate } from "@/lib/planning/validate";
import { toastFormError, toastValidationErrors } from "@/lib/planning/form-errors";
import { validatePaymentAmount } from "@/lib/finance/balance";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import FieldLabel from "@/components/ui/field-label";
import KametiFormFields, {
  kametiPayloadFromFormData,
} from "@/components/planning/kameti-form-fields";
import StickyPageFooter from "@/components/layout/sticky-page-footer";
import { useConfirm } from "@/contexts/confirm-context";
import PauseResumeButton from "@/components/planning/pause-resume-button";

export default function KametiDetailPage() {
  const params = useParams();
  const planId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const confirm = useConfirm();
  const todayYmd = useClientTodayYmd()?.ymd || "";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);

  const query = useKametiPlan(planId);

  const syncKametiCaches = (record) => {
    if (record) {
      queryClient.setQueryData(queryKeys.planning.kameti.detail(planId), record);
    }
    queryClient.invalidateQueries({ queryKey: ["planning", "kameti", "list"] });
    queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
  };

  const update = useMutation({
    mutationFn: (body) => planningApi.kameti.update(planId, body),
    onSuccess: (data) => {
      syncKametiCaches(data);
      setEditKey((value) => value + 1);
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => planningApi.kameti.remove(planId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.planning.kameti.detail(planId) });
      queryClient.invalidateQueries({ queryKey: ["planning", "kameti", "list"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] });
      router.push("/planning/kameti");
    },
  });

  const addContribution = useMutation({
    mutationFn: (body) => planningApi.kameti.addContribution(planId, body, todayYmd),
    onSuccess: (data) => {
      syncKametiCaches(data);
    },
  });

  const recordPayout = useMutation({
    mutationFn: (body) => planningApi.kameti.recordPayout(planId, body, todayYmd),
    onSuccess: (data) => syncKametiCaches(data),
  });

  const item = query.data;

  if (query.isLoading) {
    return <Spinner label="Loading…" />;
  }
  if (!item) {
    return <Alert variant="error">Not found</Alert>;
  }

  const setPlanningStatus = async (status) => {
    await update.mutateAsync({ status });
  };

  const perPerson = kametiPerPersonContribution(item);
  const pool = kametiPoolPerRound(item);
  const roundsPaid = kametiRoundsPaid(item);
  const roundsLeft = kametiRoundsRemaining(item);
  const expectedPayout = kametiExpectedPayoutAmount(item);
  const payoutMonthLabel = kametiYourPayoutMonthLabel(item);
  const payoutRoundIndex = kametiPayoutRoundIndex(item);
  const currency = item.currency || "PKR";

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete Kameti plan?",
      description:
        "Delete this plan and its contribution history? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) {
      return;
    }
    await remove.mutateAsync();
  };

  return (
    <div className="page-stack mx-auto w-full max-w-4xl pb-20">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/planning/kameti" className="hover:underline">
            Kameti
          </Link>{" "}
          / {item.planName}
        </p>
        <h1 className="page-title">{item.planName}</h1>
        <p className="page-lead">
          {item.status.replace(/_/g, " ")} · {roundsPaid}/{item.totalParticipants}{" "}
          rounds paid · {roundsLeft} left · Next round{" "}
          {formatDate(item.nextContributionDueDate)}
        </p>
      </div>

      {editing ? (
        <form
          id="kameti-edit-form"
          className="surface-card space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const body = kametiPayloadFromFormData(new FormData(event.currentTarget), {
              includeStatus: true,
            });
            const validated = validateKametiUpdate(body, item);
            if (!validated.ok) {
              toastValidationErrors(validated.errors);
              return;
            }
            await update.mutateAsync(validated.patch);
          }}
        >
          <h2 className="text-sm font-semibold">Plan details</h2>
          <KametiFormFields
            key={`${planId}-${editKey}`}
            idPrefix="edit-kameti"
            defaults={item}
            showPrepaid={false}
            showStatus
          />
        </form>
      ) : (
        <div className="surface-card space-y-4">
          <h2 className="text-sm font-semibold">Plan details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Plan name" value={item.planName} />
            <ReadOnlyField label="Status" value={item.status.replace(/_/g, " ")} />
            <ReadOnlyField
              label="Total participants"
              value={String(item.totalParticipants)}
            />
            <ReadOnlyField
              label="Monthly pool total"
              value={pool != null ? formatCurrency(pool, currency) : "—"}
            />
            <ReadOnlyField
              label="Contribution frequency"
              value={kametiFrequencyLabel(item)}
            />
            <ReadOnlyField label="Start date" value={formatDate(item.startDate)} />
            <ReadOnlyField label="End date" value={formatDate(item.endDate)} />
            <ReadOnlyField
              label="Expected payout date"
              value={formatDate(item.expectedPayoutDate)}
            />
            {item.notes ? (
              <ReadOnlyField
                label="Notes"
                value={item.notes}
                className="md:col-span-2"
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="surface-card space-y-4">
        <h2 className="text-sm font-semibold">At a glance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField
            label="Pool per round"
            info="Total collected each round when it is someone’s turn (participants × per-person share)."
            value={pool != null ? formatCurrency(pool, currency) : "—"}
          />
          <ReadOnlyField
            label="Your share each round"
            info="What you pay each round: monthly pool total divided by participant count."
            value={perPerson != null ? formatCurrency(perPerson, currency) : "—"}
          />
          <ReadOnlyField
            label="Remaining to pay"
            info="Per-person share × rounds you still owe. Paying late does not change how many rounds are left."
            value={`${formatCurrency(item.remainingContributionsOwed, currency)} (${roundsLeft} round${roundsLeft === 1 ? "" : "s"})`}
          />
          <ReadOnlyField
            label="Your Kameti payout month"
            info="The month it is your turn to receive the pool from the group. You still pay your share that round; others pay you the rest."
            value={
              payoutMonthLabel
                ? `${payoutMonthLabel}${
                    expectedPayout != null
                      ? ` · You receive ${formatCurrency(expectedPayout, currency)}`
                      : ""
                  }`
                : "—"
            }
          />
          <ReadOnlyField
            label="Expected payout"
            info="Same as your payout month — calendar date and typical amount from the group."
            value={
              item.expectedPayoutDate
                ? `${formatDate(item.expectedPayoutDate)}${
                    expectedPayout != null
                      ? ` · ${formatCurrency(expectedPayout, currency)}`
                      : ""
                  }`
                : "—"
            }
          />
          <ReadOnlyField
            label="Payout received"
            info="When you mark payout received, log the total you actually collected on your turn."
            value={
              item.payoutReceivedAt
                ? `${payoutMonthLabel ? `${payoutMonthLabel} · ` : ""}${formatDate(item.payoutReceivedAt)} · ${formatCurrency(item.payoutAmount, currency)}${
                    kametiPayoutLooksAutoInferred(item)
                      ? " · Auto-detected (you paid a round after your payout month)"
                      : ""
                  }`
                : payoutMonthLabel
                  ? `${payoutMonthLabel} — not logged yet`
                  : "—"
            }
          />
          <ReadOnlyField
            label="Next contribution round"
            info="Calendar month for the next round you have not logged yet. You can record payment on a later date if you paid late."
            value={formatDate(item.nextContributionDueDate)}
          />
        </div>
      </div>

      <div className="surface-card space-y-4">
        <h2 className="text-sm font-semibold">Contributions</h2>
        {payoutMonthLabel ? (
          <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">
              Your Kameti payout month: {payoutMonthLabel}
            </span>
            <span className="text-muted-foreground">
              {" "}
              — this is the month you receive the pool from the group
              {expectedPayout != null
                ? ` (${formatCurrency(expectedPayout, currency)})`
                : ""}
              . You still contribute your share that round.
            </span>
          </p>
        ) : null}
        {!item.contributionPayments?.length ? (
          <p className="text-xs text-muted-foreground">No contributions logged yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {item.contributionPayments.map((payment, index) => {
              const isPayoutRound =
                payoutRoundIndex != null && index === payoutRoundIndex;
              return (
                <li
                  key={payment._id || index}
                  className={`py-2 ${isPayoutRound ? "rounded-md bg-primary/5 px-2 -mx-2" : ""}`}
                >
                  {formatCurrency(payment.amount, currency)} on{" "}
                  {formatDateTime(payment.paidAt)}
                  <span
                    className={
                      isPayoutRound
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {" "}
                    — {kametiContributionPaymentDescription(item, index)}
                  </span>
                </li>
              );
            })}
            {item.payoutReceivedAt && payoutMonthLabel ? (
              <li className="border-t border-primary/30 py-2.5 font-medium text-foreground">
                {payoutMonthLabel} — Kameti payout received ·{" "}
                {formatCurrency(item.payoutAmount, currency)}
                {kametiPayoutLooksAutoInferred(item) ? " (auto-detected)" : null}
              </li>
            ) : null}
          </ul>
        )}
        {item.status !== "completed" && item.status !== "cancelled" ? (
          <KametiContributionForm
            key={`${item._id}:${item.updatedAt}:contribution`}
            item={item}
            disabled={addContribution.isPending}
            onSubmit={(body) => addContribution.mutateAsync(body)}
          />
        ) : null}
      </div>

      {!item.payoutReceivedAt && item.status !== "cancelled" ? (
        <div className="surface-card space-y-4">
          <h2 className="text-sm font-semibold">Payout received</h2>
          <KametiPayoutForm
            key={`${item._id}:${item.updatedAt}:payout`}
            item={item}
            disabled={recordPayout.isPending}
            onSubmit={(body) => recordPayout.mutateAsync(body)}
          />
        </div>
      ) : null}

      <StickyPageFooter>
        {editing ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={update.isPending || remove.isPending}
              onClick={() => {
                setEditing(false);
                setEditKey((value) => value + 1);
              }}
            >
              Cancel
            </Button>
            <PauseResumeButton
              status={item.status}
              disabled={update.isPending || remove.isPending}
              onPause={() => setPlanningStatus("paused")}
              onResume={() => setPlanningStatus("active")}
            />
            <Button
              type="button"
              variant="danger"
              disabled={remove.isPending || update.isPending}
              onClick={onDelete}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={update.isPending}
              onClick={() => {
                document.getElementById("kameti-edit-form")?.requestSubmit();
              }}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/planning/kameti")}
            >
              Cancel
            </Button>
            <PauseResumeButton
              status={item.status}
              disabled={update.isPending || remove.isPending}
              onPause={() => setPlanningStatus("paused")}
              onResume={() => setPlanningStatus("active")}
            />
            <Button
              type="button"
              variant="danger"
              disabled={remove.isPending}
              onClick={onDelete}
            >
              Delete
            </Button>
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )}
      </StickyPageFooter>
    </div>
  );
}

function KametiContributionForm({ item, disabled, onSubmit }) {
  const per = kametiPerPersonContribution(item);
  const [contributionAmount, setContributionAmount] = useState(
    per != null ? String(per) : "",
  );
  const [contributionPaidAt, setContributionPaidAt] = useState("");
  const [contributionNote, setContributionNote] = useState("");

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const amount = Number(contributionAmount);
        const balanceCheck = validatePaymentAmount(
          amount,
          item.remainingContributionsOwed,
        );
        if (!balanceCheck.ok) {
          toastFormError(balanceCheck.error);
          return;
        }
        await onSubmit({
          amount,
          paidAt: contributionPaidAt || undefined,
          note: contributionNote.trim() || undefined,
        });
      }}
    >
      <div className="space-y-1">
        <FieldLabel
          htmlFor="kameti-contribution-amount"
          label="Amount"
          required
          info="Usually your per-person share for one round. Must not exceed remaining owed."
        />
        <Input
          id="kameti-contribution-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={contributionAmount}
          onChange={(event) => setContributionAmount(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <FieldLabel
          htmlFor="kameti-contribution-date"
          label="Payment date"
          info="When you actually paid. Can be later than the round month if the group was delayed."
        />
        <Input
          id="kameti-contribution-date"
          name="paidAt"
          type="date"
          value={contributionPaidAt}
          onChange={(event) => setContributionPaidAt(event.target.value)}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <FieldLabel
          htmlFor="kameti-contribution-note"
          label="Note"
          info="Optional, e.g. which month’s round this was for."
        />
        <Input
          id="kameti-contribution-note"
          name="note"
          value={contributionNote}
          onChange={(event) => setContributionNote(event.target.value)}
          placeholder="e.g. October round"
        />
      </div>
      <Button type="submit" className="md:col-span-2 md:w-fit" disabled={disabled}>
        Record round paid
      </Button>
    </form>
  );
}

function KametiPayoutForm({ item, disabled, onSubmit }) {
  const expected = kametiExpectedPayoutAmount(item);
  const [payoutAmount, setPayoutAmount] = useState(
    expected != null ? String(expected) : "",
  );
  const [payoutReceivedAt, setPayoutReceivedAt] = useState("");

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          payoutAmount: Number(payoutAmount),
          payoutReceivedAt: payoutReceivedAt || undefined,
        });
      }}
    >
      <div className="space-y-1">
        <FieldLabel
          htmlFor="kameti-payout-amount"
          label="Payout amount"
          required
          info="Total you received on your turn (typically from the other members). Defaults to (participants − 1) × your share."
        />
        <Input
          id="kameti-payout-amount"
          name="payoutAmount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={payoutAmount}
          onChange={(event) => setPayoutAmount(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <FieldLabel
          htmlFor="kameti-payout-date"
          label="Payout date"
          info="When the payout was complete or when you consider your turn fully collected."
        />
        <Input
          id="kameti-payout-date"
          name="payoutReceivedAt"
          type="date"
          value={payoutReceivedAt}
          onChange={(event) => setPayoutReceivedAt(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="md:col-span-2 md:w-fit"
        disabled={disabled}
      >
        Mark payout received
      </Button>
    </form>
  );
}

function kametiFrequencyLabel(item) {
  if (item.contributionFrequency === "custom" && item.customIntervalDays) {
    return `Every ${item.customIntervalDays} days`;
  }
  const value = item.contributionFrequency || "monthly";
  if (value === "custom") {
    return "Custom interval";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ReadOnlyField({ label, info, value, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {info ? (
        <FieldLabel label={label} info={info} />
      ) : (
        <p className="text-sm font-medium">{label}</p>
      )}
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
