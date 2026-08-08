import type { BookAsset } from "../../book/types";
import { effectivePpiFor } from "./registry";

export const ACCEPTED_ASSET_MIME = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

/** Limite pragmático: o projeto inteiro precisa caber no localStorage. */
export const MAX_ASSET_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function measure(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

function mmOf(token: string, fallback: number) {
  const value = Number.parseFloat(token);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Converte arquivos locais em assets do projeto (bytes em data URL).
 * Nenhum upload remoto: o projeto continua local-first e reprodutível pelo JSON.
 */
export async function fileToBookAsset(
  file: File,
  options: { id: string; category: string; pageWidth: string },
): Promise<BookAsset> {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error(`${file.name} excede o limite de ${MAX_ASSET_BYTES / (1024 * 1024)} MB.`);
  }
  const data = await readAsDataUrl(file);
  const { width, height } = await measure(data);
  const ppi = effectivePpiFor(width, mmOf(options.pageWidth, 210));
  return {
    id: options.id,
    label: file.name.replace(/\.[^.]+$/, ""),
    category: options.category,
    data,
    mime: file.type || "application/octet-stream",
    bytes: file.size,
    pixelWidth: width,
    pixelHeight: height,
    ...(ppi ? { effectivePpi: ppi } : {}),
    createdAt: new Date().toISOString(),
  };
}
