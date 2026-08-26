import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_5_316_REBUILD.json");
const outputPath = path.join(root, "projects/KALLISTIS_MANUAL_DO_MUNDO_v4_6_REBUILD.json");
const book = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (book.pages.length !== 316) throw new Error(`Base inesperada: ${book.pages.length} páginas`);
if (book.pages[0]?.id !== "all-toc-001") throw new Error("A base não começa pelo sumário esperado");

const cover = {
  id: "all-cover-v4-6",
  template: "cover",
  variant: "default",
  coverMode: "art-only",
  title: "KALLISTIS — MANUAL DO MUNDO",
  subtitle: "",
  settings: {
    header: false,
    footer: false,
    pageNumber: false,
    columns: 1,
    background: "obsidian",
    fullBleed: true,
  },
  fixed: true,
  blocks: [
    {
      id: "all-v4-6-cover-art",
      type: "image",
      src: "/assets/editorial/v4_6/capa.png",
      alt: "Capa de KALLISTIS — Manual do Mundo",
      position: "full",
      fullBleed: true,
      fit: "cover",
      width: "100%",
      height: "100%",
    },
  ],
};

book.pages.unshift(cover);
if (book.pages.length !== 317) throw new Error(`Resultado inesperado: ${book.pages.length} páginas`);

book.meta = {
  ...book.meta,
  revision: "v4.6 proof — user-supplied cover",
  sourceProof: "v4.5 316-page proof with one new cover page",
  surgicalFix: {
    ...(book.meta.surgicalFix || {}),
    v46Cover: "/assets/editorial/v4_6/capa.png",
    v46BasePages: 316,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(book, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, pages: book.pages.length, cover: cover.blocks[0].src }, null, 2));
