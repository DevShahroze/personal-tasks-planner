import { downloadBlob, parseExcelDate, safeExportFileBase } from "./download.js";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const ALT_FILL = "FFF4F7FB";
const BORDER = { style: "thin", color: { argb: "FFD0D7DE" } };

function styleHeaderRow(row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = {
      top: BORDER,
      left: BORDER,
      bottom: BORDER,
      right: BORDER,
    };
  });
}

function styleBodyRow(row, zebra) {
  row.alignment = { vertical: "top", wrapText: true };
  row.eachCell((cell) => {
    cell.border = {
      top: BORDER,
      left: BORDER,
      bottom: BORDER,
      right: BORDER,
    };
    if (zebra) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: ALT_FILL },
      };
    }
  });
}

function autosizeSheet(worksheet) {
  worksheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? "" : String(cell.text ?? cell.value);
      max = Math.max(max, Math.min(text.length + 2, 52));
    });
    column.width = max;
  });
}

export async function downloadPlanningExcel(snapshot) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Personal Tasks Planner";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  summary.columns = [
    { header: "Field", key: "label", width: 30 },
    { header: "Value", key: "value", width: 44 },
  ];
  snapshot.summary.forEach((row) => summary.addRow(row));
  styleHeaderRow(summary.getRow(1));
  summary.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      styleBodyRow(row, rowNumber % 2 === 0);
    }
  });
  autosizeSheet(summary);

  const payments = workbook.addWorksheet("Payments", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const headers = snapshot.paymentColumns || ["#", "Paid at", "Amount", "Note"];
  payments.addRow(headers);
  snapshot.payments.forEach((payment) => {
    payments.addRow([
      payment.index,
      parseExcelDate(payment.paidAt),
      payment.amount,
      payment.note || "",
    ]);
  });
  styleHeaderRow(payments.getRow(1));
  payments.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      styleBodyRow(row, rowNumber % 2 === 0);
      const amountCell = row.getCell(3);
      amountCell.numFmt = "#,##0.00";
      const dateCell = row.getCell(2);
      dateCell.numFmt = "mm/dd/yyyy hh:mm AM/PM";
    }
  });
  payments.columns = [{ width: 6 }, { width: 22 }, { width: 16 }, { width: 40 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const base = safeExportFileBase(snapshot.title, snapshot.fileBase);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${base}.xlsx`,
  );
}
