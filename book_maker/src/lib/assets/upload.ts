import type { BookAsset } from "../../book/types";
import { effectivePpiForSize, printRasterPlan, PRINT_TARGET_PPI } from "./registry";

export const ACCEPTED_ASSET_MIME = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const ACCEPTED_FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

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

async function prepareRasterForPrint(
  data: string,
  mime: string,
  width: number,
  height: number,
  widthMm: number,
  heightMm: number,
) {
  if (mime === "image/svg+xml") return { data, mime, width, height, interpolated: false };
  const plan = printRasterPlan(width, height, widthMm, heightMm);
  if (!Number.isFinite(plan.scale) || plan.scale <= 1) {
    return { data, mime, width, height, interpolated: false };
  }
  if (!plan.safe) {
    throw new Error(
      `A preparação exigiria ${plan.width}×${plan.height} px; reduza o tamanho físico ou use uma imagem com proporção adequada.`,
    );
  }
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível preparar a imagem para impressão."));
    image.src = data;
  });
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para preparar a imagem em 300 ppi.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const outputMime = mime === "image/jpeg" || mime === "image/webp" ? mime : "image/png";
  const output = canvas.toDataURL(outputMime, outputMime === "image/jpeg" ? 0.92 : undefined);
  if (dataUrlBytes(output) > MAX_ASSET_BYTES) {
    throw new Error(
      `A variante de impressão excede ${MAX_ASSET_BYTES / (1024 * 1024)} MB; use JPEG/WebP ou uma imagem mais adequada.`,
    );
  }
  return {
    data: output,
    mime: outputMime,
    width: canvas.width,
    height: canvas.height,
    interpolated: true,
  };
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
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
  options: {
    id: string;
    category: string;
    pageWidth: string;
    pageHeight?: string;
    bleed?: string;
  },
): Promise<BookAsset> {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error(`${file.name} excede o limite de ${MAX_ASSET_BYTES / (1024 * 1024)} MB.`);
  }
  const sourceData = await readAsDataUrl(file);
  const { width: sourceWidth, height: sourceHeight } = await measure(sourceData);
  if (!sourceWidth || !sourceHeight) throw new Error(`${file.name}: imagem inválida.`);
  const bleedMm = mmOf(options.bleed ?? "0", 0);
  const widthMm = mmOf(options.pageWidth, 210) + bleedMm * 2;
  const heightMm = mmOf(options.pageHeight ?? "297", 297) + bleedMm * 2;
  const prepared = await prepareRasterForPrint(
    sourceData,
    file.type,
    sourceWidth,
    sourceHeight,
    widthMm,
    heightMm,
  );
  const ppi =
    prepared.mime === "image/svg+xml"
      ? undefined
      : effectivePpiForSize(prepared.width, prepared.height, widthMm, heightMm);
  return {
    id: options.id,
    label: file.name.replace(/\.[^.]+$/, ""),
    category: options.category,
    data: prepared.data,
    mime: prepared.mime || "application/octet-stream",
    bytes: dataUrlBytes(prepared.data),
    pixelWidth: prepared.width,
    pixelHeight: prepared.height,
    sourcePixelWidth: sourceWidth,
    sourcePixelHeight: sourceHeight,
    ...(prepared.mime !== "image/svg+xml"
      ? { printTargetPpi: PRINT_TARGET_PPI, printInterpolated: prepared.interpolated }
      : {}),
    ...(ppi ? { effectivePpi: ppi } : {}),
    createdAt: new Date().toISOString(),
  };
}
