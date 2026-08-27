import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_3_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_4_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 323 || book.meta?.revision !== "v4.3 proof") {
  throw new Error(`Base inesperada: pages=${book.pages.length}, revision=${book.meta?.revision}`);
}
const page = (id) => book.pages.find((item) => item.id === id);
const textOf = (block) => block.text ?? block.content ?? "";
const normalize = (value) => String(value).toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();

// Reenquadramento cirúrgico: os src permanecem invariantes.
const artPages = [
  ["all-page-0269", "/assets/complete/bestiary/serpente.png"],
  ["all-page-0297", "/assets/v1.5-acervo/e85da577e91287647e97e2db.png"],
  ["all-page-0298", "/assets/v1.5-acervo/6f46eb97e78fc9adf637a069.png"],
  ["all-page-0299", "/assets/v1.5-acervo/e3fd4744e03d67c218f059f8.png"],
  ["all-page-0306", "/assets/complete/bestiary/cao-leao.png"],
  ["all-page-0308", "/assets/complete/bestiary/roedor.png"],
];
for (const [pageId, expectedSrc] of artPages) {
  const target = page(pageId);
  if (!target) throw new Error(`Página de arte ausente: ${pageId}`);
  const art = target.blocks.find((block) => block.type === "image");
  if (!art || art.src !== expectedSrc) throw new Error(`Asset trocado ou ausente em ${pageId}`);
  art.fit = "contain";
  art.objectX = 50;
  art.objectY = 50;
}

// Marco 9: a página existente recebe o início do fluxo seguinte.
// O texto não é removido nem duplicado; apenas atravessa a quebra local.
const marcoPage = page("all-page-0123-continuation");
const followingPage = page("all-page-0124");
if (!marcoPage || !followingPage) throw new Error("Fluxo do Marco 9 ausente");
if (!marcoPage.blocks.some((block) => /marco\s+9/i.test(textOf(block)))) throw new Error("Texto do Marco 9 ausente");
marcoPage.settings = { ...marcoPage.settings, columns: 2 };
const movedBlocks = followingPage.blocks.splice(0, 8);
marcoPage.blocks.push(...movedBlocks);

// Remoção explicitamente autorizada das páginas físicas 317–322 da v4.3.
// A página de fechamento original fica preservada e passa a ser a última.
const removedIds = [
  "all-page-0318", "all-page-0319", "all-page-0320",
  "all-page-0321", "all-page-0322", "all-page-0323",
];
for (const id of removedIds) {
  const index = book.pages.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Página autorizada ausente: ${id}`);
  book.pages.splice(index, 1);
}

// Recalcula o sumário por título/heading real e remove entradas sem destino
// correspondentes às páginas autorizadamente removidas.
const removedLabels = new Set(["Ficha e resumo de regras", "Glossário essencial"].map(normalize));
const pageSearchText = (item) => normalize([
  item.title, item.chapter, ...(item.blocks ?? []).map((block) => textOf(block)),
].filter(Boolean).join(" "));
for (const tocPage of book.pages.filter((item) => item.template === "toc")) {
  for (const block of tocPage.blocks.filter((item) => item.type === "toc")) {
    block.entries = (block.entries ?? []).filter((entry) => !removedLabels.has(normalize(entry.label)));
    for (const entry of block.entries) {
      const label = normalize(entry.label);
      const exact = book.pages.findIndex((item) => [
        item.title, item.chapter,
        ...(item.blocks ?? []).filter((candidate) => candidate.type === "heading").map((candidate) => candidate.text),
      ].filter(Boolean).some((candidate) => normalize(candidate) === label));
      const found = exact >= 0 ? exact : book.pages.findIndex((item) => pageSearchText(item).includes(label));
      if (found >= 0) entry.page = (book.meta.firstFolio ?? 1) + found;
    }
  }
}

book.meta = {
  ...book.meta,
  revision: "v4.4 proof",
  surgicalFix: {
    ...book.meta.surgicalFix,
    baseline: "V4.3_APPROVED",
    sourceProof: "v4.4 Marco 9 local reflow and authorized physical page removal",
    v44Corrections: [
      "marco9-local-flow-repair",
      "reframe-existing-art-pages-268-296-297-298-305-307",
      "remove-authorized-pages-317-322",
    ],
    authorizedPageRemoval: removedIds,
    noAssetSwap: true,
    noCanonicalTextRewrite: true,
  },
};
fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, movedBlocks: movedBlocks.length, removedIds, artPages }, null, 2));

