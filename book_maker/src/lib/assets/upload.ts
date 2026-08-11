import type { BookAsset } from "../../book/types";

export const ACCEPTED_ASSET_MIME = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const ACCEPTED_FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

/** Barreira individual; não garante que a quota total do localStorage comporte o projeto. */
export const MAX_ASSET_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function fontMime(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  return "application/octet-stream";
}

export async function fileToBookFont(
  file: File,
  options: { id: string; family: string },
): Promise<import("../../book/types").BookFont> {
  const maxBytes = 8 * 1024 * 1024;
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_FONT_EXTENSIONS.includes(extension)) {
    throw new Error("Use uma fonte .woff2, .woff, .ttf ou .otf.");
  }
  if (file.size > maxBytes) {
    throw new Error(`${file.name} excede o limite de ${maxBytes / (1024 * 1024)} MB.`);
  }
  return {
    id: options.id,
    family: options.family.trim() || file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mime: fontMime(file),
    data: await readAsDataUrl(file),
    bytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

function measure(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

/**
 * Converte arquivos locais em assets do projeto (bytes em data URL).
 * Nenhum upload remoto: o projeto continua local-first e reprodutível pelo JSON.
 */
export async function fileToBookAsset(
  file: File,
  options: { id: string; category: string },
): Promise<BookAsset> {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error(`${file.name} excede o limite de ${MAX_ASSET_BYTES / (1024 * 1024)} MB.`);
  }
  const data = await readAsDataUrl(file);
  const { width, height } = await measure(data);
  if (!width || !height) throw new Error(`${file.name}: imagem inválida.`);
  return {
    id: options.id,
    label: file.name.replace(/\.[^.]+$/, ""),
    category: options.category,
    data,
    mime: file.type || "application/octet-stream",
    bytes: file.size,
    pixelWidth: width,
    pixelHeight: height,
    createdAt: new Date().toISOString(),
  };
}
