"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import FieldLabel from "@/components/ui/field-label";

function initialRows(defaults) {
  const fromDoc = Array.isArray(defaults?.annualSubmissions)
    ? defaults.annualSubmissions.map((row) => ({
        year: String(row.year ?? ""),
        amount: String(row.amount ?? ""),
      }))
    : [];
  if (fromDoc.length) {
    return fromDoc;
  }
  return [{ year: String(new Date().getFullYear()), amount: "" }];
}

export default function InsuranceAnnualSubmissionsFields({
  idPrefix = "insurance",
  defaults = null,
}) {
  const [rows, setRows] = useState(() => initialRows(defaults));

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/15 p-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Amount submitted</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Each row is logged as a premium payment for that year.
        </p>
      </div>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <FieldLabel
                htmlFor={`${idPrefix}-submission-year-${index}`}
                label="Year"
                info="Calendar year for this submission."
              />
              <Input
                id={`${idPrefix}-submission-year-${index}`}
                name="submissionYear"
                type="number"
                min="1900"
                max="2100"
                step="1"
                value={row.year}
                onChange={(event) => {
                  const value = event.target.value;
                  setRows((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, year: value } : item,
                    ),
                  );
                }}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel
                htmlFor={`${idPrefix}-submission-amount-${index}`}
                label="Amount submitted"
                info="Amount submitted that year."
              />
              <Input
                id={`${idPrefix}-submission-amount-${index}`}
                name="submissionAmount"
                type="number"
                step="0.01"
                min="0"
                value={row.amount}
                onChange={(event) => {
                  const value = event.target.value;
                  setRows((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, amount: value } : item,
                    ),
                  );
                }}
              />
            </div>
            <div className="flex items-end pb-0.5">
              <Button
                type="button"
                variant="ghost"
                className="h-9 text-xs"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-xs"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            { year: String(new Date().getFullYear()), amount: "" },
          ])
        }
      >
        Add another year
      </Button>
    </div>
  );
}
