import type { BookAsset } from "../../book/types";
import { useEffect, useState } from "react";
import { getAssetBlob } from "./local-store";

/**
 * Registry central de `asset:<id>`. Metadados ficam no Book; blobs locais são
 * materializados do IndexedDB uma vez e compartilhados por todos os renders.
 */
export const ASSET_PROTOCOL = "asset:";

let registry: Record<string, BookAsset> = {};
const runtimeUrls = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

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
  for (const [id, url] of runtimeUrls) {
    if (!next[id]) {
      URL.revokeObjectURL(url);
      runtimeUrls.delete(id);
    }
  }
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
  if (asset?.data) return asset.data;
  if (asset) {
    const runtime = runtimeUrls.get(asset.id);
    if (!runtime) void resolveAssetSrcAsync(src);
    return runtime ?? (asset.storage?.kind === "r2" ? asset.storage.url : "");
  }
  return isAssetRef(src) ? "" : src;
}

export async function resolveAssetSrcAsync(src: string | undefined): Promise<string> {
  if (!src) return "";
  const asset = lookupAsset(src);
  if (!asset) return isAssetRef(src) ? "" : src;
  if (asset.data) return asset.data;
  const immediate = runtimeUrls.get(asset.id);
  if (immediate) return immediate;
  const key =
    asset.storage?.kind === "local"
      ? asset.storage.key
      : asset.storage?.kind === "r2"
        ? asset.storage.localKey
        : undefined;
  if (!key) return asset.storage?.kind === "r2" ? asset.storage.url : "";
  const existing = pending.get(asset.id);
  if (existing) return existing;
  const loading = getAssetBlob(key).then((blob) => {
    if (!blob) return "";
    const url = URL.createObjectURL(blob);
    const old = runtimeUrls.get(asset.id);
    if (old) URL.revokeObjectURL(old);
    runtimeUrls.set(asset.id, url);
    listeners.forEach((listener) => listener());
    window.dispatchEvent(new Event("kallistis-asset-ready"));
    return url;
  });
  pending.set(asset.id, loading);
  loading.finally(() => pending.delete(asset.id));
  return loading;
}

export function useResolvedAssetSrc(src: string | undefined): string {
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((value) => value + 1);
    listeners.add(listener);
    void resolveAssetSrcAsync(src);
    return () => void listeners.delete(listener);
  }, [src]);
  return resolveAssetSrc(src);
}

const MM_PER_INCH = 25.4;
export const MAX_CANVAS_PIXELS = 32_000_000;

export function pixelsForPrint(mm: number, ppi = 300): number {
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

export function resolutionSeverity(ppi: number): "error" | "warning" | null {
  if (ppi < 150) return "error";
  if (ppi < 300) return "warning";
  return null;
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
