import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_4_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_5_REFRAME_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 317 || book.meta?.revision !== "v4.4 proof") {
  throw new Error("A base precisa ser a prova v4.4 de 317 páginas");
}

const targets = new Map([
  [268, { id: "all-page-0269", src: "/assets/complete/bestiary/serpente.png" }],
  [296, { id: "all-page-0297", src: "/assets/v1.5-acervo/e85da577e91287647e97e2db.png" }],
  [297, { id: "all-page-0298", src: "/assets/v1.5-acervo/6f46eb97e78fc9adf637a069.png" }],
  [298, { id: "all-page-0299", src: "/assets/v1.5-acervo/e3fd4744e03d67c218f059f8.png" }],
  [305, { id: "all-page-0306", src: "/assets/complete/bestiary/cao-leao.png" }],
  [307, { id: "all-page-0308", src: "/assets/complete/bestiary/roedor.png" }],
]);

for (const [folio, target] of targets) {
  const page = book.pages.find((candidate) => candidate.id === target.id);
  if (!page) throw new Error(`Página física ${folio} ausente`);
  const images = page.blocks.filter((block) => block.type === "image");
  if (images.length !== 1 || images[0].src !== target.src) {
    throw new Error(`Asset inesperado na página física ${folio}`);
  }
  images[0].fit = "cover";
  images[0].objectX = 50;
  images[0].objectY = 50;
}

const protectedIds = ["all-page-0222", "all-page-0223"];
const base = JSON.parse(fs.readFileSync(inputPath, "utf8"));
for (const id of protectedIds) {
  const before = JSON.stringify(base.pages.find((page) => page.id === id));
  const after = JSON.stringify(book.pages.find((page) => page.id === id));
  if (before !== after) throw new Error(`Página protegida alterada: ${id}`);
}

book.meta = {
  ...book.meta,
  revision: "v4.5 proof — six-image reframing",
  sourceProof: "v4.4 six-image framing correction only",
  surgicalFix: {
    ...(book.meta.surgicalFix || {}),
    v45ReframeOnly: [268, 296, 297, 298, 305, 307],
    protectedPages: [221, 222],
  },
};

fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, reframed: [...targets.keys()], protected: [221, 222] }, null, 2));
