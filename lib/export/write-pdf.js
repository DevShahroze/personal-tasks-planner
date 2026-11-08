import { downloadBlob, safeExportFileBase } from "../planning/export/download.js";

function paymentSheetTitle(snapshot) {
  if (snapshot.kind === "kameti") {
    return "Contributions";
  }
  if (snapshot.kind === "subscription" || snapshot.kind === "financial") {
    return "Payment history";
  }
  return "Payments";
}

export async function downloadExportPdf(snapshot) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(snapshot.title || "Export", margin, cursorY);
  cursorY += 22;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()}`, margin, cursorY);
  doc.setTextColor(0);
  cursorY += 16;

  autoTable(doc, {
    startY: cursorY,
    head: [["Field", "Value"]],
    body: snapshot.summary.map((row) => [row.label, row.value]),
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    columnStyles: {
      0: { cellWidth: 170 },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  cursorY = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(paymentSheetTitle(snapshot), margin, cursorY);
  cursorY += 8;

  const paymentHeaders = snapshot.paymentColumns || ["#", "Paid at", "Amount", "Note"];
  const paymentBody = snapshot.payments.length
    ? snapshot.payments.map((payment) => [
        String(payment.index),
        payment.paidAtLabel,
        payment.amountLabel,
        payment.note || "",
      ])
    : [["—", "No payments logged yet.", "", ""]];

  autoTable(doc, {
    startY: cursorY + 6,
    head: [paymentHeaders],
    body: paymentBody,
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 120 },
      2: { cellWidth: 80 },
      3: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  const blob = doc.output("blob");
  const base = safeExportFileBase(snapshot.title, snapshot.fileBase);
  downloadBlob(blob, `${base}.pdf`);
}
