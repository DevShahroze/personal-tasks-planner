import { formatCurrency, formatDate, formatDateTime } from "../../format.js";
import { richTextToPlainText } from "../../rich-text/plain-text.js";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_TYPE_LABEL } from "../constants.js";
import { describeFinancialObligation } from "../obligations.js";
import { roundMoney } from "../balance.js";

function field(label, value) {
  return { label, value: value == null || value === "" ? "—" : String(value) };
}

export function buildFinancialExportSnapshot(record) {
  const currency = record.currency || "PKR";
  const obligation = describeFinancialObligation(record);

  const summary = [
    field("Party", record.partyName),
    field("Type", FINANCIAL_TYPE_LABEL[record.type] || record.type),
    field("Status", FINANCIAL_STATUS_LABEL[record.status] || record.status),
    field(
      obligation.heading,
      obligation.settled ? obligation.label : obligation.shortLabel,
    ),
    field("Full obligation", obligation.label),
    field("Outstanding balance", formatCurrency(record.outstandingBalance, currency)),
    field("Original amount", formatCurrency(record.originalAmount, currency)),
    field(
      "Expected date",
      record.expectedDate ? formatDate(record.expectedDate) : null,
    ),
    field("Currency", currency),
    field("Overdue", record.overdue ? "Yes" : "No"),
    field("Description", richTextToPlainText(record.description)),
    field("Notes", richTextToPlainText(record.notes)),
    field(
      "Linked task",
      record.taskId?.title || (record.taskId ? String(record.taskId) : null),
    ),
    field("Last updated", formatDateTime(record.updatedAt)),
  ];

  const payments = (record.payments || []).map((payment, index) => ({
    index: index + 1,
    paidAt: payment.paidAt,
    paidAtLabel: payment.paidAt ? formatDateTime(payment.paidAt) : "—",
    amount: roundMoney(payment.amount),
    amountLabel: formatCurrency(payment.amount, currency),
    note: payment.note || "",
  }));

  return {
    kind: "financial",
    title: `${record.partyName} — ${FINANCIAL_TYPE_LABEL[record.type] || record.type}`,
    fileBase: "financial-record",
    summary,
    payments,
    currency,
    paymentColumns: ["#", "Paid at", "Amount", "Note"],
  };
}
