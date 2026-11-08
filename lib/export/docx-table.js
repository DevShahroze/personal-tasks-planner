import {
  BorderStyle,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  TableLayoutType,
} from "docx";

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "B8C4CE",
};

const CELL_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
};

export function buildDocxTable(headers, rows, columnWidthsPct) {
  const widths =
    columnWidthsPct?.length === headers.length
      ? columnWidthsPct
      : headers.map(() => Math.floor(100 / headers.length));

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (header, index) =>
        new TableCell({
          width: { size: widths[index], type: WidthType.PERCENTAGE },
          borders: CELL_BORDERS,
          shading: { fill: "1E3A5F" },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: header, bold: true, color: "FFFFFF", size: 22 }),
              ],
            }),
          ],
        }),
    ),
  });

  const bodyRows = rows.map(
    (cells, rowIndex) =>
      new TableRow({
        children: cells.map(
          (value, index) =>
            new TableCell({
              width: { size: widths[index], type: WidthType.PERCENTAGE },
              borders: CELL_BORDERS,
              shading: rowIndex % 2 === 1 ? { fill: "F4F7FB" } : undefined,
              margins: { top: 90, bottom: 90, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(value ?? "—"), size: 22 })],
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}
