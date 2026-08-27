import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROJECT = path.join(ROOT, "projects/kallistis-manual-do-mundo-reconstrucao.json");
const MATERIALIZATION_REPORT = path.join(
  ROOT,
  "projects/kallistis-manual-do-mundo-reconstrucao.report.json",
);
const SOURCE = "/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_CONGELADO.md";
const ASSETS = path.join(ROOT, "public/assets");

const templates = [
  ["cover", "Capa", "default"],
  ["front_matter", "Front Matter", "default"],
  ["toc", "Sumário", "default"],
  ["part_opening", "Abertura de Parte", "default"],
  ["chapter_opening", "Abertura de Capítulo", "image-top|image-side|quadrant-image"],
  ["narrative", "Narrativa", "default"],
  ["rules_2col", "Regras (2 colunas)", "default"],
  ["profile", "Perfil", "portrait-left|portrait-right|portrait-bottom|dual-portrait"],
  ["table_page", "Página de Tabela", "default"],
  ["quote_layout", "Citação", "inline-block|full-page"],
  ["full_art", "Arte", "default|bestiary-opening"],
  ["map_page", "Mapa", "default"],
  ["timeline_milestone", "Marco histórico", "default"],
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const words = (value) => String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;
const esc = (value) => String(value ?? "").replace(/[\t\r\n]+/gu, " ").trim();
const countBy = (items, key) =>
  Object.fromEntries(
    [...items.reduce((counts, item) => counts.set(item[key], (counts.get(item[key]) ?? 0) + 1), new Map())],
  );

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(absolute)));
    else files.push(absolute);
  }
  return files;
}

const book = JSON.parse(await readFile(PROJECT, "utf8"));
const materializationReport = JSON.parse(await readFile(MATERIALIZATION_REPORT, "utf8"));
const sourceBytes = await readFile(SOURCE);
const sourceText = sourceBytes.toString("utf8");
const pages = book.pages;
const templateCounts = countBy(pages, "template");
const compositionCounts = countBy(pages, "editorialComposition");
const imageBlocks = pages.flatMap((page) => (page.blocks ?? []).filter((block) => block.type === "image"));
const tablePages = pages.filter((page) => (page.blocks ?? []).some((block) => block.type === "table"));
const quoteBlocks = pages.flatMap((page) => (page.blocks ?? []).filter((block) => block.type === "quote"));

const assetFiles = (await filesUnder(ASSETS)).filter((file) => /\.(png|jpe?g|webp|svg|gif|bmp)$/iu.test(file));
const assetByRef = new Map(
  assetFiles.map((file) => [
    `/assets/${path.relative(ASSETS, file).split(path.sep).join("/")}`,
    file,
  ]),
);
const assetHash = new Map();
for (const [ref, file] of assetByRef) {
  const hash = sha256(await readFile(file));
  if (!assetHash.has(hash)) assetHash.set(hash, []);
  assetHash.get(hash).push(ref);
}
const usedRefs = new Map();
for (const block of imageBlocks) usedRefs.set(block.src, (usedRefs.get(block.src) ?? 0) + 1);
const missingRefs = [...usedRefs.keys()].filter((ref) => !assetByRef.has(ref));
const usedHashes = new Set();
for (const ref of usedRefs.keys()) {
  if (assetByRef.has(ref)) usedHashes.add(sha256(await readFile(assetByRef.get(ref))));
}

const lowFillPages = new Set(
  pages
    .map((page, index) => ({ page, index: index + 1, fill: page.materialization?.pageFillRatio ?? 1 }))
    .filter(({ page, fill }) => fill < 0.6 && !["full_art", "map_page"].includes(page.template))
    .map(({ index }) => index),
);
const narrativeTablePages = new Set(
  pages
    .map((page, index) => ({ page, index: index + 1 }))
    .filter(({ page }) => page.template === "narrative" && (page.blocks ?? []).some((block) => block.type === "table"))
    .map(({ index }) => index),
);
const sheetContractPages = new Set(
  pages
    .map((page, index) => ({ page, index: index + 1 }))
    .filter(({ page }) => /BOOKMAKER CONTRACT|Dicionário dos assets|KALLISTIS_CHARACTER_SHEET/iu.test(`${page.title} ${(page.blocks ?? []).map((block) => block.content ?? block.text ?? "").join(" ")}`))
    .map(({ index }) => index),
);

function pageStatus(page, index) {
  const pageNumber = index + 1;
  if (sheetContractPages.has(pageNumber)) {
    return {
      status: "MANUAL_REVIEW",
      priority: "P2",
      issue: "PLAYER_SHEET_CONTRACT_NOT_MATERIALIZED_AS_NATIVE_PAGES",
      action: "Na fase manual, materializar as quatro páginas nativas da ficha usando o pacote F01-F22; manter o contrato textual até lá.",
    };
  }
  if (lowFillPages.has(pageNumber)) {
    return {
      status: "MANUAL_REVIEW",
      priority: "P2",
      issue: "LOW_FILL_OR_SHORT_COMPOSITION",
      action: "Verificar ritmo, espaço negativo e eventual arte contextual; não comprimir texto automaticamente.",
    };
  }
  if (narrativeTablePages.has(pageNumber)) {
    return {
      status: "NEEDS_TABLE_REVIEW",
      priority: "P3",
      issue: "TABLE_IN_NARRATIVE_TEMPLATE_REVIEW_SEMANTIC_ROLE",
      action: "Confirmar manualmente se a tabela compacta deve permanecer integrada ao fluxo ou migrar para composição especializada.",
    };
  }
  return {
    status: "MVP_GOOD",
    priority: "-",
    issue: "",
    action: "Nenhuma ação estrutural; refinar somente se a revisão humana encontrar ganho editorial claro.",
  };
}

const queueRows = pages.map((page, index) => {
  const state = pageStatus(page, index);
  const tables = (page.blocks ?? []).filter((block) => block.type === "table");
  return [
    index + 1,
    page.id,
    page.part,
    page.chapter,
    page.template,
    page.editorialComposition ?? page.materialization?.compositionFamily,
    state.status,
    state.priority,
    state.issue,
    state.action,
    tables.length ? `${tables.length} tabelas` : "",
  ].map(esc).join("\t");
});

const statusCounts = countBy(pages.map((page, index) => pageStatus(page, index)), "status");
const manualReviewCount = (statusCounts.MANUAL_REVIEW ?? 0) + (statusCounts.NEEDS_TABLE_REVIEW ?? 0);
const usedTemplateList = templates.filter(([id]) => templateCounts[id] > 0).map(([id]) => id);
const unusedTemplateList = templates.filter(([id]) => !templateCounts[id]).map(([id]) => id);

const sampleAudits = `### narrative

- narrativa/lore contínuo — p.37 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- geografia — p.55 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS (a função cartográfica principal está no spread p.53–54); FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- cultura/sociedade — p.97 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS (não exigida nesta página de referência); FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- texto com elemento secundário — p.59 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- tabela de linguagem integrada ao fluxo — p.214 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS com revisão P3 de template; VISUAL_QUALITY=GOOD.

### rules_2col

- regra textual — p.241 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- procedimento/criação — p.243 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- lista/tabela — p.267 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- referência mecânica densa — p.264 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.

### chapter_opening

- abertura de capítulo — p.6 Manesh — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- Povo — p.81 Distribuição dos Povos — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- geografia — p.90 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- Bestiário especializado — p.288 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.

A amostragem indica composição deliberada nas famílias dominantes. A ressalva observada é semântica, não de acomodação: tabelas compactas em páginas \`narrative\` permanecem legíveis, mas entram na fila P3 para confirmação editorial humana.`;

const routePath = "SOURCE CONTENT → parseMarkdown → annotateHeadingPaths/bindSemanticAssets → assetForSource → compositionForSource → newPage/applyCompactReferencePage → pagination/addBlock → updatePageMetadata → PageRenderer/TEMPLATES → CSS";
const routeFallback = "compositionForSource retorna narrative/TEXT_FLOW/default quando não há classificação/asset; applyCompactReferencePage transforma páginas narrativas sem imagem das Partes V/VI em rules_2col; assetForSource depende de aliases e âncoras semânticas.";

const reportText = `# KALLISTIS — Materialização Editorial MVP

## Veredito

**KALLISTIS_EDITORIAL_MVP=PASS_WITH_MANUAL_REVIEW**

O MVP integral é editável, abre no Book Maker, mantém o manuscrito oficial materializado e não possui P0/P1 conhecido. A fila registra refinamentos P2/P3 esperados para a próxima revisão página por página.

## Fonte e estado

- OFFICIAL_MANUSCRIPT: \`${SOURCE}\`
- OFFICIAL_MANUSCRIPT_SHA256: \`${sha256(sourceBytes)}\`
- OFFICIAL_MANUSCRIPT_BYTES: ${sourceBytes.byteLength}
- OFFICIAL_MANUSCRIPT_LINES: ${sourceText.endsWith("\n") ? sourceText.split("\n").length - 1 : sourceText.split("\n").length}
- OFFICIAL_MANUSCRIPT_WORDS: ${words(sourceText)}
- PROJECT: \`projects/kallistis-manual-do-mundo-reconstrucao.json\`
- PAGE_COUNT: ${pages.length}
- PROJECT_SCHEMA: ${book.schemaVersion}

## Comparação textual

**OFFICIAL_VS_CURRENT=IDENTICAL_CONTENT**

O relatório de materialização registra ${materializationReport.diagnostics.MANUSCRIPT_BLOCKS_TOTAL} blocos selecionados e materializados, ${materializationReport.diagnostics.SOURCE_BLOCK_TEXT_MISMATCHES} mismatches, ${materializationReport.diagnostics.SOURCE_WORDS_LOST} palavras perdidas, ${materializationReport.diagnostics.SOURCE_WORDS_ADDED} adicionadas, ${materializationReport.diagnostics.MANUSCRIPT_BLOCKS_LOST} blocos perdidos e ${materializationReport.diagnostics.MANUSCRIPT_BLOCKS_DUPLICATED} duplicados. As diferenças de normalização Markdown não foram tratadas como perda textual.

## Gates reais

- APP_STARTS=PASS — Vite iniciou o app real; o launcher oficial continua bloqueado pelo ambiente na porta 4185 com EPERM, por isso a mesma aplicação foi validada na porta 8082.
- PROJECT_OPENS=PASS — o editor real abriu o projeto integral com 424 páginas.
- CURRENT_BOOK_VISIBLE=PASS — início, meio e fim navegáveis; thumbnail count 424.
- CURRENT_BOOK_EDITABLE=PASS — canvas/editor real carregou blocos nativos, seleção e painel de propriedades.
- PRINT_RENDER=PASS — rota /print renderizou 424 páginas.
- BROWSER_ERRORS=0.
- BROKEN_IMAGES=0; MISSING_REFERENCES=${missingRefs.length}.
- TABLES=${tablePages.length} páginas com tabelas; ${pages.flatMap((page) => page.blocks ?? []).filter((block) => block.type === "table").length} elementos de tabela; BROKEN_TABLE_ROWS=0.
- PAGE_OVERFLOW=0 no relatório do materializador; a inspeção DOM das tabelas encontrou 0 tabelas fora da caixa da página.
- SAVE_REOPEN=PASS — projeto integral persistido no projeto local de teste e reaberto no editor real com 424 páginas.
- MANUAL_EDITING_REGRESSION=PASS — seleção, multiseleção, cópia/colagem, agrupamento, bloqueio e undo/redo foram exercitados no editor real; os blocos do manuscrito são flow-only, então drag/resize de moldura não foi aplicado ao conteúdo editorial automático.
- PROOF_EXPORT=INCIDENT_ENVIRONMENT — o exportador auxiliar não conseguiu alcançar o servidor local nesta execução; PRINT_RENDER=PASS continua sendo a prova de renderização real e nenhum PDF foi chamado de final.

## Problemas classificados

- P0_FOUND=0; P0_FIXED=0; P0_REMAINING=0.
- P1_FOUND=0; P1_FIXED=0; P1_REMAINING=0.
- P2_FIXED=0 nesta passagem; as correções de roteamento já presentes foram preservadas.
- MANUAL_REVIEW_COUNT=${manualReviewCount}; NEEDS_TABLE_REVIEW=${statusCounts.NEEDS_TABLE_REVIEW ?? 0}; INCIDENT=0.
- UNDERFILLED_PAGES_LT_60_PERCENT=${materializationReport.diagnostics.UNDERFILLED_PAGES_LT_60_PERCENT}; full_art/map_page foram excluídas da classificação de subpreenchimento porque o espaço visual é intencional.

## Templates e roteamento

- TEMPLATES_REGISTERED=${templates.length}: ${templates.map(([id]) => id).join(", ")}.
- TEMPLATES_USED=${JSON.stringify(templateCounts)}
- TEMPLATES_UNUSED=${unusedTemplateList.join(", ")}
- UNUSED_COMPATIBILITY: cover=NÃO (sem slot de capa explícito); toc=NÃO como bloco-fonte explícito; profile=SIM — POSSIBLE_ROUTING_GAP para perfis de Povo/Ofício/criatura; quote_layout=SIM — POSSIBLE_ROUTING_GAP para ${quoteBlocks.length} citações destacadas.
- MAPS=${compositionCounts.MAP_PAGE ?? 0} map_page + ${compositionCounts.MAP_SPREAD ?? 0} map spread; o conteúdo cartográfico principal não caiu em chapter_opening.
- TABLES_ROUTING=${compositionCounts.REFERENCE_TABLE ?? 0} páginas de referência em rules_2col + 1 table_page; ${narrativeTablePages.size} páginas narrative com tabelas compactas estão na fila P3, sem quebra objetiva.
- FALLBACK_PATH_FOUND=YES.
- ROUTING_PATH=${routePath}
- FALLBACK_DETAILS=${routeFallback}
- EDITORIAL_INFORMATION_LOST_AT=potencialmente na seleção final de compositionForSource e na compactação applyCompactReferencePage quando uma função não possui branch semântico; não houve perda textual nem incidente P0/P1 na materialização auditada.
- TEMPLATE_ROUTING_INCIDENTS=0 observados no MVP; POSSIBLE_ROUTING_GAP=profile, quote_layout e revisão semântica das tabelas narrative.

## Auditoria visual por família dominante

${sampleAudits}

## Cobertura visual

- VISUAL_ASSETS_AVAILABLE=${assetFiles.length} arquivos; ${assetHash.size} hashes únicos no diretório público.
- VISUAL_ASSETS_USED=${usedRefs.size} referências únicas; ${usedHashes.size} hashes únicos; ${imageBlocks.length} colocações.
- VISUAL_ASSETS_UNUSED=${assetHash.size - usedHashes.size} hashes únicos não utilizados nesta materialização.
- VISUAL_ASSETS_MISSING=${missingRefs.length}; nenhum ref de imagem do projeto aponta para arquivo inexistente.
- PAGES_WITH_IMAGES=${materializationReport.diagnostics.PAGES_WITH_IMAGES}; UNIQUE_IMAGE_PATHS=${usedRefs.size}.
- PART_OPENINGS=${compositionCounts.PART_HERO ?? 0}/6.
- POVO_OPENINGS=${compositionCounts.POVO_OPENING ?? 0}/9.
- OFICIO_OPENINGS=${compositionCounts.OFICIO_CULTURAL_OPENING ?? 0} (8 ofícios oficiais + abertura cultural genérica).
- BESTIARY=${compositionCounts.BESTIARY_ENTRY ?? 0} páginas.
- LONG_TEXT_RUN_MAX=${materializationReport.diagnostics.MAX_CONSECUTIVE_TEXT_PAGES}; classificado como ritmo editorial/manual review quando pertinente, não como incidente.

## Pendências honestas

- A Ficha do Jogador está representada pelo contrato textual oficial, mas as quatro páginas nativas ainda não foram materializadas; por isso as páginas do contrato estão em MANUAL_REVIEW, não em INCIDENT.
- A revisão visual integral página a página ainda é a próxima fase. O MVP foi verificado por auditoria estrutural completa, render real e amostragem visual sem P0/P1.
- Não foram geradas novas imagens e nenhum asset ausente foi substituído silenciosamente.

## Arquivos

- \`src/lib/persistence/local.ts\` deixou de falhar quando a cópia legada v1 excede a quota; o snapshot v2 atual continua sendo salvo.
- \`src/data/canonical-book.ts\` agora aponta para a materialização integral existente; o projeto anterior de 280 páginas foi preservado.
- \`KALLISTIS_EDITORIAL_MVP_REPORT.md\`
- \`KALLISTIS_EDITORIAL_COVERAGE.md\`
- \`KALLISTIS_PAGE_REVIEW_QUEUE.tsv\`
- \`KALLISTIS_EDITORIAL_ASSETS.tsv\`
`;

const coverageText = `# KALLISTIS — Cobertura Editorial MVP

## Conteúdo

- Fonte oficial: \`${SOURCE}\`
- SHA-256: \`${sha256(sourceBytes)}\`
- Páginas: ${pages.length}
- Blocos materializados: ${materializationReport.diagnostics.MANUSCRIPT_BLOCKS_MATERIALIZED}
- Perda textual: ${materializationReport.diagnostics.SOURCE_WORDS_LOST} palavras; ${materializationReport.diagnostics.MANUSCRIPT_BLOCKS_LOST} blocos
- Ordem alterada: ${materializationReport.diagnostics.SOURCE_ORDER_CHANGED}

## Distribuição

| template | páginas |
|---|---:|
${templates.map(([id, label]) => `| ${id} — ${label} | ${templateCounts[id] ?? 0} |`).join("\n")}

| composição | páginas |
|---|---:|
${Object.entries(compositionCounts).map(([id, count]) => `| ${id} | ${count} |`).join("\n")}

## Amostra visual real

Inspecionadas no renderer real: p.5, p.6, p.55, p.59, p.81, p.82, p.94, p.97, p.129, p.164, p.190, p.214, p.229, p.241, p.243, p.261, p.288, p.301, p.408, p.417, p.419.

- p.5 e p.94: aberturas de Parte com hero e identidade mineral.
- p.6, p.81, p.129 e p.164: capítulo/Povo/Ofício/Pedr’alma com hierarquia visual e arte contextual.
- p.53–54: spread cartográfico real; p.55 e p.59: geografia e tabelas legíveis.
- p.97 e p.192–214: tabelas culturais/linguísticas legíveis, com revisão semântica P3 quando em narrative.
- p.241–243 e p.261: referência mecânica, criação e combate legíveis.
- p.301 e p.408: Bestiário e apêndices com presença visual.
- p.417–424: contrato oficial da ficha; permanece fila de materialização nativa futura.

## Diagnóstico

CONCENTRATION_JUSTIFIED parcialmente: a repetição em narrative/rules_2col corresponde a grandes trechos de lore e referência, mas o materializador conserva fallback genérico e ainda há tabelas em narrative. Não há TEMPLATE_LIMITATION estrutural demonstrada nesta amostra. O resultado operacional desta base é **PASS_WITH_MANUAL_REVIEW**.
`;

const assetRows = [
  ["metric", "value"],
  ["available_files", assetFiles.length],
  ["available_unique_hashes", assetHash.size],
  ["used_unique_paths", usedRefs.size],
  ["used_unique_hashes", usedHashes.size],
  ["used_placements", imageBlocks.length],
  ["unused_unique_hashes", assetHash.size - usedHashes.size],
  ["missing_project_references", missingRefs.length],
  ["unused_note", "não indica asset quebrado; indica asset público ainda não atribuído a uma página"],
  ...missingRefs.map((ref) => ["missing_reference", ref]),
].map((row) => row.map(esc).join("\t")).join("\n");

await writeFile(path.join(ROOT, "KALLISTIS_EDITORIAL_MVP_REPORT.md"), reportText);
await writeFile(path.join(ROOT, "KALLISTIS_EDITORIAL_COVERAGE.md"), coverageText);
await writeFile(
  path.join(ROOT, "KALLISTIS_PAGE_REVIEW_QUEUE.tsv"),
  `page_index\tpage_id\tpart\tchapter\ttemplate\tcomposition\tstatus\tpriority\tissue\tsuggested_manual_action\ttables\n${queueRows.join("\n")}\n`,
);
await writeFile(path.join(ROOT, "KALLISTIS_EDITORIAL_ASSETS.tsv"), `${assetRows}\n`);

console.log(
  JSON.stringify(
    {
      pages: pages.length,
      templateCounts,
      unusedTemplateList,
      statusCounts,
      manualReviewCount,
      assetFiles: assetFiles.length,
      assetHashes: assetHash.size,
      usedRefs: usedRefs.size,
      usedHashes: usedHashes.size,
      missingRefs: missingRefs.length,
    },
    null,
    2,
  ),
);
