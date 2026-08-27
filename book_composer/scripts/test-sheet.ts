import assert from "node:assert/strict";
import {
  createKallistisCharacterSheet,
  cloneSheetForInsert,
  normalizeSheet,
} from "../src/book/sheetModel";
import { evaluateSheetFormula, evaluateSheetFormulas } from "../src/book/sheetFormula";

assert.equal(evaluateSheetFormula("2 + 3 * 2", {}).value, 8);
assert.equal(evaluateSheetFormula("base + (bonus * 2)", { base: 4, bonus: 3 }).value, 10);
assert.equal(evaluateSheetFormula("base / 0", { base: 4 }).error, "invalid");

const calculated = evaluateSheetFormulas(
  { total: "base + bonus", doubled: "total * 2" },
  { base: 4, bonus: 3 },
);
assert.equal(calculated.values.total, 7);
assert.equal(calculated.values.doubled, 14);
const cycle = evaluateSheetFormulas({ first: "second + 1", second: "first + 1" }, {});
assert.equal(cycle.errors.first, "cycle");

const sheet = createKallistisCharacterSheet("fixture");
assert.equal(sheet.pages.length, 2);
assert.ok(
  sheet.pages.flatMap((page) => page.elements).some((element) => element.type === "number-field"),
);
assert.ok(
  sheet.pages.flatMap((page) => page.elements).some((element) => element.type === "checkbox"),
);
const clone = cloneSheetForInsert(sheet, "copy");
assert.notEqual(clone.id, sheet.id);
assert.notEqual(clone.pages[0]?.elements[0]?.id, sheet.pages[0]?.elements[0]?.id);
assert.equal(normalizeSheet(clone).pages.length, 2);
console.log("sheet model/formula smoke: ok");
