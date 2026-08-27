import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_2_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_3_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 326 || book.meta?.revision !== "v4.2 proof") {
  throw new Error(`Base inesperada: pages=${book.pages.length}, revision=${book.meta?.revision}`);
}

const page = (id) => book.pages.find((item) => item.id === id);
const mustPage = (id) => {
  const item = page(id);
  if (!item) throw new Error(`Página ausente: ${id}`);
  return item;
};
const removePage = (id) => {
  const index = book.pages.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Não foi possível remover página: ${id}`);
  book.pages.splice(index, 1);
};
const textOf = (block) => block.text ?? block.content ?? "";
const imageBlock = (id, src, alt, extra = {}) => ({
  id, type: "image", src, alt, position: "flow", fit: "contain",
  width: "22mm", height: "16mm", centered: true, frameAspectRatio: 1,
  layoutRole: "EDITORIAL_IMAGE",
  materialization: {
    assetStatus: "MATERIALIZED",
    assetCatalogReference: `IMAGENS/KALLISTIS_LIVRO/${extra.assetCode ?? id}`,
    assetSourceBlockId: id,
  },
  ...extra,
});

// Vethari: mesmo asset, apenas reposicionado para revelar o rosto.
const vethari = mustPage("all-page-0014");
const vethariArt = vethari.blocks.find((block) => block.id === "asset-src-1f3711bdd1b9409fbffc-21d56c6e7d");
if (!vethariArt || vethariArt.src !== "/assets/handoff/approved/p012_mirveth_thuvel_pb.png") throw new Error("Asset Vethari inesperado");
Object.assign(vethariArt, { objectX: 50, objectY: 18, fit: "cover" });

// Página 24: metade inferior da imagem anexada, sem substituir o texto.
const p24 = mustPage("all-page-0021");
p24.blocks.push(imageBlock("asset-v43-page24-open006-lower-half", "/assets/v1.5-acervo/a7ed1f3058911beb61e53614.png", "Conduzindo KALLISTIS — metade inferior", {
  position: "flow", fit: "cover", width: "100%", height: "44mm", frameAspectRatio: 1.65,
  objectX: 50, objectY: 76, cropWindow: { x: 0, y: 50, width: 100, height: 50 },
  span: "full", assetCode: "OPEN-006_CONDUZINDO_KALLISTIS_CANDIDATO_lower-half",
}));

// História em Marcos: reflow local da abertura, sem reduzir a tipografia.
const historyOpening = mustPage("all-page-0022");
historyOpening.template = "narrative";
historyOpening.settings = { ...historyOpening.settings, columns: 2 };

// Remoção autorizada do teaser de Lightbringers; a seção principal permanece.
removePage("all-page-0039");

// Thaeraen: intro e desenvolvimento passam a uma única composição.
const thaeraenIntro = mustPage("all-page-0049");
const thaeraen = mustPage("all-page-0050");
const introBlocks = thaeraenIntro.blocks.filter((block) => !(block.type === "heading" && textOf(block) === "A profecia de Thaeraen"));
thaeraen.blocks.push(...introBlocks);
const thaeraenArt = thaeraen.blocks.find((block) => block.type === "image");
if (thaeraenArt) thaeraenArt.height = "56mm";
removePage("all-page-0049");

// Retira somente a pequena imagem do Mapa em Duas Camadas.
const mapPage = mustPage("all-page-0060");
mapPage.blocks = mapPage.blocks.filter((block) => block.id !== "asset-src-35d95d8448924dcbf476-a40885dff2");

// Abertura da Parte III com arte canônica já aprovada.
const partIII = mustPage("all-page-0087");
partIII.blocks.splice(1, 0, imageBlock("asset-v43-part-iii-opening", "/assets/handoff/approved/parte-iii-povos-oficios-comunidades-vivas.png", "Povos, Ofícios e Comunidades Vivas", {
  position: "full", fit: "cover", fullBleed: true, layoutRole: "FULL_ART",
  width: "100%", height: "100%", assetCode: "OPEN-002_POVOS_COMUNIDADES_CAMINHOS",
}));

// Índice dos nove Povos: imagem reduzida e tabela no mesmo fluxo.
const peoplesIndex = mustPage("all-page-0090");
const peoplesTable = mustPage("all-page-0091");
const table = peoplesTable.blocks.find((block) => block.type === "table");
if (!table) throw new Error("Tabela dos nove Povos ausente");
peoplesIndex.settings = { ...peoplesIndex.settings, columns: 1 };
const peoplesArt = peoplesIndex.blocks.find((block) => block.type === "image");
if (!peoplesArt) throw new Error("Arte do índice dos nove Povos ausente");
Object.assign(peoplesArt, { position: "flow", fit: "contain", width: "100%", height: "28mm", fullBleed: false });
delete peoplesArt.frameAspectRatio;
peoplesIndex.blocks.push({ ...table, id: "src-a874ac5e83b6b032f0fa-v43-joined" });
removePage("all-page-0091");

// Selo de recurso no fim físico de cada Ofício.
const offices = [
  ["Guardião", "all-page-0127", "all-page-0130", "G3", "/assets/complete/support/offices/guardiao-recurso.png"],
  ["Duelista", "all-page-0130", "all-page-0133", "D1", "/assets/complete/support/offices/duelista-recurso.png"],
  ["Atirador", "all-page-0133", "all-page-0136", "A3", "/assets/complete/support/offices/atirador-recurso.png"],
  ["Tecelão", "all-page-0136", "all-page-0139", "T3", "/assets/complete/support/offices/tecelao-recurso.png"],
  ["Curador", "all-page-0139", "all-page-0142", "C1", "/assets/complete/support/offices/curador-recurso.png"],
  ["Evocador", "all-page-0142", "all-page-0145", "E2", "/assets/complete/support/offices/evocador-recurso.png"],
  ["Artífice", "all-page-0145", "all-page-0148", "AR2", "/assets/complete/support/offices/artifice-recurso.png"],
  ["Batedor", "all-page-0148", "all-page-0151", "B1", "/assets/complete/support/offices/batedor-recurso.png"],
];
for (const [name, startId, nextId, code, src] of offices) {
  const start = book.pages.findIndex((item) => item.id === startId);
  const next = book.pages.findIndex((item) => item.id === nextId);
  if (start < 0 || next <= start) throw new Error(`Intervalo de Ofício inválido: ${name}`);
  const target = book.pages[next - 1];
  target.blocks.push(imageBlock(`asset-v43-office-${code.toLowerCase()}`, src, `Selo ${code} — ${name}`, {
    assetCode: `${code}_${name}`, spaceBefore: 2, spaceAfter: 0,
  }));
}

// Marco 9 permanece com o fluxo circundante.
const marco9 = book.pages.find((item) => item.blocks.some((block) => /marco\s+9/i.test(textOf(block))));
if (!marco9 || marco9.blocks.length < 3) throw new Error("Marco 9 ficou sem fluxo circundante");

// O sumário acompanha o reflow local por título real, sem números congelados.
const normalized = (value) => String(value).toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const pageSearchText = (item) => normalized([
  item.title, item.chapter, ...(item.blocks ?? []).map((block) => textOf(block)),
].filter(Boolean).join(" "));
for (const tocPage of book.pages.filter((item) => item.template === "toc")) {
  for (const block of tocPage.blocks.filter((item) => item.type === "toc")) {
    for (const entry of block.entries ?? []) {
      const label = normalized(entry.label);
      const exact = book.pages.findIndex((item) => [item.title, item.chapter, ...(item.blocks ?? []).filter((candidate) => candidate.type === "heading").map((candidate) => candidate.text)]
        .filter(Boolean).some((candidate) => normalized(candidate) === label));
      const found = exact >= 0 ? exact : book.pages.findIndex((item) => pageSearchText(item).includes(label));
      if (found >= 0) entry.page = (book.meta.firstFolio ?? 1) + found;
      else if (entry.label === "Glossário essencial") entry.page = (book.meta.firstFolio ?? 1) + book.pages.length - 1;
    }
  }
}

book.meta = {
  ...book.meta,
  revision: "v4.3 proof",
  surgicalFix: {
    ...book.meta.surgicalFix,
    baseline: "V4.2_PRINT_SOURCE",
    sourceProof: "v4.3 surgical corrections materialized in the explicit /print project source",
    v43Corrections: [
      "vethari-crop-face", "page24-open006-lower-half", "history-local-reflow", "remove-lightbringers-teaser",
      "thaeraen-merge", "remove-map-secondary-image", "part-iii-approved-art", "peoples-index-join",
      "office-resource-seals", "marco9-flow-preserved",
    ],
    authorizedRemoval: "all-page-0039 teaser Os Lightbringers; no other canonical prose removed",
  },
};
fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, revision: book.meta.revision }, null, 2));
