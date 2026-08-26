#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bookRoot = path.join(root, "KALLISTIS_LIVROS", "KALLISTIS_MANUAL_DO_MUNDO");
const packageRoot = path.join(bookRoot, "KALLISTIS_VELARIM_GLIFOS");
const manuscriptPath = path.join(
  bookRoot,
  "PACOTE_FINAL_RENDERIZACAO_MANUAL_DO_MUNDO",
  "00_MANUSCRITO_CANONICO",
  "KALLISTIS_MANUSCRITO_FONTE_UNICA_v3.1_FREEZE.md",
);
const referencePdfPath = path.join(bookRoot, "PRONTOV1_compressed (1).pdf");
const manifestPath = path.join(packageRoot, "MANIFESTO_GLIFOS.json");
const outputRoot = path.join(root, "tmp", "rebuild-v4");
const normalizedPath = path.join(outputRoot, "KALLISTIS_MANUSCRITO_V4_NORMALIZADO.md");
const publicGlyphRoot = path.join(root, "public", "assets", "velarim", "glifos");
const checkpointPath = path.join(
  root,
  "projects",
  "KALLISTIS_MANUAL_DO_MUNDO_v4_REBUILD.ingest.json",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytesSha256 = async (filePath) => sha256(await readFile(filePath));

const [manuscript, manifest] = await Promise.all([
  readFile(manuscriptPath, "utf8"),
  readFile(manifestPath, "utf8").then(JSON.parse),
]);

if (manifest.glyph_count !== 62 || manifest.glyphs?.length !== 62) {
  throw new Error(`GLYPH_MANIFEST_INVALID: esperado 62, recebido ${manifest.glyphs?.length ?? 0}`);
}

const sourceLines = manuscript.replace(/\r\n?/gu, "\n").split("\n");
let glyphIndex = 0;
const normalizedLines = sourceLines.map((line) => {
  if (!/data:image\/png;base64,/iu.test(line)) return line;
  const glyph = manifest.glyphs[glyphIndex++];
  if (!glyph) throw new Error("GLYPH_SOURCE_COUNT_EXCEEDED: mais ocorrências Base64 que glifos no manifesto");
  return `![${glyph.glyph_id}](/assets/velarim/glifos/${path.basename(glyph.arquivo)})`;
});

if (glyphIndex !== 62) {
  throw new Error(`GLYPH_SOURCE_COUNT_MISMATCH: encontrados ${glyphIndex}, esperado 62`);
}

await mkdir(outputRoot, { recursive: true });
await mkdir(publicGlyphRoot, { recursive: true });
for (const glyph of manifest.glyphs) {
  const source = path.join(packageRoot, glyph.arquivo);
  const target = path.join(publicGlyphRoot, path.basename(glyph.arquivo));
  const actual = await bytesSha256(source);
  if (actual !== glyph.sha256) {
    throw new Error(`GLYPH_HASH_MISMATCH: ${glyph.glyph_id} ${actual} != ${glyph.sha256}`);
  }
  await copyFile(source, target);
}

const normalized = normalizedLines.join("\n");
const base64MaterializedOccurrences = (normalized.match(/data:image\/png;base64,/giu) ?? []).length;
if (base64MaterializedOccurrences !== 0) {
  throw new Error(`BASE64_MATERIALIZED_OCCURRENCES=${base64MaterializedOccurrences}`);
}
await writeFile(normalizedPath, normalized, "utf8");

const checkpoint = {
  checkpoint: "A_INGESTAO",
  generatedAt: new Date().toISOString(),
  manuscriptPath,
  manuscriptSha256: sha256(manuscript),
  manuscriptBytes: Buffer.byteLength(manuscript),
  manuscriptLines: sourceLines.length,
  normalizedManuscriptPath: normalizedPath,
  normalizedManuscriptSha256: sha256(normalized),
  normalizedManuscriptBytes: Buffer.byteLength(normalized),
  normalizedManuscriptLines: normalizedLines.length,
  base64SourceOccurrences: glyphIndex,
  base64MaterializedOccurrences,
  base64TextNodes: 0,
  glyphAssets: 62,
  glyphManifest: manifestPath,
  glyphManifestSha256: sha256(JSON.stringify(manifest)),
  glyphPublicRoot: publicGlyphRoot,
  referencePdfPath,
  referencePdfSha256: await bytesSha256(referencePdfPath),
  status: "PASS",
};
await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
console.log(JSON.stringify(checkpoint, null, 2));
