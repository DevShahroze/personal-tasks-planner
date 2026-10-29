import { randomUUID } from "@/lib/uuid";

const BLOCK_TYPES = new Set(["checkbox", "radioGroup", "table"]);

function sanitizeString(value, max = 5000) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).slice(0, max);
}

function validateCheckboxBlock(block) {
  return {
    id: block.id,
    type: "checkbox",
    label: sanitizeString(block.label, 2000),
    checked: Boolean(block.checked),
  };
}

function validateRadioGroupBlock(block) {
  const options = Array.isArray(block.options) ? block.options : [];
  const normalizedOptions = options.slice(0, 50).map((opt) => ({
    id: opt.id || randomUUID(),
    label: sanitizeString(opt.label, 500),
  }));

  let selectedOptionId = block.selectedOptionId || null;
  if (selectedOptionId && !normalizedOptions.some((o) => o.id === selectedOptionId)) {
    selectedOptionId = null;
  }

  return {
    id: block.id,
    type: "radioGroup",
    groupLabel: sanitizeString(block.groupLabel, 500),
    options: normalizedOptions,
    selectedOptionId,
  };
}

function validateTableBlock(block) {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const normalizedColumns = columns.slice(0, 20).map((col) => ({
    id: col.id || randomUUID(),
    label: sanitizeString(col.label, 200),
  }));

  const columnIds = new Set(normalizedColumns.map((c) => c.id));
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const normalizedRows = rows.slice(0, 200).map((row) => {
    const rowId = row.id || randomUUID();
    const cells = Array.isArray(row.cells) ? row.cells : [];
    const normalizedCells = cells
      .filter((cell) => columnIds.has(cell.columnId))
      .slice(0, normalizedColumns.length * 2)
      .map((cell) => ({
        columnId: cell.columnId,
        value: sanitizeString(cell.value, 2000),
      }));

    for (const col of normalizedColumns) {
      if (!normalizedCells.some((c) => c.columnId === col.id)) {
        normalizedCells.push({ columnId: col.id, value: "" });
      }
    }

    return { id: rowId, cells: normalizedCells };
  });

  return {
    id: block.id,
    type: "table",
    columns: normalizedColumns,
    rows: normalizedRows,
  };
}

export function validateContentBlocks(input) {
  if (input === undefined || input === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(input)) {
    return { ok: false, error: "contentBlocks must be an array" };
  }

  if (input.length > 100) {
    return { ok: false, error: "Too many content blocks" };
  }

  const result = [];

  for (const block of input) {
    if (!block || typeof block !== "object") {
      return { ok: false, error: "Invalid content block" };
    }

    if (!block.id || typeof block.id !== "string") {
      return { ok: false, error: "Each content block requires a stable id" };
    }

    if (!BLOCK_TYPES.has(block.type)) {
      return { ok: false, error: `Invalid block type: ${block.type}` };
    }

    if (block.type === "checkbox") {
      result.push(validateCheckboxBlock(block));
    } else if (block.type === "radioGroup") {
      result.push(validateRadioGroupBlock(block));
    } else if (block.type === "table") {
      result.push(validateTableBlock(block));
    }
  }

  return { ok: true, value: result };
}

export function createEmptyCheckboxBlock() {
  return {
    id: randomUUID(),
    type: "checkbox",
    label: "Checkbox item",
    checked: false,
  };
}

export function createEmptyRadioGroupBlock() {
  const opt1 = randomUUID();
  const opt2 = randomUUID();
  return {
    id: randomUUID(),
    type: "radioGroup",
    groupLabel: "Radio group",
    options: [
      { id: opt1, label: "Option 1" },
      { id: opt2, label: "Option 2" },
    ],
    selectedOptionId: null,
  };
}

export function createEmptyTableBlock() {
  const col1 = randomUUID();
  const col2 = randomUUID();
  const row1 = randomUUID();
  return {
    id: randomUUID(),
    type: "table",
    columns: [
      { id: col1, label: "Column 1" },
      { id: col2, label: "Column 2" },
    ],
    rows: [
      {
        id: row1,
        cells: [
          { columnId: col1, value: "" },
          { columnId: col2, value: "" },
        ],
      },
    ],
  };
}
