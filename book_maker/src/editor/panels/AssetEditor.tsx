import { useEffect, useMemo, useRef, useState } from "react";
import type { BookAsset } from "../../book/types";
import { formatBytes } from "../../lib/assets/registry";
import { MAX_ASSET_BYTES } from "../../lib/assets/upload";
import {
  applyRecipe,
  FULL_CROP,
  isIdentityRecipe,
  normalizeCrop,
  type CropRect,
  type EditRecipe,
} from "../../lib/assets/edit";

export interface AssetEditorTarget {
  /** URL resolvida para leitura no canvas */
  source: string;
  label: string;
  category: string;
  mime: string;
  /** presente quando a origem já é um asset do projeto */
  assetId?: string | undefined;
}

interface Props {
  target: AssetEditorTarget;
  onClose: () => void;
  onSave: (
    recipe: EditRecipe,
    mode: "replace" | "duplicate",
    label: string,
  ) => Promise<string | null>;
}

/** Editor local de imagem: recorte, redimensionamento e remoção de fundo. */
export function AssetEditor({ target, onClose, onSave }: Props) {
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [resizeWidth, setResizeWidth] = useState<number | "">("");
  const [cutout, setCutout] = useState(false);
  const [tolerance, setTolerance] = useState(32);
  const [feather, setFeather] = useState(true);
  const [label, setLabel] = useState(target.label);
  const [preview, setPreview] = useState<{
    data: string;
    width: number;
    height: number;
    bytes: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const cropWidthPx = Math.round(crop.width * natural.width) || 0;
  const cropHeightPx = Math.round(crop.height * natural.height) || 0;

  /**
   * A imagem é exibida com object-contain, então a área pintada é menor que a
   * moldura. O mapeamento do recorte usa a caixa pintada, não a moldura.
   */
  const paintedBox = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !natural.width || !natural.height) return null;
    const scale = Math.min(rect.width / natural.width, rect.height / natural.height);
    const width = natural.width * scale;
    const height = natural.height * scale;
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width,
      height,
      frame: rect,
    };
  };

  /* Overlay em % da moldura, convertido a partir das frações da imagem. */
  const overlay = (() => {
    const box = paintedBox();
    if (!box)
      return {
        left: crop.x * 100,
        top: crop.y * 100,
        width: crop.width * 100,
        height: crop.height * 100,
      };
    const insetX = ((box.left - box.frame.left) / box.frame.width) * 100;
    const insetY = ((box.top - box.frame.top) / box.frame.height) * 100;
    const spanX = (box.width / box.frame.width) * 100;
    const spanY = (box.height / box.frame.height) * 100;
    return {
      left: insetX + crop.x * spanX,
      top: insetY + crop.y * spanY,
      width: crop.width * spanX,
      height: crop.height * spanY,
    };
  })();

  const recipe = useMemo<EditRecipe>(
    () => ({
      crop,
      resizeWidth: typeof resizeWidth === "number" ? resizeWidth : undefined,
      removeBackground: cutout ? { tolerance, feather } : undefined,
    }),
    [crop, resizeWidth, cutout, tolerance, feather],
  );

  /* Prévia recalculada com debounce: o flood fill custa caro em imagens grandes. */
  useEffect(() => {
    let cancelled = false;
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        setBusy(true);
        const edited = await applyRecipe(target.source, recipe, { mime: target.mime });
        if (cancelled) return;
        setPreview({
          data: edited.data,
          width: edited.width,
          height: edited.height,
          bytes: edited.bytes,
        });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [recipe, target.source, target.mime]);

  const pointerFraction = (event: React.PointerEvent) => {
    const box = paintedBox();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  const tooBig = preview ? preview.bytes > MAX_ASSET_BYTES : false;

  const save = async (mode: "replace" | "duplicate") => {
    setBusy(true);
    const message = await onSave(recipe, mode, label.trim() || target.label);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Editar imagem
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
          >
            Fechar
          </button>
        </header>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Original — arraste para recortar
            </p>
            <div
              ref={frameRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = pointerFraction(event);
              }}
              onPointerMove={(event) => {
                const start = dragRef.current;
                if (!start) return;
                const now = pointerFraction(event);
                setCrop(
                  normalizeCrop({
                    x: Math.min(start.x, now.x),
                    y: Math.min(start.y, now.y),
                    width: Math.abs(now.x - start.x),
                    height: Math.abs(now.y - start.y),
                  }),
                );
              }}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              className="relative touch-none select-none border border-border"
            >
              <img
                src={target.source}
                alt={target.label}
                draggable={false}
                onLoad={(event) =>
                  setNatural({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
                className="block max-h-[46vh] w-full object-contain"
              />
              <div
                className="pointer-events-none absolute border-2 border-primary bg-primary/10"
                style={{
                  left: `${overlay.left}%`,
                  top: `${overlay.top}%`,
                  width: `${overlay.width}%`,
                  height: `${overlay.height}%`,
                }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {natural.width}×{natural.height} px · recorte {cropWidthPx}×{cropHeightPx} px
              </span>
              <button
                type="button"
                onClick={() => setCrop(FULL_CROP)}
                className="border border-border px-1.5 py-0.5 hover:bg-accent"
              >
                Recorte completo
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <label className="block">
              <span className="mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Nome
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full border border-border bg-input/40 px-2 py-1 outline-none focus-visible:border-primary"
              />
            </label>

            <div>
              <span className="mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Redimensionar (largura em px)
              </span>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={16}
                  max={8000}
                  value={resizeWidth}
                  placeholder={String(cropWidthPx || "")}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    setResizeWidth(Number.isFinite(value) ? value : "");
                  }}
                  className="w-24 border border-border bg-input/40 px-2 py-1 outline-none focus-visible:border-primary"
                />
                {[600, 1200, 2000].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setResizeWidth(size)}
                    className="border border-border px-1.5 text-[10px] hover:bg-accent"
                  >
                    {size}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setResizeWidth("")}
                  className="border border-border px-1.5 text-[10px] hover:bg-accent"
                >
                  original
                </button>
              </div>
            </div>

            <div className="border border-border p-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cutout}
                  onChange={(event) => setCutout(event.target.checked)}
                />
                <span>Retirar o fundo (PNG com transparência)</span>
              </label>
              {cutout ? (
                <div className="mt-2 space-y-2">
                  <label className="block">
                    <span className="text-[10px] text-muted-foreground">
                      Tolerância de cor: {tolerance}
                    </span>
                    <input
                      type="range"
                      min={4}
                      max={120}
                      value={tolerance}
                      onChange={(event) => setTolerance(Number(event.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={feather}
                      onChange={(event) => setFeather(event.target.checked)}
                    />
                    <span>Suavizar borda</span>
                  </label>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    O fundo é removido a partir das bordas da imagem, então cores iguais no interior
                    do objeto são preservadas. Funciona melhor com fundo uniforme.
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Resultado
              </p>
              <div className="k-checker border border-border">
                {preview ? (
                  <img
                    src={preview.data}
                    alt="Prévia da edição"
                    className="mx-auto block max-h-[22vh] object-contain"
                  />
                ) : (
                  <p className="p-4 text-[11px] text-muted-foreground">calculando…</p>
                )}
              </div>
              {preview ? (
                <p
                  className={`mt-1 text-[10px] ${tooBig ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {preview.width}×{preview.height} px · {formatBytes(preview.bytes)}
                  {tooBig ? ` — acima do limite de ${formatBytes(MAX_ASSET_BYTES)}` : ""}
                </p>
              ) : null}
            </div>

            {error ? <p className="text-[10px] text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || tooBig || !preview}
                onClick={() => save("duplicate")}
                className="border border-primary bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-60"
              >
                Salvar como novo asset
              </button>
              {target.assetId ? (
                <button
                  type="button"
                  disabled={busy || tooBig || !preview || isIdentityRecipe(recipe, natural.width)}
                  onClick={() => save("replace")}
                  className="border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-60"
                >
                  Substituir original
                </button>
              ) : null}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              A edição roda no navegador e grava os bytes finais no projeto JSON. “Substituir” afeta
              todos os blocos que já usam este asset.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
