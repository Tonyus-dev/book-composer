#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, cp, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "VELARIM_BOOKMAKER");
const manuscriptPath = path.join(sourceRoot, "VELARIM_MANUAL_DEFINITIVO_BOOKMAKER.md");
const outputPath = path.join(root, "projects", "velarim-manual-definitivo.json");
const publicRoot = path.join(root, "public", "assets", "velarim");
const base = JSON.parse(await readFile(path.join(root, "projects", "KALLISTIS_manual_do_mundo_final_book.json"), "utf8"));
const markdown = await readFile(manuscriptPath, "utf8");
const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
const hash = createHash("sha256").update(markdown).digest("hex");

await mkdir(path.join(publicRoot, "silmain"), { recursive: true });
await cp(path.join(sourceRoot, "assets", "capa.png"), path.join(publicRoot, "capa.png"));
await cp(path.join(sourceRoot, "assets", "silmain"), path.join(publicRoot, "silmain"), { recursive: true });

const clean = (value) => value.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
const blocks = [];
let h1 = "";
let h2 = "";
let h3 = "";
let i = 7; // skip the YAML front matter
const add = (type, raw, line, extra = {}) => {
  const content = raw.trim();
  if (!content) return;
  blocks.push({ id: `velarim-${line}-${blocks.length}`, type, raw: content, line, h1, h2, h3, ...extra });
};
while (i < lines.length) {
  const line = lines[i] ?? "";
  if (!line.trim()) { i += 1; continue; }
  const heading = line.match(/^(#{1,5})\s+(.+)$/u);
  if (heading) {
    const level = heading[1].length;
    const text = clean(heading[2]);
    add("heading", line, i + 1, { level, text });
    if (level === 1) { h1 = text; h2 = ""; h3 = ""; }
    if (level === 2) { h2 = text; h3 = ""; }
    if (level === 3) h3 = text;
    i += 1; continue;
  }
  const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/u);
  if (image) { add("image", line, i + 1, { alt: image[1], src: image[2] }); i += 1; continue; }
  if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?\s*:?-{3,}/u)) {
    const table = [];
    while (i < lines.length && lines[i].includes("|")) table.push(lines[i++]);
    add("table", table.join("\n"), i - table.length + 1); continue;
  }
  if (/^\s*>/.test(line)) { const q = []; while (i < lines.length && (/^\s*>/.test(lines[i]) || !lines[i].trim())) q.push(lines[i++].replace(/^\s*>\s?/, "")); add("quote", q.join("\n"), i - q.length + 1); continue; }
  if (/^\s*(?:[-*+] |\d+[.)] )/.test(line)) { const list = []; while (i < lines.length && (/^\s*(?:[-*+] |\d+[.)] )/.test(lines[i]) || !lines[i].trim())) list.push(lines[i++]); add("text", list.join("\n"), i - list.length + 1); continue; }
  if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { add("divider", line, i + 1); i += 1; continue; }
  const paragraph = []; const start = i;
  while (i < lines.length && lines[i].trim() && !/^#{1,5}\s+/.test(lines[i]) && !/^!\[/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\s*(?:[-*+] |\d+[.)] )/.test(lines[i])) paragraph.push(lines[i++]);
  add("text", paragraph.join("\n\n"), start + 1);
}

const expandedBlocks = [];
for (const block of blocks) {
  if (block.type !== "image" && block.type !== "heading" && block.raw.length > 700) {
    let rest = block.raw;
    let part = 0;
    while (rest.length > 700) {
      let cut = rest.lastIndexOf(" ", 700);
      if (cut < 200) cut = 700;
      expandedBlocks.push({ ...block, id: `${block.id}-part-${part++}`, raw: rest.slice(0, cut) });
      rest = rest.slice(cut).trimStart();
    }
    if (rest) expandedBlocks.push({ ...block, id: `${block.id}-part-${part}`, raw: rest });
  } else expandedBlocks.push(block);
}
const pageBlocks = [];
let current = [];
let chars = 0;
const flush = () => { if (current.length) { pageBlocks.push(current); current = []; chars = 0; } };
for (const block of expandedBlocks) {
  const cost = block.type === "image" ? 800 : block.raw.length;
  if (current.length && (chars + cost > 500 || block.type === "heading" && chars > 400)) flush();
  current.push(block); chars += cost;
  if (block.type === "image") flush();
}
flush();

const makeBlock = (b) => {
  const materialization = { generatedBy: "kallistis-materializer", materializationVersion: 1, scope: "ALL", sourceStartLine: b.line, sourceRaw: b.raw };
  if (b.type === "heading") return { id: b.id, type: "heading", level: Math.min(5, b.level), text: b.text, materialization };
  if (b.type === "image") return { id: b.id, type: "image", src: `/assets/velarim/${b.src.startsWith("assets/silmain/") ? b.src.slice("assets/".length) : b.src}`, alt: b.alt, fit: "contain", position: "top", centered: true, width: "100%", height: "72mm", materialization };
  if (b.type === "quote") return { id: b.id, type: "quote", text: b.raw, materialization };
  if (b.type === "divider") return { id: b.id, type: "divider", ornament: true, materialization };
  if (b.type === "table") return { id: b.id, type: "text", content: b.raw, role: "body", materialization };
  return { id: b.id, type: "text", content: b.raw, role: "body", materialization };
};
const pages = [{ id: "velarim-cover", template: "cover", coverMode: "art-only", title: "VELARIM", settings: { header: false, footer: false, pageNumber: false, columns: 1, background: "obsidian", fullBleed: false }, blocks: [{ id: "velarim-cover-art", type: "image", src: "/assets/velarim/capa.png", alt: "Capa oficial de VELARIM", position: "full", fullBleed: false, fit: "contain" }] }];
for (const [n, group] of pageBlocks.entries()) pages.push({ id: `velarim-p-${String(n + 1).padStart(4, "0")}`, template: n === 0 ? "front_matter" : group.some((b) => b.type === "heading" && b.level === 1) ? "part_opening" : "narrative", variant: "default", title: group.find((b) => b.type === "heading")?.text, settings: { header: n > 0, footer: n > 0, pageNumber: n > 0, columns: 1, background: "paper", fullBleed: false }, blocks: group.map(makeBlock) });
const ids = pages.map((p) => p.id);
const book = { ...base, schemaVersion: 1, meta: { ...base.meta, title: "VELARIM", subtitle: "Manual Definitivo", edition: "Edição de revisão · 22 de agosto de 2026", firstFolio: 1 }, tokens: { ...base.tokens, pageWidth: "140mm", pageHeight: "210mm", bleed: "0mm" }, nodes: [{ id: "velarim-node", label: "VELARIM — Manual Definitivo", kind: "front", pageIds: ids }], pages, spreads: [], recipes: [], productionPlan: { id: "velarim", title: "VELARIM", source: path.relative(root, manuscriptPath), cover: "assets/capa.png", pageWidth: "140mm", pageHeight: "210mm", sourceSha256: hash } };
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(book, null, 2)}\n`);
console.log(`VELARIM_SOURCE_SHA256=${hash}`);
console.log(`VELARIM_BLOCKS=${blocks.length}`);
console.log(`VELARIM_PAGES=${pages.length}`);
console.log(`VELARIM_GLYPHS=62`);
console.log(`OUTPUT=${outputPath}`);
