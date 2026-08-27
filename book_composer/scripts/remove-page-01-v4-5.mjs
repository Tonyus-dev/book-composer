import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_5_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_5_316_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 317) throw new Error(`Base v4.5 inesperada: ${book.pages.length} páginas`);
if (book.pages[0]?.id !== "all-cover-approved") throw new Error("A página física 1 não é a capa aprovada esperada");

const removed = book.pages.shift();
if (book.pages.length !== 316) throw new Error(`Resultado inesperado: ${book.pages.length} páginas`);

book.meta = {
  ...book.meta,
  revision: "v4.5 proof — 316 pages",
  sourceProof: "v4.5 approved proof with physical page 1 removed only",
  surgicalFix: {
    ...(book.meta.surgicalFix || {}),
    v45PageRemovalOnly: { removedPageId: removed.id, removedPhysicalPage: 1 },
  },
};

fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, removed: removed.id }, null, 2));
