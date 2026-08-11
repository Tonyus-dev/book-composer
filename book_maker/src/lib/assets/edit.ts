import type { BookAsset } from "../../book/types";
import { MAX_CANVAS_PIXELS } from "./registry";
import { MAX_ASSET_BYTES } from "./upload";

/**
 * Edição de imagem local-first: tudo acontece em <canvas> no navegador.
 * Nenhum serviço externo, nenhum upload — o resultado volta como bytes
 * (data URL) para dentro do próprio projeto JSON.
 */

export interface CropRect {
  /** fração 0..1 relativa à imagem original */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditRecipe {
  crop?: CropRect | undefined;
  /** largura final em px (altura acompanha a proporção do recorte) */
  resizeWidth?: number | undefined;
  removeBackground?:
    | {
        /** 0..255 — distância de cor aceita em relação ao fundo amostrado */
        tolerance: number;
        /** suaviza a borda do recorte alfa */
        feather: boolean;
      }
    | undefined;
}

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

export function isIdentityRecipe(recipe: EditRecipe, naturalWidth: number): boolean {
  const crop = recipe.crop ?? FULL_CROP;
  const untouchedCrop = crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;
  const untouchedSize = !recipe.resizeWidth || recipe.resizeWidth === naturalWidth;
  return untouchedCrop && untouchedSize && !recipe.removeBackground;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível decodificar a imagem."));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function normalizeCrop(crop: CropRect): CropRect {
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  return {
    x,
    y,
    width: Math.max(0.02, Math.min(1 - x, crop.width)),
    height: Math.max(0.02, Math.min(1 - y, crop.height)),
  };
}

/** Amostra as quatro bordas para estimar a cor de fundo dominante. */
function sampleBackground(data: Uint8ClampedArray, width: number, height: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (data[i + 3]! < 8) return;
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
    count += 1;
  };
  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    add(0, y);
    add(width - 1, y);
  }
  if (count === 0) return { r: 255, g: 255, b: 255 };
  return { r: r / count, g: g / count, b: b / count };
}

/**
 * Remoção de fundo por preenchimento a partir das bordas: só apaga pixels
 * conectados à moldura da imagem, preservando cores iguais no interior do
 * objeto (olhos brancos, realces, etc.).
 */
function removeBackgroundInPlace(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
  feather: boolean,
) {
  const bg = sampleBackground(data, width, height);
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack: number[] = [];
  const push = (index: number) => {
    if (index < 0 || index >= total || visited[index]) return;
    visited[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  const matches = (index: number) => {
    const i = index * 4;
    const dr = data[i]! - bg.r;
    const dg = data[i + 1]! - bg.g;
    const db = data[i + 2]! - bg.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
  };

  const cleared = new Uint8Array(total);
  while (stack.length > 0) {
    const index = stack.pop()!;
    if (!matches(index)) continue;
    cleared[index] = 1;
    data[index * 4 + 3] = 0;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  if (!feather) return;
  /* Meia transparência em pixels de contorno: evita franja dura no recorte. */
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (cleared[index]) continue;
      const border =
        cleared[index - 1] ||
        cleared[index + 1] ||
        cleared[index - width] ||
        cleared[index + width];
      if (border) data[index * 4 + 3] = Math.round(data[index * 4 + 3]! * 0.5);
    }
  }
}

export interface EditedImage {
  data: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
}

/** Aplica recorte → redimensionamento → remoção de fundo, nessa ordem. */
export async function applyRecipe(
  source: string,
  recipe: EditRecipe,
  options: { mime: string },
): Promise<EditedImage> {
  const image = await loadImage(source);
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const crop = normalizeCrop(recipe.crop ?? FULL_CROP);

  const sx = Math.round(crop.x * naturalWidth);
  const sy = Math.round(crop.y * naturalHeight);
  const sw = Math.max(1, Math.round(crop.width * naturalWidth));
  const sh = Math.max(1, Math.round(crop.height * naturalHeight));

  const targetWidth = Math.max(1, Math.round(recipe.resizeWidth || sw));
  const targetHeight = Math.max(1, Math.round((sh / sw) * targetWidth));
  if (targetWidth * targetHeight > MAX_CANVAS_PIXELS) {
    throw new Error(
      `A edição exigiria ${targetWidth}×${targetHeight} px; reduza o tamanho do recorte.`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  /* PNG é obrigatório quando existe alfa; JPEG achataria o fundo removido. */
  const mime = recipe.removeBackground ? "image/png" : pickMime(options.mime);
  if (recipe.removeBackground) {
    const frame = ctx.getImageData(0, 0, targetWidth, targetHeight);
    removeBackgroundInPlace(
      frame.data,
      targetWidth,
      targetHeight,
      recipe.removeBackground.tolerance,
      recipe.removeBackground.feather,
    );
    ctx.putImageData(frame, 0, 0);
  }

  const data = canvas.toDataURL(mime, mime === "image/jpeg" ? 0.92 : undefined);
  const bytes = dataUrlBytes(data);
  if (bytes > MAX_ASSET_BYTES) {
    throw new Error(
      `A imagem editada excede ${MAX_ASSET_BYTES / (1024 * 1024)} MB e não pode ser persistida localmente.`,
    );
  }
  return { data, mime, width: targetWidth, height: targetHeight, bytes };
}

function pickMime(mime: string) {
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") return mime;
  /* SVG e formatos exóticos são rasterizados: PNG preserva transparência. */
  return "image/png";
}

export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
}

/** Empacota o resultado da edição como asset do projeto. */
export function editedToAsset(
  base: Pick<BookAsset, "label" | "category">,
  edited: EditedImage,
  options: { id: string },
): BookAsset {
  return {
    id: options.id,
    label: base.label,
    category: base.category,
    data: edited.data,
    mime: edited.mime,
    bytes: edited.bytes,
    pixelWidth: edited.width,
    pixelHeight: edited.height,
    createdAt: new Date().toISOString(),
  };
}
