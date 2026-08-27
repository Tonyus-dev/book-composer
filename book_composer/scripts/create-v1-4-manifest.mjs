#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidatePath = path.join(
  root,
  "projects/kallistis-materializado-completo-v1.4-400p-candidate.json",
);
const manifestPath = path.join(
  root,
  "projects/kallistis-materializado-completo-v1.4-400p-candidate.prepress-manifest.json",
);
const outputPath = path.join(root, "KALLISTIS_Manual_do_Mundo_v1.4_400p_CANDIDATO.manifest.json");
const book = JSON.parse(readFileSync(candidatePath, "utf8"));
const prepress = JSON.parse(readFileSync(manifestPath, "utf8"));
const byDerived = new Map((prepress.assets ?? []).map((asset) => [asset.derived, asset]));

function physicalSize(block, page) {
  const parse = (value) =>
    typeof value === "string" && value.endsWith("mm") ? Number(value.slice(0, -2)) : null;
  const pct = (value) =>
    typeof value === "string" && value.endsWith("%") ? Number(value.slice(0, -1)) : null;
  const width =
    parse(block.width) ??
    (pct(block.width) ? (112 * pct(block.width)) / 100 : block.fullBleed ? 150 : 112);
  const height =
    parse(block.height) ??
    (pct(block.height) ? (180 * pct(block.height)) / 100 : block.fullBleed ? 220 : 180);
  return { widthMm: width, heightMm: height };
}
function resolveAsset(src) {
  const chain = [];
  let item = byDerived.get(src);
  while (item && !chain.includes(item.derived)) {
    chain.push(item.derived);
    const parent = item.source;
    const next = byDerived.get(parent);
    if (!next)
      return {
        item,
        chain,
        originalSha256: item.source_sha256,
        derivedSha256: item.derived_sha256,
      };
    item = next;
  }
  return {
    item: byDerived.get(src),
    chain,
    originalSha256: byDerived.get(src)?.source_sha256 ?? null,
    derivedSha256: byDerived.get(src)?.derived_sha256 ?? null,
  };
}
const entries = [];
for (let pageIndex = 0; pageIndex < book.pages.length; pageIndex += 1) {
  const page = book.pages[pageIndex];
  const heading = page.blocks.find((block) => block.type === "heading");
  for (const block of page.blocks.filter((candidate) => candidate.type === "image")) {
    const asset = resolveAsset(block.src);
    const size = physicalSize(block, page);
    const width = asset.item?.width ?? 0;
    const height = asset.item?.height ?? 0;
    const ppi =
      width && height
        ? Math.round(Math.min(width / (size.widthMm / 25.4), height / (size.heightMm / 25.4)))
        : 0;
    entries.push({
      headingId: block.materialization?.semanticAnchorHeadingId ?? heading?.id ?? null,
      assetSha256: asset.originalSha256,
      derivedAssetSha256: asset.derivedSha256,
      source: asset.item?.source ?? null,
      derived: block.src,
      composition: `${page.template}:${page.variant}`,
      page: pageIndex + 1,
      effectivePpi: ppi,
      status: block.materialization?.fullArtOpening
        ? "USER_REQUESTED_FULL_ART"
        : block.materialization?.assetStatus === "COVERED_HIGH"
          ? "EXACT"
          : "EXACT",
      semanticAnchor: block.materialization?.semanticAnchor ?? page.title ?? page.part,
      alt: block.alt ?? null,
      layoutRole: block.layoutRole ?? block.materialization?.layoutRole ?? null,
      fullArtOpening: block.materialization?.fullArtOpening === true,
    });
  }
}
writeFileSync(
  outputPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), candidate: candidatePath, entries },
    null,
    2,
  ) + "\n",
);
console.log(`manifest_entries=${entries.length}`);
