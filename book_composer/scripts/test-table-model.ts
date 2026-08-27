import assert from "node:assert/strict";
import {
  addTableColumn,
  addTableRow,
  applyTableMatrix,
  cloneTable,
  createTableBlock,
  mergeCells,
  normalizeTableBlock,
  parseTabularText,
  removeTableColumn,
  removeTableRow,
  resizeTableColumns,
  splitTable,
  tableGrid,
  tableToTsv,
  unmergeCell,
} from "../src/book/tableModel";

const legacy = normalizeTableBlock({
  id: "legacy-table",
  type: "table",
  columns: ["Nome", "Valor"],
  rows: [
    ["A", "1"],
    ["B", "2"],
  ],
});
assert.equal(legacy.tableVersion, 2);
assert.equal(legacy.rows[0]?.kind, "header");
assert.equal(legacy.rows[1]?.cells[1]?.content, "2");

let table = createTableBlock("table-test", 3, 4, true);
assert.equal(table.columns.length, 3);
assert.equal(table.rows.length, 4);
table = addTableRow(table, 2);
assert.equal(table.rows.length, 5);
table = removeTableRow(table, table.rows[2]!.id);
assert.equal(table.rows.length, 4);
table = addTableColumn(table, 1);
assert.equal(table.columns.length, 4);
table = removeTableColumn(table, table.columns[1]!.id);
assert.equal(table.columns.length, 3);

const resized = resizeTableColumns(table, table.columns[0]!.id, 0.12);
assert.ok(
  Math.abs(resized.columns.reduce((sum, column) => sum + (column.width ?? 0), 0) - 1) < 0.0001,
);

const firstRow = resized.rows[0]!;
const merged = mergeCells(resized, new Set([firstRow.cells[0]!.id, firstRow.cells[1]!.id]));
assert.equal(merged.rows[0]!.cells[0]!.colSpan, 2);
const unmerged = unmergeCell(merged, merged.rows[0]!.cells[0]!.id);
assert.equal(unmerged.rows[0]!.cells[0]!.colSpan, undefined);

const matrix = parseTabularText("Nome\tDano\nEspada\t1d8\nArco\t1d6");
assert.deepEqual(matrix, [
  ["Nome", "Dano"],
  ["Espada", "1d8"],
  ["Arco", "1d6"],
]);
const pasted = applyTableMatrix(createTableBlock("paste", 2, 1, true), 0, 0, matrix);
assert.equal(pasted.rows.length, 3);
assert.equal(pasted.rows[2]!.cells[1]!.content, "1d6");
assert.match(tableToTsv(pasted), /Espada\t1d8/);

const clone = cloneTable(pasted, "clone");
assert.notEqual(clone.rows[0]!.cells[0]!.id, pasted.rows[0]!.cells[0]!.id);
assert.deepEqual(tableGrid(clone)[0]![0]!.cell.content, "Nome");

const split = splitTable(pasted, 1);
assert.equal(split.first.rows.length, 2);
assert.equal(split.continuation.rows.length, 1);
assert.equal(split.continuation.continuationHeader?.length, 1);

console.log("table model PASS");
