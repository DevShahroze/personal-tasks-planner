"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import {
  buildInstallmentExportSnapshot,
  buildKametiExportSnapshot,
  buildSubscriptionExportSnapshot,
} from "@/lib/planning/export/snapshots";
import { buildFinancialExportSnapshot } from "@/lib/finance/export/snapshots";
import { downloadPlanningExcel } from "@/lib/planning/export/write-excel";
import { downloadPlanningWord } from "@/lib/planning/export/write-word";
import { downloadExportPdf } from "@/lib/export/write-pdf";
import { toastError } from "@/lib/toast-bus";

function ExportFileIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 17V11M9.5 14.5 12 17l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function snapshotForKind(kind, record) {
  if (kind === "installment") {
    return buildInstallmentExportSnapshot(record);
  }
  if (kind === "kameti") {
    return buildKametiExportSnapshot(record);
  }
  if (kind === "financial") {
    return buildFinancialExportSnapshot(record);
  }
  return buildSubscriptionExportSnapshot(record);
}

export default function RecordExportMenu({ kind, record, className = "" }) {
  const [pending, setPending] = useState("");

  const runExport = async (format) => {
    if (!record || pending) {
      return;
    }
    setPending(format);
    try {
      const snapshot = snapshotForKind(kind, record);
      if (format === "excel") {
        await downloadPlanningExcel(snapshot);
      } else if (format === "word") {
        await downloadPlanningWord(snapshot);
      } else {
        await downloadExportPdf(snapshot);
      }
    } catch (error) {
      toastError("Export failed", error?.message || "Could not build file");
    } finally {
      setPending("");
    }
  };

  const label = (format, text) => (pending === format ? `${text}…` : text);

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${className}`.trim()}
      role="group"
      aria-label="Export"
    >
      <Button
        type="button"
        variant="secondary"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={Boolean(pending)}
        title="Export Word (.docx)"
        onClick={() => runExport("word")}
      >
        <ExportFileIcon />
        <span className="hidden sm:inline">{label("word", "Word")}</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={Boolean(pending)}
        title="Export Excel (.xlsx)"
        onClick={() => runExport("excel")}
      >
        <ExportFileIcon />
        <span className="hidden sm:inline">{label("excel", "Excel")}</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={Boolean(pending)}
        title="Export PDF (.pdf)"
        onClick={() => runExport("pdf")}
      >
        <ExportFileIcon />
        <span className="hidden sm:inline">{label("pdf", "PDF")}</span>
      </Button>
    </div>
  );
}
