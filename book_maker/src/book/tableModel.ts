import type {
  TableAlign,
  TableBlock,
  TableBlockV2,
  TableCell,
  TableColumn,
  TableRow,
  TableRowKind,
  TableStyle,
  TableStylePreset,
  TableVerticalAlign,
} from "./types";

const MIN_COLUMN_WIDTH = 0.08;

export const BUILT_IN_TABLE_PRESETS: TableStylePreset[] = [
  {
    id: "kallistis-editorial",
    name: "KALLISTIS — Editorial",
    style: {
      borderMode: "horizontal",
      borderWidth: "0.2mm",
      borderColor: "#17140f66",
      headerBackground: "#17140f",
      headerColor: "#fffdf8",
      headerWeight: 700,
      bodyBackground: "#fffdf8",
      zebra: true,
      zebraBackground: "#eeeae2",
      firstColumnStrong: true,
      cellPaddingX: "2mm",
      cellPaddingY: "1.4mm",
    },
  },
  {
    id: "kallistis-mechanics",
    name: "KALLISTIS — Mecânica",
    style: {
      borderMode: "grid",
      borderWidth: "0.2mm",
      borderColor: "#17140f66",
      headerBackground: "#d9d4ca",
      headerColor: "#17140f",
      headerWeight: 700,
      bodyBackground: "#fffdf8",
      zebra: false,
      firstColumnStrong: true,
      cellPaddingX: "1.5mm",
      cellPaddingY: "1.2mm",
    },
  },
  {
    id: "kallistis-chronology",
    name: "KALLISTIS — Cronologia",
    style: {
      borderMode: "horizontal",
      borderWidth: "0.2mm",
      borderColor: "#17140f66",
      headerBackground: "#d9d4ca",
      headerColor: "#17140f",
      headerWeight: 700,
      bodyBackground: "#fffdf8",
      zebra: true,
      zebraBackground: "#f0ede7",
      firstColumnStrong: true,
      cellPaddingX: "2mm",
      cellPaddingY: "1.4mm",
    },
  },
  {
    id: "kallistis-reference",
    name: "KALLISTIS — Referência",
    style: {
      borderMode: "grid",
      borderWidth: "0.15mm",
      borderColor: "#17140f55",
      headerBackground: "#fffdf8",
      headerColor: "#17140f",
      headerWeight: 700,
      bodyBackground: "#fffdf8",
      zebra: true,
      zebraBackground: "#eeeae2",
      firstColumnStrong: false,
      cellPaddingX: "1.6mm",
      cellPaddingY: "1.2mm",
    },
  },
  {
    id: "kallistis-minimal",
    name: "KALLISTIS — Minimal",
    style: {
      borderMode: "none",
      headerBackground: "transparent",
      headerColor: "#17140f",
      headerWeight: 700,
      bodyBackground: "transparent",
      zebra: false,
      firstColumnStrong: false,
      cellPaddingX: "1.5mm",
      cellPaddingY: "1mm",
    },
  },
];

function childId(tableId: string, kind: string, index: number) {
  return `${tableId}-${kind}-${index + 1}`;
}

function cloneCell(cell: TableCell, id = cell.id): TableCell {
  const next = { ...cell, id };
  if (cell.style) next.style = { ...cell.style };
  else delete next.style;
  return next;
}

function cloneRow(row: TableRow, id = row.id): TableRow {
  const next: TableRow = {
    ...row,
    id,
    cells: row.cells.map((cell) => cloneCell(cell)),
  };
  if (row.style) next.style = { ...row.style };
  else delete next.style;
  return next;
}

function normalizeWidths(columns: TableColumn[]): TableColumn[] {
  const raw = columns.map((column) =>
    Number.isFinite(column.width) && (column.width ?? 0) > 0 ? column.width! : 1 / columns.length,
  );
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return columns.map((column, index) => ({
    ...column,
    width: raw[index]! / total,
    minWidth: column.minWidth ?? MIN_COLUMN_WIDTH,
  }));
}

/** Migra V1 e repara V2 incompleto sem depender do índice como identidade futura. */
export function normalizeTableBlock(block: TableBlock): TableBlockV2 {
  if (
    block.tableVersion !== 2 ||
    !Array.isArray(block.columns) ||
    typeof block.columns[0] === "string"
  ) {
    const legacyColumns = block.columns as string[];
    const legacyRows = block.rows as string[][];
    const columns = legacyColumns.map((label, index) => ({
      id: childId(block.id, "col", index),
      label,
      width: 1 / Math.max(legacyColumns.length, 1),
      minWidth: MIN_COLUMN_WIDTH,
    }));
    const rows = legacyRows.map((values, rowIndex) => ({
      id: childId(block.id, "row", rowIndex),
      kind: rowIndex === 0 ? ("header" as const) : ("body" as const),
      cells: columns.map((column, columnIndex) => ({
        id: `${column.id}-${childId(block.id, "cell", rowIndex * columns.length + columnIndex)}`,
        content: values[columnIndex] ?? "",
      })),
    }));
    return {
      ...block,
      tableVersion: 2,
      columns,
      rows,
      repeatHeader: true,
      allowPageBreak: false,
      style: defaultTableStyle(),
    };
  }

  const v2 = block as TableBlockV2;
  const columns = normalizeWidths(
    v2.columns.map((column, index) => ({
      ...column,
      id: column.id || childId(v2.id, "col", index),
    })),
  );
  const rows = v2.rows.map((row, rowIndex) => ({
    ...row,
    id: row.id || childId(v2.id, "row", rowIndex),
    cells: row.cells.map((cell, cellIndex) => ({
      ...cell,
      id: cell.id || `${v2.id}-cell-${rowIndex + 1}-${cellIndex + 1}`,
      content: cell.content ?? "",
    })),
  }));
  return {
    ...v2,
    columns,
    rows,
    graphics: Array.isArray(v2.graphics) ? v2.graphics : [],
    repeatHeader: v2.repeatHeader ?? true,
    allowPageBreak: v2.allowPageBreak ?? false,
    style: { ...defaultTableStyle(), ...(v2.style ?? {}) },
  };
}

export function defaultTableStyle(): TableStyle {
  return { ...BUILT_IN_TABLE_PRESETS[0]!.style };
}

export function createTableBlock(
  id: string,
  columnCount: number,
  rowCount: number,
  firstRowHeader = true,
): TableBlockV2 {
  const safeColumns = Math.max(1, Math.min(24, Math.floor(columnCount)));
  const safeRows = Math.max(1, Math.min(200, Math.floor(rowCount)));
  const columns = Array.from({ length: safeColumns }, (_, columnIndex) => ({
    id: childId(id, "col", columnIndex),
    label: `Coluna ${String.fromCharCode(65 + (columnIndex % 26))}`,
    width: 1 / safeColumns,
    minWidth: MIN_COLUMN_WIDTH,
  }));
  const rows = Array.from({ length: safeRows }, (_, rowIndex) => ({
    id: childId(id, "row", rowIndex),
    kind: rowIndex === 0 && firstRowHeader ? ("header" as const) : ("body" as const),
    cells: columns.map((column, columnIndex) => ({
      id: `${column.id}-${childId(id, "cell", rowIndex * safeColumns + columnIndex)}`,
      content: rowIndex === 0 && firstRowHeader ? (column.label ?? "") : "",
    })),
  }));
  return {
    id,
    type: "table",
    tableVersion: 2,
    span: "full",
    columns,
    rows,
    style: defaultTableStyle(),
    repeatHeader: firstRowHeader,
    allowPageBreak: false,
  };
}

export function tableHeaderRows(table: TableBlockV2) {
  return table.rows.filter((row) => row.kind === "header");
}

export interface GridCell {
  cell: TableCell;
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  colSpan: number;
}

/** Expande spans apenas para seleção/validação; o modelo continua compacto. */
export function tableGrid(table: TableBlockV2): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]!;
    grid[rowIndex] ??= [];
    let columnIndex = 0;
    for (const cell of row.cells) {
      while (grid[rowIndex]![columnIndex]) columnIndex += 1;
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const gridCell = { cell, rowIndex, columnIndex, rowSpan, colSpan };
      for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
        grid[r] ??= [];
        for (let c = columnIndex; c < columnIndex + colSpan; c += 1) grid[r]![c] = gridCell;
      }
      columnIndex += colSpan;
    }
  }
  return grid;
}

export function updateCell(table: TableBlockV2, cellId: string, content: string): TableBlockV2 {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => (cell.id === cellId ? { ...cell, content } : cell)),
    })),
  };
}

export function addTableRow(
  table: TableBlockV2,
  index = table.rows.length,
  kind: TableRowKind = "body",
) {
  const normalized = normalizeTableBlock(table);
  const insertion = Math.max(0, Math.min(normalized.rows.length, index));
  const rowNumber = normalized.rows.length + 1;
  const row: TableRow = {
    id: `${normalized.id}-row-${rowNumber}-${Date.now().toString(36)}`,
    kind,
    cells: normalized.columns.map((column, columnIndex) => ({
      id: `${normalized.id}-cell-${rowNumber}-${columnIndex + 1}-${Date.now().toString(36)}`,
      content: "",
    })),
  };
  const rows = [...normalized.rows];
  rows.splice(insertion, 0, row);
  return { ...normalized, rows };
}

export function removeTableRow(table: TableBlockV2, rowId: string) {
  if (table.rows.length <= 1) return table;
  return { ...table, rows: table.rows.filter((row) => row.id !== rowId) };
}

export function addTableColumn(table: TableBlockV2, index = table.columns.length) {
  const normalized = normalizeTableBlock(table);
  const insertion = Math.max(0, Math.min(normalized.columns.length, index));
  const width = 1 / (normalized.columns.length + 1);
  const column: TableColumn = {
    id: `${normalized.id}-col-${normalized.columns.length + 1}-${Date.now().toString(36)}`,
    label: `Nova coluna`,
    width,
    minWidth: MIN_COLUMN_WIDTH,
  };
  const columns = [...normalized.columns];
  columns.splice(insertion, 0, column);
  const rows = normalized.rows.map((row) => {
    const cells = [...row.cells];
    cells.splice(insertion, 0, {
      id: `${column.id}-${row.id}`,
      content: "",
    });
    return { ...row, cells };
  });
  return { ...normalized, columns: normalizeWidths(columns), rows };
}

export function removeTableColumn(table: TableBlockV2, columnId: string) {
  if (table.columns.length <= 1) return table;
  const index = table.columns.findIndex((column) => column.id === columnId);
  if (index < 0) return table;
  return {
    ...table,
    columns: normalizeWidths(table.columns.filter((column) => column.id !== columnId)),
    rows: table.rows.map((row) => ({ ...row, cells: row.cells.filter((_, i) => i !== index) })),
  };
}

export function resizeTableColumns(table: TableBlockV2, leftId: string, delta: number) {
  const normalized = normalizeTableBlock(table);
  const index = normalized.columns.findIndex((column) => column.id === leftId);
  if (index < 0 || index === normalized.columns.length - 1) return normalized;
  const next = index + 1;
  const left = normalized.columns[index]!;
  const right = normalized.columns[next]!;
  const leftWidth = Math.max(
    left.minWidth ?? MIN_COLUMN_WIDTH,
    Math.min(0.92, (left.width ?? 0) + delta),
  );
  const rightWidth = Math.max(
    right.minWidth ?? MIN_COLUMN_WIDTH,
    Math.min(0.92, (right.width ?? 0) - delta),
  );
  const actualDelta = leftWidth - (left.width ?? 0);
  const columns = normalized.columns.map((column, i) =>
    i === index
      ? { ...column, width: leftWidth }
      : i === next
        ? {
            ...column,
            width: Math.max(right.minWidth ?? MIN_COLUMN_WIDTH, (right.width ?? 0) - actualDelta),
          }
        : column,
  );
  return { ...normalized, columns: normalizeWidths(columns) };
}

export function setCellsAlign(table: TableBlockV2, cellIds: Set<string>, align: TableAlign) {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => (cellIds.has(cell.id) ? { ...cell, align } : cell)),
    })),
  };
}

export function setCellsVerticalAlign(
  table: TableBlockV2,
  cellIds: Set<string>,
  verticalAlign: TableVerticalAlign,
) {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => (cellIds.has(cell.id) ? { ...cell, verticalAlign } : cell)),
    })),
  };
}

export function moveTableRow(table: TableBlockV2, rowId: string, toIndex: number) {
  const from = table.rows.findIndex((row) => row.id === rowId);
  if (from < 0) return table;
  const rows = [...table.rows];
  const [row] = rows.splice(from, 1);
  rows.splice(Math.max(0, Math.min(rows.length, toIndex)), 0, row!);
  return { ...table, rows };
}

export function moveTableColumn(table: TableBlockV2, columnId: string, toIndex: number) {
  if (table.rows.some((row) => row.cells.some((cell) => (cell.colSpan ?? 1) > 1))) return table;
  const from = table.columns.findIndex((column) => column.id === columnId);
  if (from < 0) return table;
  const columns = [...table.columns];
  const [column] = columns.splice(from, 1);
  const destination = Math.max(0, Math.min(columns.length, toIndex));
  columns.splice(destination, 0, column!);
  const rows = table.rows.map((row) => {
    const cells = [...row.cells];
    const [cell] = cells.splice(from, 1);
    cells.splice(destination, 0, cell!);
    return { ...row, cells };
  });
  return { ...table, columns, rows };
}

export function setCellsStyle(
  table: TableBlockV2,
  cellIds: Set<string>,
  patch: Partial<NonNullable<TableBlockV2["rows"][number]["cells"][number]["style"]>>,
) {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cellIds.has(cell.id) ? { ...cell, style: { ...cell.style, ...patch } } : cell,
      ),
    })),
  };
}

export function mergeCells(table: TableBlockV2, cellIds: Set<string>): TableBlockV2 {
  const grid = tableGrid(table);
  const selected = grid
    .flat()
    .filter(
      (entry, index, all) =>
        cellIds.has(entry.cell.id) &&
        all.findIndex((other) => other.cell.id === entry.cell.id) === index,
    );
  if (selected.length < 2) return table;
  const minRow = Math.min(...selected.map((entry) => entry.rowIndex));
  const maxRow = Math.max(...selected.map((entry) => entry.rowIndex + entry.rowSpan - 1));
  const minCol = Math.min(...selected.map((entry) => entry.columnIndex));
  const maxCol = Math.max(...selected.map((entry) => entry.columnIndex + entry.colSpan - 1));
  const covered = grid
    .slice(minRow, maxRow + 1)
    .flatMap((row) => row.slice(minCol, maxCol + 1))
    .filter(Boolean);
  const unique = new Map(covered.map((entry) => [entry!.cell.id, entry!]));
  if (
    [...unique.values()].some(
      (entry) =>
        entry.rowIndex < minRow ||
        entry.columnIndex < minCol ||
        entry.rowIndex + entry.rowSpan - 1 > maxRow ||
        entry.columnIndex + entry.colSpan - 1 > maxCol,
    )
  )
    return table;
  const anchor = [...unique.values()].sort(
    (a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex,
  )[0]!;
  const ids = new Set([...unique.keys()]);
  const content = [...unique.values()]
    .map((entry) => entry.cell.content)
    .filter(Boolean)
    .join("\n");
  const rows = table.rows.map((row) => ({
    ...row,
    cells: row.cells
      .filter((cell) => !ids.has(cell.id) || cell.id === anchor.cell.id)
      .map((cell) =>
        cell.id === anchor.cell.id
          ? { ...cell, content, colSpan: maxCol - minCol + 1, rowSpan: maxRow - minRow + 1 }
          : cell,
      ),
  }));
  return { ...table, rows };
}

export function unmergeCell(table: TableBlockV2, cellId: string): TableBlockV2 {
  const entry = tableGrid(table)
    .flat()
    .find((item) => item.cell.id === cellId);
  if (!entry || (entry.rowSpan <= 1 && entry.colSpan <= 1)) return table;
  const rows = table.rows.map((row, rowIndex) => {
    if (rowIndex < entry.rowIndex || rowIndex >= entry.rowIndex + entry.rowSpan) return row;
    const cells = row.cells.filter((cell) => cell.id !== cellId);
    let cursor = 0;
    let insertion = cells.length;
    for (let index = 0; index < cells.length; index += 1) {
      if (cursor >= entry.columnIndex) {
        insertion = index;
        break;
      }
      cursor += Math.max(1, cells[index]!.colSpan ?? 1);
    }
    const additions: TableCell[] = [];
    for (let column = 0; column < entry.colSpan; column += 1) {
      if (rowIndex === entry.rowIndex && column === 0) {
        const unmerged = { ...entry.cell };
        delete unmerged.colSpan;
        delete unmerged.rowSpan;
        additions.push(unmerged);
      } else {
        additions.push({
          id: `${cellId}-split-${rowIndex - entry.rowIndex + 1}-${column + 1}`,
          content: "",
        });
      }
    }
    cells.splice(insertion, 0, ...additions);
    return { ...row, cells };
  });
  return { ...table, rows };
}

export function applyTableMatrix(
  table: TableBlockV2,
  rowIndex: number,
  columnIndex: number,
  matrix: string[][],
) {
  let next = table;
  const requiredColumns = columnIndex + Math.max(...matrix.map((row) => row.length), 0);
  while (next.columns.length < requiredColumns) next = addTableColumn(next, next.columns.length);
  while (next.rows.length < rowIndex + matrix.length) next = addTableRow(next, next.rows.length);
  return {
    ...next,
    rows: next.rows.map((row, r) => ({
      ...row,
      cells: row.cells.map((cell, c) => {
        const value = matrix[r - rowIndex]?.[c - columnIndex];
        return value === undefined ? cell : { ...cell, content: value };
      }),
    })),
  };
}

export function parseTabularText(text: string): string[][] {
  const trimmed = text.trim();
  if (!trimmed) return [[]];
  const markdown = trimmed.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
  if (markdown.length >= 2 && markdown[1]!.replace(/[|:\-\s]/g, "") === "") {
    return [markdown[0]!, ...markdown.slice(2)].map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  if (trimmed.includes("\t")) return parseDelimited(trimmed, "\t");
  return parseDelimited(trimmed, trimmed.includes(",") ? "," : "\t");
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

export function tableToTsv(table: TableBlockV2, cellIds?: Set<string>) {
  const grid = tableGrid(table);
  const selected =
    cellIds && cellIds.size > 0 ? cellIds : new Set(grid.flat().map((entry) => entry.cell.id));
  return table.rows
    .map((row, rowIndex) =>
      row.cells
        .filter((cell) => selected.has(cell.id))
        .map((cell) => cell.content.replace(/\t/g, " ").replace(/\r?\n/g, " "))
        .join("\t"),
    )
    .filter((line, rowIndex) => line || rowIndex < table.rows.length)
    .join("\n");
}

export function cloneTable(table: TableBlockV2, newId: string): TableBlockV2 {
  return {
    ...table,
    id: newId,
    columns: table.columns.map((column, index) => ({
      ...column,
      id: childId(newId, "col", index),
    })),
    rows: table.rows.map((row, rowIndex) => ({
      ...row,
      id: childId(newId, "row", rowIndex),
      cells: row.cells.map((cell, cellIndex) => ({
        ...cell,
        id: childId(newId, `cell-${rowIndex}`, cellIndex),
      })),
    })),
    graphics: (table.graphics ?? []).map((graphic, index) => ({
      ...graphic,
      id: childId(newId, "graphic", index),
    })),
  };
}

export function splitTable(table: TableBlockV2, afterRowIndex: number) {
  const splitAt = Math.max(0, Math.min(table.rows.length - 1, afterRowIndex + 1));
  const firstRows = table.rows.slice(0, splitAt);
  const remainingRows = table.rows.slice(splitAt);
  const headers = tableHeaderRows(table);
  const continuation: TableBlockV2 = {
    ...table,
    id: `${table.id}-continuation-${Date.now().toString(36)}`,
    rows: remainingRows,
    continuationOf: table.id,
    continuationIndex: (table.continuationIndex ?? 0) + 1,
  };
  if (table.repeatHeader && headers.length > 0) {
    continuation.continuationHeader = headers.map((row) => cloneRow(row, `${row.id}-continuation`));
  }
  return { first: { ...table, rows: firstRows }, continuation };
}
