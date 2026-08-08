#!/usr/bin/env node
/**
 * Gera provas visuais temporárias a partir da rota real /print.
 * A saída em _review/ nunca é uma fonte editorial do Book Maker.
 */
import { readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const PROJECT_PATH = resolve(ROOT, "projects/kallistis-livro-basico.json");
const REVIEW_ROOT = resolve(ROOT, "_review");
const PAGES_ROOT = resolve(REVIEW_ROOT, "pages");
const BASE_URL = process.env.REVIEW_BASE_URL ?? "http://127.0.0.1:8080";
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: resolve(ROOT, ".."),
  encoding: "utf8",
}).trim();
const generatedAt = new Date().toISOString();

const book = JSON.parse(await readFile(PROJECT_PATH, "utf8"));
const trim = `${book.tokens.pageWidth} × ${book.tokens.pageHeight}`;
const physical = `${addMm(book.tokens.pageWidth, book.tokens.bleed, 2)} × ${addMm(book.tokens.pageHeight, book.tokens.bleed, 2)}`;

function addMm(value, bleed, multiplier) {
  const number = Number.parseFloat(value);
  const bleedNumber = Number.parseFloat(bleed);
  return `${number + bleedNumber * multiplier}mm`;
}

function mdValue(value) {
  return value == null || value === "" ? "—" : String(value);
}

function listIssues(issues) {
  if (issues.length === 0) return "- Nenhuma ocorrência.";
  return issues
    .map(
      (issue) =>
        `- ${issue.rule}: ${issue.description}${issue.element ? ` (${issue.element})` : ""}`,
    )
    .join("\n");
}

function pageReport(page, report, pageIssues) {
  const images = page.blocks.filter((block) => block.type === "image");
  const firstImage = images[0];
  const errors = pageIssues.filter((issue) => issue.severity === "error");
  const warnings = pageIssues.filter((issue) => issue.severity === "warning");
  const infos = pageIssues.filter((issue) => issue.severity === "info");
  return `# ${page.id.replace("p-", "P")} — ${page.title}\n\nSTATUS: RENDERED\n\n## Física\n\nTrim: ${trim}\nBleed: ${book.tokens.bleed}\nPágina física: ${physical}\n\n## Estrutura\n\nTemplate: ${mdValue(page.template)}\nVariant: ${mdValue(page.variant)}\nBlocks: ${page.blocks.length}\n\n## Arte\n\nAsset: ${mdValue(firstImage?.src)}\nFit: ${mdValue(firstImage?.fit)}\nFull bleed: ${firstImage?.fullBleed ? "sim" : "não"}\nEffective PPI: ${firstImage?.effectivePpi ?? "NÃO MEDIDO"}\n\n## Preflight\n\nErrors: ${errors.length}\nWarnings: ${warnings.length}\nInfos: ${infos.length}\n\n### Errors\n\n${listIssues(errors)}\n\n### Warnings\n\n${listIssues(warnings)}\n\n### Infos\n\n${listIssues(infos)}\n\n## Auditoria\n\nSource commit: ${sourceCommit}\nGenerated at: ${generatedAt}\n`;
}

await mkdir(PAGES_ROOT, { recursive: true });
await rm(resolve(REVIEW_ROOT, "INDEX.md"), { force: true });
for (let folio = 1; folio <= 30; folio += 1) {
  await rm(resolve(PAGES_ROOT, `P${String(folio).padStart(3, "0")}`), {
    recursive: true,
    force: true,
  });
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1400, height: 1800 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("review-capture");
    const style = document.createElement("style");
    style.textContent =
      "*, *::before, *::after { animation: none !important; transition: none !important; }";
    document.documentElement.appendChild(style);
  });
  await context.addInitScript((payload) => {
    window.__KALLISTIS_BOOK__ = payload;
  }, book);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/print`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("html[data-print-ready='true']", { timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll(".k-page").length === 280, null, {
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__KALLISTIS_PREFLIGHT__?.book?.pages === 280, null, {
    timeout: 60000,
  });
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.complete
          ? undefined
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const report = await page.evaluate(() => window.__KALLISTIS_PREFLIGHT__);
  const indexRows = [];
  for (let folio = 1; folio <= 30; folio += 1) {
    const id = `p-${String(folio).padStart(3, "0")}`;
    const pageData = book.pages[folio - 1];
    const target = page.locator(`.k-page[data-page-id="${id}"]`);
    if ((await target.count()) !== 1)
      throw new Error(`Página ${id} não encontrada exatamente uma vez.`);
    const outputDir = resolve(PAGES_ROOT, `P${String(folio).padStart(3, "0")}`);
    await mkdir(outputDir, { recursive: true });
    await target.evaluate((element) => {
      element.dataset.reviewOverflow = element.style.overflow;
      element.style.overflow = "hidden";
    });
    await target.screenshot({ path: resolve(outputDir, "preview.png"), animations: "disabled" });
    await target.evaluate((element) => {
      element.style.overflow = element.dataset.reviewOverflow ?? "";
      delete element.dataset.reviewOverflow;
    });
    await writeFile(
      resolve(outputDir, "page.json"),
      `${JSON.stringify({ ...pageData, _review: { generatedAt, sourceCommit, folio } }, null, 2)}\n`,
    );
    const pageIssues = (report?.issues ?? []).filter((issue) => issue.pageId === id);
    await writeFile(resolve(outputDir, "report.md"), pageReport(pageData, report, pageIssues));
    const counts = { error: 0, warning: 0 };
    for (const issue of pageIssues) counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    indexRows.push(
      `| ${id.replace("p-", "P")} | ${pageData.title} | [preview](pages/P${String(folio).padStart(3, "0")}/preview.png) | ${counts.error} | ${counts.warning} | RENDERED |`,
    );
  }
  const summary = report?.summary ?? { errors: 0, warnings: 0, infos: 0 };
  const index = `# KALLISTIS — Revisão Editorial\n\nSource commit: \`${sourceCommit}\`\n\n| Página | Título | Preview | Errors | Warnings | Status |\n|---|---|---|---:|---:|---|\n${indexRows.join("\n")}\n\nPreflight global: ${summary.errors} errors, ${summary.warnings} warnings, ${summary.infos} infos.\n`;
  await writeFile(resolve(REVIEW_ROOT, "INDEX.md"), index);
  console.log(`Generated P001–P030 from ${sourceCommit}`);
  console.log(
    `Preflight: ${summary.errors} errors, ${summary.warnings} warnings, ${summary.infos} infos`,
  );
} finally {
  await browser.close();
}
