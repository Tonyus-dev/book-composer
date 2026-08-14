#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const reportPath = path.resolve(import.meta.dirname, "../projects/kallistis-materializado-historia-v5.report.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
const requiredZero = [
  "MANUSCRIPT_TEXT_CHANGED",
  "SOURCE_BLOCK_TEXT_MISMATCHES",
  "SOURCE_WORDS_LOST",
  "SOURCE_WORDS_ADDED",
  "MANUSCRIPT_BLOCKS_LOST",
  "MANUSCRIPT_BLOCKS_DUPLICATED",
  "DUPLICATE_FRAGMENT_OCCURRENCES",
  "FRAGMENT_SEQUENCE_ERRORS",
  "INVALID_IMAGE_PLACEMENTS",
  "PAGE_OVERFLOW",
  "ORPHAN_HEADINGS",
  "BROKEN_TABLE_ROWS",
  "SOURCE_ORDER_CHANGED",
  "ASSETS_MODIFIED",
  "ORIGINAL_PROJECT_OVERWRITTEN",
];
const failures = requiredZero.filter((key) => report.diagnostics[key] !== 0);
const shapeFailures = [
  ...(report.scope !== "HISTORIA" ? ["SCOPE"] : []),
  ...(report.output?.project?.endsWith("kallistis-materializado-historia-v5.json") ? [] : ["OUTPUT_NOT_V5"]),
  ...(report.visualGate?.compositionFamiliesUsed >= 3 ? [] : ["INSUFFICIENT_COMPOSITION_FAMILIES"]),
];
if (failures.length || shapeFailures.length || report.verdict !== "PASS") {
  console.error(JSON.stringify({ verdict: "FAIL", scope: report.scope, failures, shapeFailures, diagnostics: report.diagnostics }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ verdict: "PASS", scope: report.scope, pages: report.diagnostics.TOTAL_PAGES, checked: requiredZero, compositionFamilies: report.visualGate.compositionFamiliesUsed, semanticImages: { invalid: report.diagnostics.INVALID_IMAGE_PLACEMENTS, bodyMaxTextRun: report.diagnostics.BODY_MAX_CONSECUTIVE_TEXT_PAGES } }, null, 2));
