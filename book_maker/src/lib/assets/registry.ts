import type { BookAsset } from "../../book/types";

/**
 * Mapeamento URL/ID dos assets embutidos no projeto JSON.
 *
 * Um bloco nunca guarda bytes: guarda `asset:<id>`. Os bytes vivem em
 * `book.assets`, então o mesmo JSON reproduz o livro em qualquer máquina,
 * sem depender de arquivos soltos em public/assets.
 */
export const ASSET_PROTOCOL = "asset:";

let registry: Record<string, BookAsset> = {};

export function isAssetRef(src: string | undefined): boolean {
  return typeof src === "string" && src.startsWith(ASSET_PROTOCOL);
}

export function assetRef(id: string) {
  return `${ASSET_PROTOCOL}${id}`;
}

export function assetIdFromRef(src: string | undefined): string | null {
  return isAssetRef(src) ? src!.slice(ASSET_PROTOCOL.length) : null;
}

/** Chamado sempre que o livro em memória muda (editor e print view). */
export function registerBookAssets(assets: BookAsset[] | undefined) {
  const next: Record<string, BookAsset> = {};
  for (const asset of assets ?? []) next[asset.id] = asset;
  registry = next;
}

export function lookupAsset(src: string | undefined): BookAsset | undefined {
  const id = assetIdFromRef(src);
  return id ? registry[id] : undefined;
}

export function listRegisteredAssets(): BookAsset[] {
  return Object.values(registry);
}

/**
 * Converte a referência editorial em URL utilizável por <img src>.
 * Caminhos normais de public/assets passam intactos.
 */
export function resolveAssetSrc(src: string | undefined): string {
  if (!src) return "";
  const asset = lookupAsset(src);
  if (asset) return asset.data;
  return isAssetRef(src) ? "" : src;
}

const MM_PER_INCH = 25.4;
export const PRINT_TARGET_PPI = 300;
export const MAX_PRINT_RASTER_PIXELS = 32_000_000;

export function pixelsForPrint(mm: number, ppi = PRINT_TARGET_PPI): number {
  if (!Number.isFinite(mm) || mm <= 0) return 0;
  return Math.ceil((mm / MM_PER_INCH) * ppi);
}

export function effectivePpiForSize(
  pixelWidth: number,
  pixelHeight: number,
  widthMm: number,
  heightMm: number,
): number {
  if (!pixelWidth || !pixelHeight || !widthMm || !heightMm) return 0;
  return Math.round(
    Math.min(pixelWidth / (widthMm / MM_PER_INCH), pixelHeight / (heightMm / MM_PER_INCH)),
  );
}

export function printRasterPlan(
  pixelWidth: number,
  pixelHeight: number,
  widthMm: number,
  heightMm: number,
) {
  const requiredWidth = pixelsForPrint(widthMm);
  const requiredHeight = pixelsForPrint(heightMm);
  const scale = Math.max(requiredWidth / pixelWidth, requiredHeight / pixelHeight, 1);
  const width = Math.ceil(pixelWidth * scale);
  const height = Math.ceil(pixelHeight * scale);
  return {
    width,
    height,
    scale,
    interpolated: scale > 1,
    safe: width * height <= MAX_PRINT_RASTER_PIXELS,
  };
}

/** ppi efetivo se a imagem ocupar a largura indicada (mm) da página. */
export function effectivePpiFor(pixelWidth: number, widthMm: number): number {
  if (!pixelWidth || !widthMm) return 0;
  return Math.round(pixelWidth / (widthMm / MM_PER_INCH));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
