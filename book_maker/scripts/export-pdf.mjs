#!/usr/bin/env node
/**
 * KALLISTIS BOOK BUILDER — exportação de PDF reprodutível.
 *
 * Uso:
 *   bun run export:pdf                          # usa o demo-book da rota /print
 *   bun run export:pdf -- --in book.json        # exporta a partir de um JSON
 *   bun run export:pdf -- --in book.json --out dist/export/livro.pdf
 *   bun run export:pdf -- --url http://localhost:8080
 *   bun run export:pdf -- --in book.json --force        # exporta mesmo com ERROR
 *   bun run export:pdf -- --no-report                   # não grava preflight-report.*
 *
 * O PDF sai 1:1 com os tokens físicos do livro (preferCSSPageSize + @page).
 * PREFLIGHT: se o livro tiver ERROR, a exportação de produção para e explica.
 */
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function parseArgs(argv) {
  const args = {
    out: "dist/export/kallistis-book.pdf",
    url: "http://localhost:8080",
    timeout: 120000,
    force: false,
    report: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--in" || key === "-i") ((args.in = value), (i += 1));
    else if (key === "--out" || key === "-o") ((args.out = value), (i += 1));
    else if (key === "--url") ((args.url = value), (i += 1));
    else if (key === "--timeout") ((args.timeout = Number(value)), (i += 1));
    else if (key === "--force" || key === "-f") args.force = true;
    else if (key === "--no-report") args.report = false;
  }
  return args;
}

/** Relatório HTML mínimo para auditoria fora do editor. */
function reportHtml(report) {
  const escape = (value) =>
    String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = report.issues
    .map(
      (issue) =>
        `<tr><td>${issue.severity.toUpperCase()}</td><td>${issue.folio ?? "—"}</td><td>${escape(
          issue.rule,
        )}</td><td>${escape(issue.element)}</td><td>${escape(issue.description)}</td><td>${escape(
          issue.inspection,
        )}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Preflight · ${escape(
    report.book.title,
  )}</title><style>body{font:14px/1.5 Arial,sans-serif;padding:32px;background:#f4f1ea;color:#17140f}table{border-collapse:collapse;width:100%;background:#fffdf8;font-size:13px}th,td{border-bottom:1px solid #17140f22;padding:8px;text-align:left;vertical-align:top}</style></head><body><h1>Preflight — ${escape(
    report.book.title,
  )}</h1><p>${report.summary.errors} Errors · ${report.summary.warnings} Warnings · ${
    report.summary.infos
  } Info · fingerprint ${escape(report.book.fingerprint)} · ${escape(
    report.generatedAt,
  )}</p><table><thead><tr><th>Sev.</th><th>Fólio</th><th>Regra</th><th>Elemento</th><th>Descrição</th><th>Inspeção</th></tr></thead><tbody>${rows}</tbody></table></body></html>\n`;
}

async function isUp(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await isUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureServer(url, timeout) {
  if (await isUp(url)) return null;
  console.log("[export:pdf] servidor não encontrado, iniciando vite dev…");
  const child = spawn("npx", ["vite", "dev", "--port", new URL(url).port || "8080"], {
    stdio: "ignore",
    detached: false,
  });
  const ok = await waitForServer(url, timeout);
  if (!ok) {
    child.kill("SIGKILL");
    throw new Error(`Servidor não respondeu em ${url}`);
  }
  return child;
}

/**
 * O Chromium do Playwright pode estar instalado em uma versão diferente da
 * esperada pelo pacote (ambientes gerenciados). Procuramos um binário válido
 * antes de falhar, e respeitamos CHROMIUM_PATH quando definido.
 */
async function findChromium() {
  const explicit = process.env["CHROMIUM_PATH"];
  if (explicit) return explicit;
  const root = process.env["PLAYWRIGHT_BROWSERS_PATH"] || "/opt/ms-playwright";
  const candidates = [
    ["chromium", "chrome-linux", "chrome"],
    ["chromium_headless_shell", "chrome-linux", "headless_shell"],
    ["chromium_headless_shell", "chrome-headless-shell-linux64", "chrome-headless-shell"],
  ];
  let dirs = [];
  try {
    dirs = await readdir(root);
  } catch {
    return undefined;
  }
  for (const [prefix, ...rest] of candidates) {
    for (const dir of dirs.filter((d) => d.startsWith(`${prefix}-`))) {
      const candidate = path.join(root, dir, ...rest);
      try {
        await access(candidate);
        return candidate;
      } catch {
        /* tenta o próximo */
      }
    }
  }
  return undefined;
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const executablePath = await findChromium();
    if (!executablePath) throw error;
    console.log(`[export:pdf] usando Chromium em ${executablePath}`);
    return chromium.launch({ headless: true, executablePath });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const book = args.in ? JSON.parse(await readFile(path.resolve(args.in), "utf8")) : null;
  if (book && !Array.isArray(book.pages)) {
    throw new Error("JSON inválido: campo 'pages' ausente.");
  }

  const server = await ensureServer(args.url, args.timeout);
  const browser = await launchChromium();

  try {
    const context = await browser.newContext({
      viewport: { width: 1240, height: 1754 },
      deviceScaleFactor: 1,
      // Render determinístico: sem animação, sem locale/timezone variável.
      reducedMotion: "reduce",
      locale: "pt-BR",
      timezoneId: "UTC",
      colorScheme: "light",
    });
    const page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() === "error") console.warn("[print]", message.text());
    });

    if (book) {
      await page.addInitScript((payload) => {
        window.__KALLISTIS_BOOK__ = payload;
      }, book);
    }

    await page.goto(`${args.url}/print`, { waitUntil: "domcontentloaded", timeout: args.timeout });
    await page.waitForSelector("html[data-print-ready='true']", { timeout: args.timeout });
    await page.waitForSelector(".k-page", { timeout: args.timeout });
    await page.emulateMedia({ media: "print" });
    // Força o download das faces editoriais antes do PDF: fontes "unloaded"
    // fazem o Chromium imprimir com fallback e quebram a reprodutibilidade.
    await page.evaluate(async () => {
      const families = ["EB Garamond"];
      const weights = ["400", "500", "600", "700"];
      const styles = ["normal", "italic"];
      await Promise.all(
        families.flatMap((family) =>
          weights.flatMap((weight) =>
            styles.map((style) =>
              document.fonts.load(`${style} ${weight} 16px "${family}"`).catch(() => undefined),
            ),
          ),
        ),
      );
      await document.fonts.ready;
    });

    const pages = await page.locator(".k-page").count();

    /* PREFLIGHT antes do PDF: a rota /print publica o relatório estático. */
    const report = await page.evaluate(() => window.__KALLISTIS_PREFLIGHT__ ?? null);
    const outPathEarly = path.resolve(args.out);
    await mkdir(path.dirname(outPathEarly), { recursive: true });
    if (report) {
      const { errors, warnings, infos } = report.summary;
      console.log(
        `[export:pdf] preflight: ${errors} Errors · ${warnings} Warnings · ${infos} Info`,
      );
      if (args.report) {
        const dir = path.dirname(outPathEarly);
        await writeFile(
          path.join(dir, "preflight-report.json"),
          `${JSON.stringify(report, null, 2)}\n`,
          "utf8",
        );
        await writeFile(path.join(dir, "preflight-report.html"), reportHtml(report), "utf8");
        console.log(`[export:pdf] relatórios em ${dir}/preflight-report.{json,html}`);
      }
      if (errors > 0 && !args.force) {
        for (const issue of report.issues.filter((i) => i.severity === "error")) {
          console.error(
            `  ERROR · fólio ${issue.folio ?? "—"} · ${issue.rule} · ${issue.element}: ${issue.description}`,
          );
        }
        throw new Error(
          `Exportação de produção interrompida: ${errors} ERROR(S) no preflight. Repita com --force para exportar mesmo assim.`,
        );
      }
    }

    // Tamanho físico derivado dos tokens do livro (trim + 2 x bleed).
    // Injetamos @page nomeadas (single vs spread) para que o Chromium respeite
    // tanto folhas unitárias quanto spreads editoriais de largura dupla.
    const size = await page.evaluate(() => {
      const root = document.querySelector(".k-book");
      if (!root) return null;
      const s = getComputedStyle(root);
      const numeric = (value) => {
        const match = String(value)
          .trim()
          .match(/^(-?[0-9.]+)([a-z]+)?$/);
        return match ? { n: parseFloat(match[1]), u: match[2] || "mm" } : null;
      };
      const w = numeric(s.getPropertyValue("--page-width"));
      const h = numeric(s.getPropertyValue("--page-height"));
      const b = numeric(s.getPropertyValue("--bleed"));
      if (!w || !h || !b) return null;
      if (w.u !== b.u || h.u !== b.u) return null;
      return {
        width: `${w.n + 2 * b.n}${w.u}`,
        height: `${h.n + 2 * b.n}${h.u}`,
        spreadWidth: `${2 * w.n + 2 * b.n}${w.u}`,
      };
    });
    if (size) {
      await page.addStyleTag({
        content: `@page single { size: ${size.width} ${size.height}; margin: 0; }\n@page spread { size: ${size.spreadWidth} ${size.height}; margin: 0; }`,
      });
    }

    const outPath = outPathEarly;

    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      tagged: false,
    });

    console.log(
      `[export:pdf] ${pages} páginas · folha ${size?.width ?? "?"} x ${size?.height ?? "?"} → ${outPath}`,
    );
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error("[export:pdf]", error.message ?? error);
  process.exit(1);
});
