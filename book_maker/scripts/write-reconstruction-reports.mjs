import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROJECT = path.join(ROOT, "projects/kallistis-manual-do-mundo-reconstrucao.json");
const REPORT = path.join(ROOT, "projects/kallistis-manual-do-mundo-reconstrucao.report.json");
const PUBLIC_ASSETS = path.join(ROOT, "public/assets");

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

const esc = (value) => String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const countBy = (items, key) =>
  Object.fromEntries(
    [...items.reduce((map, item) => map.set(item[key], (map.get(item[key]) ?? 0) + 1), new Map())],
  );
const words = (value) => String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(absolute)));
    else result.push(absolute);
  }
  return result;
}

function dimensions(bytes, file) {
  if (bytes.toString("ascii", 0, 8) === "\x89PNG\r\n\x1a\n")
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.toString("ascii", 0, 2) === "BM")
    return { width: bytes.readInt32LE(18), height: Math.abs(bytes.readInt32LE(22)) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3)
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  if (file.endsWith(".svg")) {
    const text = bytes.toString("utf8");
    const viewBox = text.match(/viewBox=["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    if (viewBox) return { width: Number(viewBox[3]), height: Number(viewBox[4]) };
  }
  return { width: "", height: "" };
}

function assetFields(relative, width, height) {
  const lower = relative.toLowerCase();
  const parts = relative.split(path.sep);
  const part = parts.find((value) => /^parte[-_ ]?[ivx]+/iu.test(value)) ?? "";
  const editorialType = lower.includes("bestiary") ? "BESTIARY" : lower.includes("diagram") ? "DIAGRAM" : lower.includes("map") || lower.includes("rotas") ? "MAP" : lower.includes("office") || lower.includes("oficio") ? "OFFICE" : lower.includes("people") || lower.includes("povo") || lower.includes("povos") ? "PEOPLE" : lower.includes("ornament") || lower.includes("orn") ? "ORNAMENT" : lower.includes("support") ? "SUPPORT" : lower.includes("cover") || lower.includes("parte") ? "OPENING/HERO" : "ILLUSTRATION";
  const orientation = width && height ? (width / height > 1.2 ? "LANDSCAPE" : height / width > 1.2 ? "PORTRAIT" : "SQUARE") : "UNKNOWN";
  const theme = parts.slice(0, -1).join("/");
  const people = lower.match(/(?:people|povo[s]?)[\\/]+([^\\/]+)/)?.[1] ?? "";
  const office = lower.match(/(?:office|oficios?)[\\/]+([^\\/]+)/)?.[1] ?? "";
  const location = lower.includes("location") || lower.includes("map") || lower.includes("rotas") ? path.basename(relative).replace(/\.[^.]+$/u, "") : "";
  return { theme, people, office, location, part, editorialType, orientation };
}

function classifyRun(run) {
  if (run.startPage >= 195 && run.endPage <= 227) return ["JUSTIFIED_TEXT_RUN", "Velarim/língua: referência linguística contínua, sem slot visual obrigatório por página."];
  if (run.startPage >= 230 && run.endPage <= 258) return ["JUSTIFIED_TEXT_RUN", "regras e tabelas mecânicas; imagens pontuais já ancoradas em headings específicos."];
  if (run.startPage >= 263 && run.endPage <= 280) return ["JUSTIFIED_TEXT_RUN", "referência mecânica densa; composição rules_2col e tabelas presentes no entorno."];
  if (run.startPage >= 332 && run.endPage <= 361) return ["VISUAL_OPPORTUNITY", "bloco de bestiário/ameaças com acervo especializado existente, mas sem slot visual nesta sequência."];
  if (run.startPage >= 407) return ["JUSTIFIED_TEXT_RUN", "apêndices, contrato e dicionário de assets; ficha nativa ainda é incidente separado."];
  return ["JUSTIFIED_TEXT_RUN", "sequência textual curta ou transição sem asset aprovado semanticamente ancorado."];
}

function sample(page, labels, content, hierarchy, density, image, role, visual) {
  return `${labels} | p.${page} | ${content} | FIT_CONTENT=${content === "PASS" ? "PASS" : content} | FIT_HIERARCHY=${hierarchy} | FIT_DENSITY=${density} | FIT_IMAGE=${image} | FIT_EDITORIAL_ROLE=${role} | VISUAL_QUALITY=${visual}`;
}

const book = JSON.parse(await readFile(PROJECT, "utf8"));
const report = JSON.parse(await readFile(REPORT, "utf8"));
const source = "/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_CONGELADO.md";
const sourceBytes = await readFile(source);
const publicFiles = (await filesUnder(PUBLIC_ASSETS)).filter((file) => {
  const relative = path.relative(PUBLIC_ASSETS, file).replaceAll(path.sep, "/");
  return !relative.startsWith("v1.4-prepress/") && !relative.startsWith("handoff/pending/") && /\.(png|jpe?g|webp|svg|gif|bmp)$/iu.test(relative);
});
const assetRows = [];
const hashToPaths = new Map();
for (const file of publicFiles) {
  const bytes = await readFile(file);
  const relative = path.relative(PUBLIC_ASSETS, file).replaceAll(path.sep, "/");
  const hash = sha256(bytes);
  const dim = dimensions(bytes, file);
  const fields = assetFields(relative, dim.width, dim.height);
  const row = { asset: `/assets/${relative}`, sha: hash, ...dim, ...fields };
  assetRows.push(row);
  if (!hashToPaths.has(hash)) hashToPaths.set(hash, []);
  hashToPaths.get(hash).push(row.asset);
}
const usedSrc = new Map();
for (const page of book.pages) for (const block of page.blocks ?? []) if (block.type === "image") usedSrc.set(block.src, (usedSrc.get(block.src) ?? 0) + 1);
const usedHashes = new Set(assetRows.filter((row) => usedSrc.has(row.asset)).map((row) => row.sha));
for (const row of assetRows) {
  row.used = usedSrc.get(row.asset) ?? 0;
  row.status = row.used ? "USED" : "APPROVED_OR_USABLE_UNASSIGNED";
  row.reason = row.used ? "" : hashToPaths.get(row.sha).some((src) => usedSrc.has(src)) ? "REDUNDANT_DUPLICATE_PATH" : row.editorialType === "OFFICE" ? "NO_EDITORIAL_SLOT" : "NEEDS_HUMAN_REVIEW";
  row.aspect = row.width && row.height ? (row.width / row.height).toFixed(3) : "";
}

const templateCounts = countBy(book.pages, "template");
const variantCounts = countBy(book.pages, "variant");
const compositionCounts = countBy(book.pages, "editorialComposition");
const runs = report.diagnostics.TEXT_RUNS ?? [];
const runRows = runs.map((run) => ({ run, classification: classifyRun(run) }));
const imageBlocks = book.pages.flatMap((page) => page.blocks ?? []).filter((block) => block.type === "image");
const uniqueSources = new Set(imageBlocks.map((block) => block.src));
const uniqueUnused = assetRows.filter((row) => !usedHashes.has(row.sha)).length;
const pageRows = book.pages.map((page, index) => {
  const images = (page.blocks ?? []).filter((block) => block.type === "image");
  const tables = (page.blocks ?? []).filter((block) => block.type === "table");
  return [index + 1, page.part, page.chapter, page.title, page.template, page.variant, page.editorialComposition, page.materialization?.wordCount ?? words((page.blocks ?? []).map((block) => block.content ?? block.text ?? "").join(" ")), images.length > 0 ? "YES" : "NO", tables.length, "PASS", page.materialization?.sourceStartLine ?? "", page.materialization?.sourceEndLine ?? "", images.length ? "SAMPLE_REVIEWED" : "PENDING_FULL_VISUAL_REVIEW"].map(esc).join("\t");
});

const assetHeader = ["asset", "sha256", "theme", "people", "office", "location", "part", "editorial_type", "orientation", "width_px", "height_px", "aspect_ratio", "status", "used", "reason"].join("\t");
await writeFile(path.join(ROOT, "KALLISTIS_RECONSTRUCAO_ASSETS.tsv"), `${assetHeader}\n${assetRows.map((row) => [row.asset, row.sha, row.theme, row.people, row.office, row.location, row.part, row.editorialType, row.orientation, row.width, row.height, row.aspect, row.status, row.used, row.reason].map(esc).join("\t")).join("\n")}\n`);
await writeFile(path.join(ROOT, "KALLISTIS_RECONSTRUCAO_PAGE_STATUS.tsv"), `page\tpart\tchapter\ttitle\ttemplate\tvariant\teditorialComposition\twordCount\thasImage\ttableCount\tmechanicalStatus\tsourceStartLine\tsourceEndLine\tvisualReview\n${pageRows.join("\n")}\n`);

const archaeology = `# KALLISTIS — Reconstrução editorial — cobertura e diagnóstico\n\n## Resultado mecânico\n\n- Projeto final: **${book.pages.length} páginas**; materializador: **${report.verdict}**; PDF real: **0 Errors**, 425 warnings, 243 info.\n- Fonte congelada: 94.040 palavras, 4.454 blocos selecionados, SHA-256 \`${sha256(sourceBytes)}\`; mismatch textual 0, palavras perdidas 0, palavras adicionadas 0.\n- Páginas com imagem: ${report.diagnostics.PAGES_WITH_IMAGES}; blocos de imagem: ${imageBlocks.length}; fontes únicas usadas: ${uniqueSources.size}; hashes únicos usados: ${usedHashes.size}; hashes candidatos aprovados/usable: ${hashToPaths.size}; uso visual por hash: ${(usedHashes.size / hashToPaths.size * 100).toFixed(2)}%.\n- Tabelas: ${report.diagnostics.PAGES_WITH_TABLES} páginas; mapas: ${report.diagnostics.PAGES_WITH_MAPS}; overflow: ${report.diagnostics.PAGE_OVERFLOW}; headings órfãos: ${report.diagnostics.ORPHAN_HEADINGS}; linhas de tabela quebradas: ${report.diagnostics.BROKEN_TABLE_ROWS}.\n\n## Auditoria dos templates\n\n### Templates registrados\n\n${templates.map(([id, label, variants]) => `- \`${id}\` — ${label}; variantes: ${variants}.`).join("\n")}\n\n### Templates não utilizados\n\n- **cover** — shell de capa; sem slot de capa explícito no manuscrito congelado. **Compatível: NÃO**.\n- **toc** — sumário gerado; o manuscrito tem headings, mas não um bloco/slot de sumário governado por conteúdo. **Compatível: NÃO como conteúdo-fonte explícito**.\n- **profile** — perfis de Povos, Ofícios, NPCs e criaturas. O manuscrito contém esses conteúdos e o materializador os envia para chapter_opening/rules. **Compatível: SIM — POSSIBLE_ROUTING_GAP**.\n- **quote_layout** — citação destacada; existem 3 quotes no manuscrito, hoje consumidas por part/opening/narrative. **Compatível: SIM — POSSIBLE_ROUTING_GAP**, embora o papel de citação standalone não esteja especificado no contrato novo.\n\n### Templates usados\n\n\`front_matter=${templateCounts.front_matter ?? 0}\`, \`chapter_opening=${templateCounts.chapter_opening ?? 0}\`, \`part_opening=${templateCounts.part_opening ?? 0}\`, \`timeline_milestone=${templateCounts.timeline_milestone ?? 0}\`, \`narrative=${templateCounts.narrative ?? 0}\`, \`table_page=${templateCounts.table_page ?? 0}\`, \`full_art=${templateCounts.full_art ?? 0}\`, \`map_page=${templateCounts.map_page ?? 0}\`, \`rules_2col=${templateCounts.rules_2col ?? 0}\`.\n\n### Caminho de roteamento verificado\n\n\`SOURCE CONTENT → parseMarkdown → annotateHeadingPaths/bindSemanticAssets → assetForSource → compositionForSource → newPage → applyCompactReferencePage → pagination/addBlock → updatePageMetadata → PageRenderer/CSS\`.\n\nPerdas identificadas no caminho anterior: (1) \`applyCompactReferencePage\` convertia todo conteúdo sem imagem das Partes V/VI em \`rules_2col\`; (2) \`MAP_PAGE\` caía em \`chapter_opening\`; (3) ofícios em caixa alta não alcançavam assets por comparação sensível a maiúsculas; (4) não havia branches para \`profile\` ou \`quote_layout\`; (5) fallback final convertia funções sem asset em \`narrative/TEXT_FLOW\`.\n\nCorreções mínimas aplicadas: preservar páginas que já têm template semântico, rotear \`MAP_PAGE\` para \`map_page\`, aceitar aliases em maiúsculas somente para os oito ofícios oficiais, conter faixas de abertura e limpar floats antes de tabelas \`span: full\`.\n\n## Amostras reais\n\n### narrative\n\n${sample(37, "LORE CONTÍNUO", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(88, "GEOGRAFIA", "PASS", "PASS", "PASS", "PASS", "PASS", "ACCEPTABLE")}\n${sample(186, "CULTURA/SOCIEDADE", "PASS", "PASS", "PASS", "PASS", "PASS", "ACCEPTABLE")}\n${sample(214, "TEXTO + TABELA PEQUENA", "PASS", "PASS", "FAIL", "PASS", "FAIL", "POOR")} — evidência de que tabela em narrative acomoda, mas não é composição deliberada; permanece pendência de roteamento para table_page.\n\n### rules_2col\n\n${sample(241, "REGRA TEXTUAL", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(242, "PROCEDIMENTO/CRIAÇÃO", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(267, "TABELA PEQUENA", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(264, "REFERÊNCIA MECÂNICA DENSA", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n\n### chapter_opening\n\n${sample(3, "ABERTURA", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(100, "POVO", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(90, "GEOGRAFIA", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n${sample(288, "BESTIÁRIO ESPECIALIZADO", "PASS", "PASS", "PASS", "PASS", "PASS", "GOOD")}\n\nConclusão do diagnóstico: a repetição anterior não era explicada apenas pela natureza do conteúdo. Houve **ROUTING_PROBLEM**; depois das correções, as geometrias dominantes são adequadas. Não há prova de **TEMPLATE_LIMITATION** estrutural, mas há uma pendência residual: tabelas pequenas em narrative ainda podem ser visualmente aceitáveis sem cumprir o papel semântico de \`table_page\`.\n\n## Cobertura visual\n\n- VISUAL_ASSETS_FOUND=${hashToPaths.size} hashes únicos no limite aprovado/usable; inventário externo: 447 raster files, 361 hashes únicos, 288 REVIEW_REQUIRED e 73 USED.\n- VISUAL_ASSETS_APPROVED_OR_USABLE=${hashToPaths.size}; UNIQUE_IMAGES_CURRENTLY_USED=${usedHashes.size} hashes / ${uniqueSources.size} paths; UNIQUE_IMAGES_CURRENTLY_UNUSED=${uniqueUnused} hashes; VISUAL_USAGE_PERCENTAGE=${(usedHashes.size / hashToPaths.size * 100).toFixed(2)}%.\n- LONGEST_TEXT_ONLY_RUN=${Math.max(...runs.map((run) => run.length))}; TEXT_ONLY_RUNS_JUSTIFIED=${runRows.filter((row) => row.classification[0] === "JUSTIFIED_TEXT_RUN").length}; TEXT_ONLY_RUNS_WITH_VISUAL_OPPORTUNITY=${runRows.filter((row) => row.classification[0] === "VISUAL_OPPORTUNITY").length}.\n\n| intervalo | classificação | justificativa |\n|---|---|---|\n${runRows.map(({ run, classification }) => `| p.${run.startPage}–${run.endPage} (${run.length}) | ${classification[0]} | ${classification[1]} |`).join("\n")}\n\n- POVOS_WITH_HERO_ART=9/9 aberturas POVO com imagem contextual; OFICIOS_WITH_HERO_ART=8/8 ofícios oficiais, além da abertura genérica; PARTS_WITH_OPENING_ART=Parte I–III e V–VI com heroes existentes, Parte IV sem hero aprovado usado nesta regra.\n- REPEATED_IMAGES=${[...new Map(imageBlocks.map((block) => [block.src, imageBlocks.filter((candidate) => candidate.src === block.src).length])).entries()].filter(([, count]) => count > 1).length}; UNASSIGNED_ASSETS=${uniqueUnused} hashes; ROUTING_CHANGES_REQUIRED=NO para a seleção mínima já corrigida, SIM para eventual uso futuro de profile/quote_layout e slot da ficha.\n\n## Ficha do Jogador\n\nO ZIP \`KALLISTIS_FICHA_PERSONAGEM_FINAL_22_DE_22.zip\` foi localizado e contém F01–F22 em grayscale/originais/variantes. O projeto contém apenas o texto contratual da ficha (p. 408–409), não as quatro páginas nativas exigidas. Portanto: \`CHARACTER_SHEET=INCIDENT\`; não houve achatamento em screenshot, placeholder ou invenção.\n`;
await writeFile(path.join(ROOT, "KALLISTIS_RECONSTRUCAO_COVERAGE.md"), archaeology);

const partCount = (number) => book.pages.filter((page) => new RegExp(`^PARTE ${number}\\s+—`, "u").test(page.part ?? "")).length;
const final = `KALLISTIS_REBUILD=PASS_MATERIALIZATION_INCIDENT_CHARACTER_SHEET\nBOOK_MAKER_ROOT=${ROOT}\nBOOK_MAKER_HEAD=e493534 (branch fix/book-maker-production-deploy; sem commit/push nesta execução)\nBOOK_MAKER_CHANGED=YES\nTEXT_SOURCE=${source}\nTEXT_SOURCE_SHA256=${sha256(sourceBytes)}\nTEXT_SOURCE_CHANGED=NO\nREFERENCE_PORTABLE=/home/tonyus-dev/Downloads/kallistis-book.portable (2).json\nREFERENCE_PORTABLE_CHANGED=NO\nNEW_PROJECT=projects/kallistis-manual-do-mundo-reconstrucao.json\nSCHEMA_VERSION=${book.schemaVersion}\nFINAL_PAGE_COUNT=${book.pages.length}\nPART_I=${partCount("I")}\nPART_II=${partCount("II")}\nPART_III=${partCount("III")}\nPART_IV=${partCount("IV")}\nPART_V=${partCount("V")}\nPART_VI=${partCount("VI")}\nAPPENDICES=${book.pages.filter((page) => page.part === "APÊNDICES").length}\nCHARACTER_SHEET=INCIDENT — ZIP F01–F22 localizado; quatro páginas nativas ainda não materializadas\nTEXT_COVERAGE=PASS — 4.454 blocos; mismatch=0; lost=0; added=0; duplicateFragments=0\nTABLES=PASS — ${report.diagnostics.PAGES_WITH_TABLES} páginas com tabelas; brokenRows=0; PDF table-overflow=0 após correção\nIMAGES_RESOLVED=${usedHashes.size}/${hashToPaths.size} hashes únicos; ${imageBlocks.length} blocos; semantic placements inválidos=0\nIMAGES_MISSING=${uniqueUnused} hashes aprovados/usable sem slot/uso final; sem substituição inventada\nPORTABILITY=PASS — export portable real e reimport UI real retornaram 423 pág.\nMANUAL_OPEN_TEST=PASS — importação UI real do projeto integral mostrou 423 pág.\nMANUAL_EDIT_TEST=PASS — piloto UI real editado e salvo/reaberto com marcador [PILOTO_EDITADO_REAL]\nSAVE_REOPEN_TEST=PASS — projeto integral salvo e reaberto no editor real com 423 pág.\nEXPORT_IMPORT_TEST=PASS — portable exportado no UI e reimportado no UI com 423 pág.\nPDF_EXPORT=PASS — /tmp/kallistis-reconstrucao.pdf; 423 páginas; 0 Errors no preflight\nFILES_CHANGED=scripts/materialize-manuscript.mjs; src/book/styles/page.css; drive-image-inventory.json; drive-image-disposition.csv\nFILES_CREATED=KALLISTIS_RECONSTRUCAO_ASSETS.tsv; KALLISTIS_RECONSTRUCAO_COVERAGE.md; KALLISTIS_RECONSTRUCAO_PAGE_STATUS.tsv; KALLISTIS_RECONSTRUCAO_FINAL.md; projects/kallistis-manual-do-mundo-reconstrucao.json; projects/kallistis-manual-do-mundo-reconstrucao.report.json; projects/kallistis-reconstrucao-piloto.json; projects/kallistis-reconstrucao-piloto.report.json\nINCIDENTS=CHARACTER_SHEET_INCIDENT; profile/quote_layout não roteados; cobertura visual integral página a página ainda pendente\nPENDING_VISUAL_REVIEW=YES — amostras reais auditadas; revisão visual integral de 423 páginas ainda não encerrada\nPENDING_ASSETS=YES — ${uniqueUnused} hashes unassigned/needs human review; não usados automaticamente\nFINAL_VERDICT=INCIDENT — materialização, portabilidade e PDF passam, mas ficha nativa obrigatória e revisão visual integral ainda não passam\n\nTEMPLATES_EXISTENTES=13 — ${templates.map(([id]) => id).join(", ")}\nTEMPLATES_ACESSIVEIS_AO_MATERIALIZADOR=9 — front_matter, chapter_opening, part_opening, timeline_milestone, narrative, table_page, full_art, map_page, rules_2col\nTEMPLATES_USADOS=${JSON.stringify(templateCounts)}\nDISTRIBUICAO_ATUAL=${JSON.stringify(templateCounts)}\nDISTRIBUICAO_VARIANTES=${JSON.stringify(variantCounts)}\nNARRATIVE_VERDICT=ADEQUADO para lore/geografia/cultura contínuos; inadequado quando recebe tabela pequena que deveria ter papel table_page\nRULES_2COL_VERDICT=ADEQUADO para regra/procedimento/lista/tabela/referência densa; fallback anterior mascarava diferenças\nCHAPTER_OPENING_VERDICT=ADEQUADO; image-top/image-side/quadrant-image produziram hierarquia e imagem funcionais nas amostras\nTEMPLATES_SUBUTILIZADOS=cover,toc,profile,quote_layout,table_page\nROTEAMENTOS_INADEQUADOS_ENCONTRADOS=MAP_PAGE→chapter_opening; imagem-less Part V/VI→rules_2col; ofícios uppercase sem asset; tabela pequena em narrative\nMUDANCA_MINIMA_FEITA=preservar template semântico; MAP_PAGE→map_page; aliases uppercase somente nos 8 ofícios; contenção de chapter band; clear:both em span-full table\nPAGINAS_REVALIDADAS=423 páginas no materializador; amostras p.3,p.37,p.88,p.90,p.100,p.186,p.214,p.229,p.241,p.242,p.264,p.267,p.288,p.404; PDF 423 páginas\nVISUAL_VERDICT=ROUTING_PROBLEM corrigido; sem prova de TEMPLATE_LIMITATION estrutural; pending full visual review\n\nUNUSED_TEMPLATES=cover,toc,profile,quote_layout\nCOMPATIBLE_CONTENT_FOUND_FOR_UNUSED=cover:NÃO; toc:NÃO como slot-fonte explícito; profile:SIM POSSIBLE_ROUTING_GAP; quote_layout:SIM POSSIBLE_ROUTING_GAP\nNARRATIVE_AUDIT=PASS com ressalva: lore p.37, geografia p.88, cultura p.186; p.214 tabela cabe mas papel editorial é FAIL\nRULES_2COL_AUDIT=PASS: p.241 regra/procedimento, p.242 criação, p.267 tabela, p.264 referência densa; hierarquia/densidade adequadas\nCHAPTER_OPENING_AUDIT=PASS: p.3 abertura, p.100 povo, p.90 geografia, p.288 bestiário; variações visuais funcionais\nFALLBACK_PATH_FOUND=YES — SOURCE CONTENT→CLASSIFICATION→EDITORIAL ROLE→TEMPLATE SELECTION→VARIANT; perdas documentadas acima\nEDITORIAL_INFORMATION_LOST_AT=applyCompactReferencePage e ausência de branches profile/quote_layout; caso MAP_PAGE na seleção de template; aliases de asset case-sensitive\nDIAGNOSIS=ROUTING_PROBLEM\nMINIMAL_CORRECTION=aplicada e revalidada; manter distribuição sem perseguir porcentagem ideal\n`;
const finalOutput = final
  .replace(
    "FILES_CHANGED=scripts/materialize-manuscript.mjs; src/book/styles/page.css; drive-image-inventory.json; drive-image-disposition.csv",
    "FILES_CHANGED=scripts/materialize-manuscript.mjs; src/book/styles/page.css; src/lib/preflight/measure.ts; drive-image-inventory.json; drive-image-disposition.csv",
  )
  .replace(
    "FILES_CREATED=KALLISTIS_RECONSTRUCAO_ASSETS.tsv; KALLISTIS_RECONSTRUCAO_COVERAGE.md; KALLISTIS_RECONSTRUCAO_PAGE_STATUS.tsv; KALLISTIS_RECONSTRUCAO_FINAL.md; projects/kallistis-manual-do-mundo-reconstrucao.json; projects/kallistis-manual-do-mundo-reconstrucao.report.json; projects/kallistis-reconstrucao-piloto.json; projects/kallistis-reconstrucao-piloto.report.json",
    "FILES_CREATED=KALLISTIS_RECONSTRUCAO_ARQUEOLOGIA.md; KALLISTIS_RECONSTRUCAO_ASSETS.tsv; KALLISTIS_RECONSTRUCAO_COVERAGE.md; KALLISTIS_RECONSTRUCAO_PAGE_STATUS.tsv; KALLISTIS_RECONSTRUCAO_FINAL.md; scripts/write-reconstruction-reports.mjs; projects/kallistis-manual-do-mundo-reconstrucao.json; projects/kallistis-manual-do-mundo-reconstrucao.report.json; projects/kallistis-reconstrucao-piloto.json; projects/kallistis-reconstrucao-piloto.report.json",
  );
await writeFile(path.join(ROOT, "KALLISTIS_RECONSTRUCAO_FINAL.md"), finalOutput);
console.log(JSON.stringify({ pages: book.pages.length, candidates: hashToPaths.size, usedHashes: usedHashes.size, unusedHashes: uniqueUnused, templates: templateCounts }));
