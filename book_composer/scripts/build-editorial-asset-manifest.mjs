#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const input = path.resolve(process.argv[2] ?? path.join(root, "drive-image-inventory.json"));
const output = path.resolve(
  process.argv[3] ?? path.join(root, "public", "editorial-asset-manifest.json"),
);
const rawInput = await readFile(input, "utf8");
const reviewInventory = input.endsWith(".tsv")
  ? (JSON.parse(await readFile(path.join(root, "drive-image-inventory.json"), "utf8")).inventory ??
    [])
  : [];
const inventory = input.endsWith(".tsv")
  ? (() => {
      const allLines = rawInput.trim().split(/\r?\n/u);
      const headerIndex = allLines.findIndex((line) => line.startsWith("asset\tsha256\t"));
      const headerLine = allLines[headerIndex];
      const lines = allLines.slice(headerIndex + 1);
      const headers = headerLine.split("\t");
      return {
        inventory: lines.filter(Boolean).map((line) => {
          const values = line.split("\t");
          return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        }),
      };
    })()
  : JSON.parse(rawInput);
const statusFor = (entry) => {
  const raw = String(entry.status ?? entry.disposition ?? "").toUpperCase();
  if (raw.includes("REJECT")) return "REJECT";
  if (raw.includes("REVIEW") || raw.includes("HUMAN")) return "REVIEW_REQUIRED";
  if (raw.includes("REFERENCE")) return "REFERENCE_ONLY";
  if (raw === "USED") return "USED";
  return raw.includes("APPROVED") || raw.includes("USABLE") ? "APPROVED" : "REVIEW_REQUIRED";
};
const categoryFor = (entry) => {
  const raw = String(
    entry.editorial_type ?? entry.editorialType ?? entry.theme ?? "",
  ).toUpperCase();
  if (raw.includes("MAP")) return "map";
  if (raw.includes("DIAGRAM")) return "diagram";
  if (raw.includes("BESTIARY") || raw.includes("CREATURE")) return "creature";
  if (raw.includes("PEOPLE") || raw.includes("POVO")) return "people";
  return "illustration";
};
const cropWindowFor = (entry) => {
  const raw = entry.cropWindow ?? entry.crop_window ?? null;
  if (!raw) return null;
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!parsed || typeof parsed !== "object") return null;
  const values = [parsed.x, parsed.y, parsed.width, parsed.height].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [x, y, width, height] = values;
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
    return null;
  }
  return { x, y, width, height };
};
const assets = (inventory.inventory ?? [])
  .map((entry) => {
    const status = statusFor(entry);
    const src = entry.asset ?? entry.materializedSrc ?? null;
    const cropWindow = cropWindowFor(entry);
    const familyKey =
      [entry.part, entry.theme, entry.editorial_type, categoryFor(entry)]
        .filter(Boolean)
        .join("/") || "uncategorized";
    return {
      id: `asset-${String(entry.sha256 ?? "unknown").slice(0, 16)}`,
      src,
      path: entry.relativePath ?? entry.path ?? src,
      hash: entry.sha256 ?? null,
      sha256: entry.sha256 ?? null,
      name: entry.filename ?? path.basename(entry.relativePath ?? src ?? "asset"),
      label: entry.filename ?? entry.relativePath ?? src ?? "asset",
      category: categoryFor(entry),
      context: [entry.theme, entry.people, entry.office, entry.location, entry.part].filter(
        Boolean,
      ),
      theme: entry.theme ?? "",
      people: entry.people ?? "",
      office: entry.office ?? "",
      location: entry.location ?? "",
      part: entry.part ?? "",
      editorialType: entry.editorial_type ?? entry.editorialType ?? "ILLUSTRATION",
      orientation: entry.orientation ?? "UNKNOWN",
      aspectRatio: entry.aspect_ratio ?? null,
      widthPx: entry.width_px ?? null,
      heightPx: entry.height_px ?? null,
      status,
      alreadyUsedOccurrences: Number(entry.used ?? 0),
      maxRepetitions: status === "USED" ? 2 : 1,
      familyKey,
      allowedRoles:
        categoryFor(entry) === "map" ? ["map", "spread"] : ["support", "opening", "quadrant"],
      sourceReference: entry.existing_corpus_relative_path ?? entry.relativePath ?? null,
      reference: entry.relativePath ?? src,
      ...(cropWindow ? { cropWindow } : {}),
    };
  })
  .filter((asset) => asset.src);
const pendingInventory = input.endsWith(".tsv")
  ? reviewInventory
      .filter(
        (entry) => !entry.materializedSrc && String(entry.disposition ?? "").includes("REVIEW"),
      )
      .map((entry) => ({
        src: null,
        path: entry.relativePath ?? entry.path ?? null,
        sha256: entry.sha256 ?? null,
        label: entry.relativePath ?? entry.path ?? "asset pendente",
        status: "REVIEW_REQUIRED",
      }))
  : (inventory.inventory ?? [])
      .filter(
        (entry) => !entry.materializedSrc && String(entry.disposition ?? "").includes("REVIEW"),
      )
      .map((entry) => ({
        src: null,
        path: entry.relativePath ?? entry.path ?? null,
        sha256: entry.sha256 ?? null,
        label: entry.relativePath ?? entry.path ?? "asset pendente",
        status: "REVIEW_REQUIRED",
      }));
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { inventory: input, noImageGeneration: true },
  policy: {
    blockedStatuses: ["REVIEW_REQUIRED", "REJECT", "REFERENCE_ONLY"],
    fullPageRequiresExplicitAuthorization: true,
    defaultMaxRepetitions: 1,
  },
  counts: {
    total: assets.length,
    approved: assets.filter((asset) => ["APPROVED", "USED"].includes(asset.status)).length,
    pending:
      assets.filter((asset) => asset.status === "REVIEW_REQUIRED").length + pendingInventory.length,
    rejected: assets.filter((asset) => asset.status === "REJECT").length,
  },
  assets,
  pendingAssets: pendingInventory,
};
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, counts: manifest.counts }, null, 2));
