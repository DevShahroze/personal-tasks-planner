import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildDocxTable } from "../../export/docx-table.js";
import { downloadBlob, safeExportFileBase } from "./download.js";

function paymentSectionTitle(snapshot) {
  if (snapshot.kind === "kameti") {
    return "Contributions";
  }
  if (snapshot.kind === "subscription" || snapshot.kind === "financial") {
    return "Payment history";
  }
  return "Payments";
}

export async function downloadPlanningWord(snapshot) {
  const summaryRows = snapshot.summary.map((row) => [row.label, row.value]);
  const paymentRows = snapshot.payments.map((payment) => [
    String(payment.index),
    payment.paidAtLabel,
    payment.amountLabel,
    payment.note || "",
  ]);

  const doc = new Document({
    title: snapshot.title,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: snapshot.title, bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Exported ${new Date().toLocaleString()}`,
                italics: true,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Summary" })],
            spacing: { after: 120 },
          }),
          buildDocxTable(["Field", "Value"], summaryRows, [32, 68]),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: paymentSectionTitle(snapshot) })],
            spacing: { after: 120 },
          }),
          paymentRows.length
            ? buildDocxTable(snapshot.paymentColumns, paymentRows, [8, 24, 18, 50])
            : new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: "No payments logged yet.", size: 22 })],
              }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const base = safeExportFileBase(snapshot.title, snapshot.fileBase);
  downloadBlob(blob, `${base}.docx`);
}

// Re-export alias for financial + planning callers
export const downloadExportWord = downloadPlanningWord;
