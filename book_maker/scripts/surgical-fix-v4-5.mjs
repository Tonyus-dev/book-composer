import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_4_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_5_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 317) throw new Error(`Base inesperada: ${book.pages.length} páginas`);
if (book.meta?.revision !== "v4.4 proof") throw new Error("A base não é a prova v4.4");

const pageAt = (physicalPage) => book.pages[physicalPage - 1];
const imageBlock = (page, label) => {
  const block = page.blocks.find((candidate) => candidate.type === "image");
  if (!block) throw new Error(`Imagem ausente em ${label}`);
  return block;
};

const p4 = pageAt(4);
const p5 = pageAt(5);
const p221 = pageAt(221);
const p222 = pageAt(222);
if (p4.id !== "all-page-0001" || p5.id !== "all-page-0002") throw new Error("IDs de front matter inesperados");
if (p221.id !== "all-page-0222" || p222.id !== "all-page-0223") throw new Error("IDs de páginas 221/222 inesperados");

const wordmark = imageBlock(p4, "página 4");
wordmark.src = "/assets/editorial/v4_5/WORDMARK.png";
wordmark.alt = "KALLISTIS wordmark";
wordmark.fit = "contain";
wordmark.objectX = 50;
wordmark.objectY = 50;
wordmark.materialization = {
  ...(wordmark.materialization || {}),
  assetStatus: "APPROVED_USER_SUPPLIED",
  assetCatalogReference: "/assets/editorial/v4_5/WORDMARK.png",
};

const beforeP5Images = p5.blocks.filter((block) => block.type === "image").length;
p5.blocks = p5.blocks.filter((block) => block.type !== "image");
if (beforeP5Images !== 1 || p5.blocks.some((block) => block.type === "image")) {
  throw new Error("A imagem da página 5 não foi removida exatamente");
}

const rodada = imageBlock(p221, "página 221");
rodada.src = "/assets/editorial/v4_5/rodada.png";
rodada.alt = "Uma rodada — AM, AP, AR e AL";
rodada.fit = "contain";
rodada.objectX = 50;
rodada.objectY = 50;
rodada.materialization = {
  ...(rodada.materialization || {}),
  assetStatus: "APPROVED_USER_SUPPLIED",
  assetCatalogReference: "/assets/editorial/v4_5/rodada.png",
};

const dano = imageBlock(p222, "página 222");
dano.src = "/assets/editorial/v4_5/dano.png";
dano.alt = "Fórmula de dano";
dano.fit = "contain";
dano.objectX = 50;
dano.objectY = 50;
dano.materialization = {
  ...(dano.materialization || {}),
  assetStatus: "APPROVED_USER_SUPPLIED",
  assetCatalogReference: "/assets/editorial/v4_5/dano.png",
};

book.meta = {
  ...(book.meta || {}),
  revision: "v4.5 proof",
  surgicalFix: {
    ...(book.meta?.surgicalFix || {}),
    v45Corrections: [
      "p4-wordmark-replaced",
      "p5-image-removed",
      "p221-image-replaced",
      "p222-image-replaced",
    ],
  },
};

fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, p4: wordmark.src, p5Images: 0, p221: rodada.src, p222: dano.src }, null, 2));
