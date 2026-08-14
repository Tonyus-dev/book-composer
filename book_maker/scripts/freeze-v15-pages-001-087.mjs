#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const projectPath = "projects/kallistis-materializado-completo-v1.5-400p-candidate.json";
const freezePath = "projects/kallistis-materializado-pages-001-087-freeze.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pageHash = (page) => sha256(JSON.stringify(page));

const book = JSON.parse(await readFile(projectPath, "utf8"));
const page = (number) => book.pages[number - 1];
const image = (pageObject) => pageObject.blocks.find((block) => block.type === "image");

const p59 = page(59);
const p60 = page(60);
const fenda = image(p60);
if (!p59 || !p60 || !fenda || fenda.src !== "/assets/partes/fenda-kethrell.png") {
  throw new Error("Estado inesperado nas páginas 59–60; nenhuma alteração aplicada.");
}

// A arte vertical da página 60 passa a ocupar o vão editorial da 59.
p60.blocks = p60.blocks.filter((block) => block.id !== fenda.id);
const movedFenda = {
  ...fenda,
  position: "flow",
  width: "100%",
  height: "108mm",
  fit: "contain",
  frameAspectRatio: 0.667,
  materialization: {
    ...(fenda.materialization ?? {}),
    editorialCorrection: "p60-fenda-moved-to-p59",
  },
};
p59.blocks.push(movedFenda);

const p60Context = {
  id: "correction-fenda-context-p60",
  type: "image",
  src: "/assets/handoff/approved/p021_022_kethrell_faccao_cientifica_pb.jpg",
  alt: "Kethrell e a Facção Científica — imagem contextual em preto e branco",
  position: "right",
  width: "30%",
  height: "50mm",
  fit: "contain",
  objectX: 50,
  objectY: 50,
  frameAspectRatio: 0.92,
  layoutRole: "SUPPORT_IMAGE",
  materialization: {
    generatedBy: "kallistis-editorial-correction",
    materializationVersion: 5,
    scope: "COMPLETO",
    generated: true,
    sourceBlockId: p60.blocks[0]?.materialization?.sourceBlockId ?? "editorial-p60-fenda-context",
    sourceType: "heading",
    assetStatus: "COVERED_HIGH",
    layoutRole: "SUPPORT_IMAGE",
    editorialCorrection: "p60-fenda-context",
    editorialCorrectionAdded: true,
  },
};
p60.blocks.splice(1, 0, p60Context);

const p68 = page(68);
const p68Image = image(p68);
if (!p68Image) throw new Error("Imagem da página 68 não encontrada.");
p68Image.src = "/assets/v1.5-acervo/thur-daer-pb.png";
p68Image.alt = "Vale de Thur-Daer — mapa em preto e branco";
p68Image.materialization = {
  ...(p68Image.materialization ?? {}),
  editorialCorrection: "thur-daer-pb",
};

const p77 = page(77);
const p77Image = p77.blocks.find((block) => block.id === "correction-distribuicao-p77");
if (!p77Image) throw new Error("Imagem da página 77 não encontrada.");
p77Image.centered = true;
p77Image.width = "82%";
p77Image.materialization = {
  ...(p77Image.materialization ?? {}),
  editorialCorrection: "distribuicao-p77-centered",
};

const pages = book.pages.slice(0, 87);
const freeze = {
  freeze: "KALLISTIS v1.5 — páginas 001–087",
  frozenAt: new Date().toISOString(),
  project: projectPath,
  projectSha256: sha256(JSON.stringify(book)),
  pageCount: 87,
  pageHashes: Object.fromEntries(pages.map((current, index) => [String(index + 1).padStart(3, "0"), pageHash(current)])),
  permittedCorrections: [
    "p60-fenda-moved-to-p59",
    "p60-fenda-context",
    "thur-daer-pb",
    "distribuicao-p77-centered",
  ],
  immutableAfterFreeze: true,
};

await writeFile(projectPath, `${JSON.stringify(book, null, 2)}\n`, "utf8");
await writeFile(freezePath, `${JSON.stringify(freeze, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ projectPath, freezePath, projectSha256: freeze.projectSha256, pageCount: freeze.pageCount }, null, 2));
