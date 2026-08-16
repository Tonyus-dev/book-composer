/**
 * Planejamento editorial determinístico.
 *
 * O planejador só pode escolher assets explicitamente aprovados/usuais no
 * manifesto. REVIEW_REQUIRED, REJECT e REFERENCE_ONLY permanecem candidatas
 * para revisão humana e nunca entram no plano automaticamente.
 */

const BLOCKED_STATUSES = new Set([
  "REVIEW_REQUIRED",
  "REJECT",
  "REFERENCE_ONLY",
  "HUMAN_REVIEW",
  "PENDING",
]);

const STOP_WORDS = new Set([
  "para",
  "como",
  "onde",
  "quando",
  "entre",
  "sobre",
  "pela",
  "pelo",
  "uma",
  "que",
  "dos",
  "das",
  "com",
  "sem",
  "não",
  "mais",
  "parte",
  "mundo",
]);

export const PRODUCTION_PROFILES = ["PUBLIC_BOOK", "BOOKMAKER_CONTRACT", "INTERNAL_PRODUCTION"];

export const DEFAULT_PAGINATION_POLICY = Object.freeze({
  /* A extensão deve emergir do conteúdo e do renderer; não há meta editorial fixa. */
  targetBookPages: null,
  softMaximumBookPages: null,
  hardWarningBookPages: null,
});

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
}

function tokens(value) {
  return normalize(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function assetStatus(asset) {
  return String(asset.status ?? asset.disposition ?? "").toUpperCase();
}

export function isApprovedAsset(asset) {
  const status = assetStatus(asset);
  return (
    Boolean(asset.src ?? asset.asset) &&
    !BLOCKED_STATUSES.has(status) &&
    (status.includes("APPROVED") ||
      status.includes("USABLE") ||
      status === "USED" ||
      status === "COVERED_HIGH" ||
      status === "USER_REQUESTED_FULL_ART")
  );
}

function assetText(asset) {
  return [
    asset.label,
    asset.name,
    asset.filename,
    asset.relativePath,
    asset.theme,
    asset.people,
    asset.office,
    asset.location,
    asset.part,
    asset.editorialType,
    asset.editorial_type,
    asset.context,
    ...(Array.isArray(asset.contexts) ? asset.contexts : []),
  ].join(" ");
}

function sourceText(source) {
  return [
    source.text,
    source.raw,
    source.sectionH1,
    source.sectionH2,
    source.sectionH3,
    ...(source.headingPath ?? []).map((heading) => heading.text),
  ].join(" ");
}

function familyForAsset(asset, source) {
  const kind = normalize(asset.editorialType ?? asset.editorial_type ?? asset.category);
  if (kind.includes("map") || kind.includes("mapa")) return "MAP_PAGE";
  if (kind.includes("diagram") || kind.includes("diagrama")) return "TEXT_FEATURE";
  if (kind.includes("opening") || kind.includes("hero")) return "IMAGE_TOP";
  if (kind.includes("bestiary") || kind.includes("creatur")) return "BESTIARY_ENTRY";
  if (kind.includes("people") || kind.includes("povo")) return "POVO_OPENING";
  if (source.level === 1) return "PART_HERO";
  return "TEXT_FEATURE";
}

function scoreAsset(source, asset, usedHashes, usedFamilies) {
  const sourceTokens = new Set(tokens(sourceText(source)));
  const assetTokens = new Set(tokens(assetText(asset)));
  const overlap = [...sourceTokens].filter((token) => assetTokens.has(token));
  if (overlap.length === 0) return null;

  const family = familyForAsset(asset, source);
  const hash = asset.sha256 ?? asset.sha ?? null;
  const status = assetStatus(asset);
  let score = overlap.length * 10;
  if (source.level === 1 && ["PART_HERO", "IMAGE_TOP"].includes(family)) score += 7;
  if (source.type === "table" && family === "TEXT_FEATURE") score += 4;
  if (usedHashes.has(hash)) score -= 30;
  if (usedFamilies.get(family) >= 2) score -= 8;
  if (status === "USED") score += 1;
  return { score, overlap, family, hash };
}

/**
 * Produz atribuições por heading. A unidade é a decisão editorial, não a
 * posição final: o materializador continua medindo o fluxo real antes de
 * fechar cada página.
 */
export function planEditorialAssets(sourceBlocks, manifest, options = {}) {
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const reservedSrcs = new Set(options.reservedSrcs ?? []);
  const eligible = assets
    .filter(isApprovedAsset)
    .map((asset) => ({ ...asset, src: asset.src ?? asset.asset }))
    .filter((asset) => !reservedSrcs.has(asset.src));
  const usedHashes = new Set();
  const usedFamilies = new Map();
  const assignments = [];
  const assignedSourceIds = new Set();

  for (const source of sourceBlocks) {
    if (source.type !== "heading" || source.level > 2) continue;
    const ranked = eligible
      .map((asset) => ({ asset, match: scoreAsset(source, asset, usedHashes, usedFamilies) }))
      .filter((entry) => entry.match && entry.match.score >= 10)
      .sort((left, right) => {
        if (right.match.score !== left.match.score) return right.match.score - left.match.score;
        return String(left.asset.sha256 ?? left.asset.src).localeCompare(
          String(right.asset.sha256 ?? right.asset.src),
        );
      });
    const selected = ranked.find((entry) => !usedHashes.has(entry.match.hash)) ?? ranked[0];
    if (!selected || assignedSourceIds.has(source.id)) continue;
    const { asset, match } = selected;
    assignments.push({
      sourceBlockId: source.id,
      heading: source.text,
      section: source.sectionH1 ?? "",
      src: asset.src,
      sha256: match.hash,
      alt: asset.label ?? asset.name ?? asset.filename ?? source.text,
      reference: asset.reference ?? asset.relativePath ?? asset.src,
      status: asset.status ?? asset.disposition ?? "APPROVED_OR_USABLE_UNASSIGNED",
      family: match.family,
      role: "chapter-opening",
      orientation: asset.orientation ?? "UNKNOWN",
      aspectRatio: asset.aspectRatio ?? asset.aspect_ratio ?? null,
      ...(asset.cropWindow ? { cropWindow: asset.cropWindow } : {}),
      score: match.score,
      matchedTerms: match.overlap,
      maxRepetitions: Number(asset.maxRepetitions ?? asset.maxUses ?? 1),
    });
    assignedSourceIds.add(source.id);
    if (match.hash) usedHashes.add(match.hash);
    usedFamilies.set(match.family, (usedFamilies.get(match.family) ?? 0) + 1);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    targetBookPages: options.targetBookPages ?? DEFAULT_PAGINATION_POLICY.targetBookPages,
    assignments,
    unusedApprovedAssets: eligible
      .filter((asset) => !assignments.some((assignment) => assignment.src === asset.src))
      .map((asset) => ({
        src: asset.src,
        sha256: asset.sha256 ?? asset.sha,
        label: asset.label ?? asset.name ?? asset.filename,
      })),
    pendingAssets: [
      ...assets
        .filter((asset) => BLOCKED_STATUSES.has(assetStatus(asset)))
        .map((asset) => ({
          src: asset.src ?? asset.asset ?? null,
          sha256: asset.sha256 ?? asset.sha ?? null,
          label: asset.label ?? asset.name ?? asset.filename ?? asset.relativePath ?? "",
          status: assetStatus(asset),
        })),
      ...(manifest.pendingAssets ?? []),
    ],
  };
}
