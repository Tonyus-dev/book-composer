import type { Book } from "../../book/types";
import { staticIssues } from "./static-rules";
import {
  PREFLIGHT_RULES,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  summarize,
  type PreflightIssue,
  type PreflightReport,
} from "./types";

/** hash estável (FNV-1a) do JSON: mesmo livro → mesmo relatório */
export function fingerprint(book: Book): string {
  const json = JSON.stringify(book);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, "0")}-${json.length.toString(16)}`;
}

function sortIssues(book: Book, issues: PreflightIssue[]): PreflightIssue[] {
  const order = new Map(book.pages.map((page, index) => [page.id, index]));
  return [...issues].sort((a, b) => {
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severity !== 0) return severity;
    const pageA = a.pageId ? (order.get(a.pageId) ?? 9999) : -1;
    const pageB = b.pageId ? (order.get(b.pageId) ?? 9999) : -1;
    if (pageA !== pageB) return pageA - pageB;
    return a.rule.localeCompare(b.rule) || a.element.localeCompare(b.element);
  });
}

export function buildReport(
  book: Book,
  measured: PreflightIssue[] = [],
  options: { measured?: boolean; generatedAt?: string } = {},
): PreflightReport {
  const issues = sortIssues(book, [...staticIssues(book), ...measured]);
  return {
    schemaVersion: 1,
    tool: "KALLISTIS BOOK BUILDER · preflight",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    book: {
      title: book.meta.title,
      edition: book.meta.edition,
      pages: book.pages.length,
      firstFolio: book.meta.firstFolio,
      fingerprint: fingerprint(book),
    },
    measured: options.measured ?? measured.length > 0,
    summary: summarize(issues),
    issues,
  };
}

export function reportToJson(report: PreflightReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Relatório autocontido para auditoria da edição (abre em qualquer browser). */
export function reportToHtml(report: PreflightReport): string {
  const rows = report.issues
    .map(
      (issue) => `      <tr class="sev sev--${issue.severity}">
        <td class="badge">${SEVERITY_LABEL[issue.severity]}</td>
        <td class="folio">${issue.folio ?? "—"}</td>
        <td>${escapeHtml(PREFLIGHT_RULES[issue.rule].label)}<br><code>${issue.rule}</code></td>
        <td>${escapeHtml(issue.element)}${issue.blockId ? `<br><code>${escapeHtml(issue.blockId)}</code>` : ""}</td>
        <td>${escapeHtml(issue.description)}</td>
        <td class="hint">${escapeHtml(issue.inspection)}</td>
      </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Preflight · ${escapeHtml(report.book.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 32px; font: 14px/1.5 "Liberation Sans", Arial, sans-serif; background: #f4f1ea; color: #17140f; }
  h1 { font-size: 20px; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 4px; }
  .meta { color: #6b6459; margin-bottom: 20px; font-size: 12px; }
  .summary { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .chip { border: 1px solid #17140f22; padding: 8px 14px; border-radius: 2px; background: #fffdf8; }
  .chip strong { font-size: 20px; display: block; }
  table { width: 100%; border-collapse: collapse; background: #fffdf8; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #17140f14; vertical-align: top; }
  th { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: #6b6459; }
  code { font: 11px/1.4 ui-monospace, monospace; color: #6b6459; }
  .badge { font-weight: 700; font-size: 11px; letter-spacing: .06em; white-space: nowrap; }
  .sev--error .badge { color: #8c1c13; }
  .sev--warning .badge { color: #8a5a12; }
  .sev--info .badge { color: #2c5566; }
  .folio { font-variant-numeric: tabular-nums; }
  .hint { color: #6b6459; }
  .empty { padding: 24px; background: #fffdf8; }
</style>
</head>
<body>
  <h1>Preflight editorial — ${escapeHtml(report.book.title)}</h1>
  <p class="meta">
    ${escapeHtml(report.book.edition)} · ${report.book.pages} páginas · primeiro fólio ${report.book.firstFolio}<br>
    gerado em ${escapeHtml(report.generatedAt)} · fingerprint <code>${escapeHtml(report.book.fingerprint)}</code>
    · ${report.measured ? "com medições de layout" : "somente regras estáticas"}
  </p>
  <div class="summary">
    <div class="chip"><strong>${report.summary.errors}</strong>Errors</div>
    <div class="chip"><strong>${report.summary.warnings}</strong>Warnings</div>
    <div class="chip"><strong>${report.summary.infos}</strong>Info</div>
  </div>
  ${
    report.issues.length === 0
      ? `<p class="empty">Nenhuma ocorrência registrada.</p>`
      : `<table>
    <thead>
      <tr><th>Sev.</th><th>Fólio</th><th>Regra</th><th>Elemento</th><th>Descrição</th><th>Inspeção sugerida</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>`
  }
</body>
</html>
`;
}
