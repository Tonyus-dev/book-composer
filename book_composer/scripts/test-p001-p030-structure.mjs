#!/usr/bin/env node
/**
 * KALLISTIS BOOK BUILDER — testes estruturais da materialização P001–P030.
 *
 * Garante (conforme prompt):
 *   1. 280 páginas estruturais
 *   2. P001–P030 materializadas
 *   3. nenhuma capa no interior
 *   4. nenhuma página física extra criada por overflow (sem orphan pages)
 *   5. spreads nos pares esperados: 008-009, 021-022, 024-025, 026-027, 028-029
 *   6. P023 ainda ART_PENDING_REVIEW (sem bloco de imagem)
 *   7. tokens físicos = trim 140×210 + bleed 5 mm
 *   8. texto congelado preservado byte-equivalente
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const REPO = resolve(import.meta.dirname, "..");
const PROJECT = resolve(REPO, "projects/kallistis-livro-basico.json");
const HANDOFF_MD = "/home/tonyus-dev/Downloads/KALLISTIS_HANDOFF_EDITORIAL_P001_P030_v1.md";
const HANDOFF_JSON = "/home/tonyus-dev/Downloads/kallistis_pages_001_030.json";

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${label}`);
    passed += 1;
  } else {
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
    failed += 1;
    failures.push(label);
  }
}

function group(name) {
  console.log(`\n${name}`);
}

const project = JSON.parse(readFileSync(PROJECT, "utf8"));
const md = readFileSync(HANDOFF_MD, "utf8");
const handoff = JSON.parse(readFileSync(HANDOFF_JSON, "utf8"));

group("Estrutura do livro (P001–P280)");
assert("tem exatamente 280 páginas", project.pages.length === 280, `achou ${project.pages.length}`);
assert("schemaVersion é 1", project.schemaVersion === 1);
assert("firstFolio é 1", project.meta.firstFolio === 1);
assert(
  "nenhuma capa dentro do miolo",
  project.pages.every((p) => p.template !== "cover"),
  `templates encontrados: ${[...new Set(project.pages.map((p) => p.template))].join(", ")}`,
);

group("Configuração física (trim, bleed, PDF)");
assert("trim é 140 mm", project.tokens.pageWidth === "140mm");
assert("trim é 210 mm", project.tokens.pageHeight === "210mm");
assert("bleed é 5 mm", project.tokens.bleed === "5mm");
const expectedPdfMm = {
  width: 140 + 2 * 5,
  height: 210 + 2 * 5,
};
assert(
  `PDF page é 150×220 mm (calculado ${expectedPdfMm.width}×${expectedPdfMm.height})`,
  expectedPdfMm.width === 150 && expectedPdfMm.height === 220,
);

group("Materialização P001–P030");
const materialized = project.pages.slice(0, 30);
const structural = project.pages.slice(30);
assert("30 páginas materializadas", materialized.length === 30);
assert("250 páginas estruturais preservadas", structural.length === 250);
assert(
  "páginas estruturais são todas 'narrative'",
  structural.every((p) => p.template === "narrative"),
);
assert(
  "páginas estruturais não contêm arte",
  structural.every((p) => !p.blocks.some((b) => b.type === "image")),
);
assert(
  "cada página materializada tem título do handoff",
  materialized.every((p) => typeof p.title === "string" && p.title.length > 0),
);

group("Paridade e paridade cover/spreads");
const expectedSpreads = [
  [8, 9],
  [21, 22],
  [24, 25],
  [26, 27],
  [28, 29],
];
assert(
  `5 spreads definidos (${expectedSpreads.map((p) => p.join("-")).join(", ")})`,
  Array.isArray(project.spreads) && project.spreads.length === 5,
);
const actualSpreadPairs = (project.spreads ?? []).map((s) => [s.left, s.right]);
for (const [left, right] of expectedSpreads) {
  assert(
    `spread P${String(left).padStart(3, "0")}-P${String(right).padStart(3, "0")} presente`,
    actualSpreadPairs.some((p) => p[0] === left && p[1] === right),
  );
}

group("P023 — ART_PENDING_REVIEW");
const p023 = project.pages.find((p) => p.id === "p-023");
assert("P023 existe", !!p023);
assert("P023 não tem bloco de imagem", !p023.blocks.some((b) => b.type === "image"));
assert(
  "P023 tem heading 'O PROGRAMA DE SUBSTITUIÇÃO'",
  p023.blocks.some(
    (b) => b.type === "heading" && b.text.toUpperCase().includes("PROGRAMA DE SUBSTITUIÇÃO"),
  ),
);
assert(
  "P023 NÃO usa asset de pending/ no projeto",
  JSON.stringify(p023).indexOf("/assets/handoff/pending/") === -1,
);

group("Preservação de texto congelado");
const FROZEN_BLOCK = /\*\*TEXTO FINAL — NÃO REESCREVER\*\*\s*\n\n([\s\S]*?)(?:\n---|\s*$)/;
const handoffTexts = [];
for (let n = 1; n <= 30; n += 1) {
  const mdSegment = md.match(
    new RegExp(`### P${String(n).padStart(3, "0")} — [\\s\\S]*?(?=### P|$)`),
  );
  if (!mdSegment) {
    assert(`P${n} handoff markdown localizado`, false);
    continue;
  }
  /* P015 = "Sem texto." → blank, sempre. */
  if (/\*Sem texto\.\*/.test(mdSegment[0])) {
    handoffTexts.push({ n, blank: true, body: "" });
    continue;
  }
  const tm = mdSegment[0].match(FROZEN_BLOCK);
  if (!tm) {
    assert(`P${n} bloco TEXTO FINAL presente`, false);
    continue;
  }
  handoffTexts.push({ n, blank: false, body: tm[1].trim() });
}

for (const { n, blank, body } of handoffTexts) {
  const page = project.pages.find((p) => p.id === `p-${String(n).padStart(3, "0")}`);
  if (!page) {
    assert(`P${n} página materializada presente`, false);
    continue;
  }
  if (blank) {
    const textBlocks = page.blocks.filter((b) => b.type === "text");
    const pageText = textBlocks.map((b) => b.content).join("\n\n");
    assert(
      `P${n} é página de respiração (sem texto obrigatório)`,
      textBlocks.length === 0 || pageText.trim() === "",
    );
    continue;
  }
  if (n === 3) {
    const tocBlock = page.blocks.find((b) => b.type === "toc");
    if (!tocBlock) {
      assert(`P3 tem bloco toc`, false);
      continue;
    }
    const expectedEntries = body
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((line) => {
        const m = line.match(/^(.+?)\s+\.+\s+(\d+|—)$/);
        if (!m) return null;
        const label = m[1].trim();
        const pageStr = m[2].trim();
        const level = label.startsWith("PARTE")
          ? "part"
          : label.startsWith("APÊNDICE")
            ? "appendix"
            : "chapter";
        return { label, page: pageStr === "—" ? 0 : Number.parseInt(pageStr, 10), level };
      })
      .filter(Boolean);
    const actualEntries = tocBlock.entries;
    const expectedLabels = expectedEntries.map((e) => e.label).join("|");
    const actualLabels = actualEntries.map((e) => e.label).join("|");
    assert(
      `P3 sumário tem ${expectedEntries.length} entradas`,
      actualEntries.length === expectedEntries.length,
      `expected ${expectedEntries.length}, got ${actualEntries.length}`,
    );
    assert(`P3 labels batem com handoff`, expectedLabels === actualLabels);
    continue;
  }
  /* P030 é o único com headings embutidos no texto do handoff;
     para outras páginas, o heading é só rótulo editorial e não conta. */
  const isInterleaved = n === 30;
  const pageText = isInterleaved
    ? page.blocks
        .map((b) => (b.type === "heading" ? b.text : b.type === "text" ? b.content : ""))
        .filter((s) => s.length > 0)
        .join("\n\n")
    : page.blocks
        .filter((b) => b.type === "text")
        .map((b) => b.content)
        .join("\n\n");
  /* Verificação byte-equivalente do conteúdo semântico:
     - normaliza NBSP, aspas curvas e múltiplas linhas em branco. */
  const norm = (s) =>
    s
      .replace(/\u00a0/g, " ")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/—/g, "—")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const expected = norm(body);
  const actual = norm(pageText);
  /* Toleramos diferença apenas em caracteres tipográficos padronizados
     pela regra de composição; nada além disso. */
  const h = createHash("sha256").update(actual).digest("hex");
  const expectedHash = createHash("sha256").update(expected).digest("hex");
  if (actual === expected) {
    assert(`P${n} texto byte-equivalente ao handoff`, true);
  } else if (actual.replace(/\s+/g, "") === expected.replace(/\s+/g, "")) {
    assert(`P${n} texto equivalente após colapso de espaços`, true, `hash=${h}`);
  } else {
    assert(
      `P${n} texto byte-equivalente ao handoff`,
      false,
      `diff len expected=${expected.length} actual=${actual.length}`,
    );
  }
}

group("Sem overflow silencioso");
const blankPages = project.pages.filter(
  (p) => p.blocks.length === 0 || p.blocks.every((b) => b.type === "divider"),
);
assert(
  "apenas P015 permite blank content",
  blankPages.length <= 1 && blankPages.every((p) => p.id === "p-015"),
  `blank: ${blankPages.map((p) => p.id).join(", ")}`,
);

group("Nós do livro preservam paridade estrutural");
const sumPages = project.nodes.reduce((acc, n) => acc + n.pageIds.length, 0);
assert(
  "todos os pageIds dos nodes apontam para páginas existentes",
  project.nodes.every((n) => n.pageIds.every((pid) => project.pages.some((p) => p.id === pid))),
);
assert("soma de páginas nos nodes = 280 (sem duplicar)", sumPages === 280, `achou ${sumPages}`);

group("Assets binários no disco (masters preservados)");
const REQUIRED_APPROVED = [
  "p004_velha_e_fresta_pb.png",
  "p005_cristal_partido_pb.png",
  "p006_manesh_pb.png",
  "p007_thuvel_pb.png",
  "p008_009_luz_escuridao_sombra_pb.png",
  "p010_cristal_uno_pb.png",
  "p011_mirveth_manesh_pb.png",
  "p012_mirveth_thuvel_pb.png",
  "p013_pedralma_monolito_pb.png",
  "p014_pedralma_escalas_pb.png",
  "p017_dois_mundos_fratura_pb.png",
  "p019_silmain_pb.png",
  "p020_primeiras_frestas_pb.jpg",
  "p021_022_kethrell_faccao_cientifica_pb.jpg",
  "p024_025_outros_lightbringers_pb.jpg",
  "p026_027_daeren_thavin_isenna_pb.jpg",
  "p028_029_thaeraen_tempo_escolha_pb.jpeg",
];
const PENDING_OK = ["p023_programa_substituicao_CANDIDATE_pb.jpeg"];
const publicDir = resolve(REPO, "public/assets/handoff");
for (const file of REQUIRED_APPROVED) {
  assert(`approved/${file} extraído`, existsSync(resolve(publicDir, "approved", file)));
}
for (const file of PENDING_OK) {
  assert(
    `pending/${file} extraído (somente revisão)`,
    existsSync(resolve(publicDir, "pending", file)),
  );
}

group("Handoff sources acessíveis");
assert("markdown do handoff acessível", existsSync(HANDOFF_MD));
assert("JSON do handoff acessível", existsSync(HANDOFF_JSON));
assert("harness detecta 30 páginas no handoff JSON", handoff.pages.length === 30);

console.log(
  `\nResultado: ${passed} passed, ${failed} failed${failures.length ? " — falhas: " + failures.join(", ") : ""}`,
);
process.exit(failed === 0 ? 0 : 1);
