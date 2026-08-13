import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Block, BlockFrame, Book, ImageBlock, Page } from "../../book/types";
import { PageRenderer, type PageControl } from "../../book/renderer/PageRenderer";
import { BookRenderContext } from "../../book/renderer/context";
import { nextId, useEditor, type Overlays } from "../state/store";
import { normalizeTableBlock } from "../../book/tableModel";
import { TableEditorOverlay } from "./TableEditorOverlay";
import { InlineTextEditorOverlay } from "./InlineTextEditorOverlay";
import { SheetDesignerOverlay } from "./SheetDesignerOverlay";

function OverlayLayers({ overlays }: { overlays: Overlays }) {
  return (
    <>
      {overlays.bleed ? <div className="k-overlay k-overlay--bleed" /> : null}
      {overlays.margins ? <div className="k-overlay k-overlay--margins" /> : null}
      {overlays.safe ? <div className="k-overlay k-overlay--safe" /> : null}
      {overlays.baseline ? <div className="k-overlay k-overlay--baseline" /> : null}
      {overlays.columns ? (
        <div className="k-overlay k-overlay--columns">
          <span />
          <span />
        </div>
      ) : null}
    </>
  );
}

const CSS_PX_PER_MM = 96 / 25.4;

function mmValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function rulerTicks(lengthMm: number) {
  return Array.from({ length: Math.floor(lengthMm) + 1 }, (_, value) => value);
}

function RulerOverlay({
  book,
  point,
}: {
  book: Book;
  point: { x: number; y: number; xMm: number; yMm: number } | null;
}) {
  const widthMm = mmValue(book.tokens.pageWidth);
  const heightMm = mmValue(book.tokens.pageHeight);
  const bleedMm = mmValue(book.tokens.bleed);
  const marginInnerMm = mmValue(book.tokens.marginInner);
  const marginOuterMm = mmValue(book.tokens.marginOuter);
  const marginTopMm = mmValue(book.tokens.marginTop);
  const marginBottomMm = mmValue(book.tokens.marginBottom);
  const horizontalTicks = rulerTicks(widthMm);
  const verticalTicks = rulerTicks(heightMm);
  const horizontalPosition = (value: number) => `${(value / widthMm) * 100}%`;
  const verticalPosition = (value: number) => `${(value / heightMm) * 100}%`;

  return (
    <div className="k-editor-ruler" data-testid="ruler-overlay" aria-label="Réguas da página">
      <div className="k-editor-ruler__top" aria-hidden="true">
        {horizontalTicks.map((value) => (
          <span
            key={`x-${value}`}
            className={`k-editor-ruler__tick${value % 10 === 0 ? " is-major" : value % 5 === 0 ? " is-medium" : ""}`}
            style={{ left: horizontalPosition(value) }}
          >
            {value % 10 === 0 ? <b>{value}</b> : null}
          </span>
        ))}
        <span
          className="k-editor-ruler__marker k-editor-ruler__marker--inner"
          style={{ left: horizontalPosition(marginInnerMm) }}
          title={`Margem interna: ${marginInnerMm} mm`}
        />
        <span
          className="k-editor-ruler__marker k-editor-ruler__marker--outer"
          style={{ left: horizontalPosition(Math.max(0, widthMm - marginOuterMm)) }}
          title={`Margem externa: ${marginOuterMm} mm`}
        />
        <span className="k-editor-ruler__center" style={{ left: "50%" }}>
          ½
        </span>
      </div>
      <div className="k-editor-ruler__left" aria-hidden="true">
        {verticalTicks.map((value) => (
          <span
            key={`y-${value}`}
            className={`k-editor-ruler__tick${value % 10 === 0 ? " is-major" : value % 5 === 0 ? " is-medium" : ""}`}
            style={{ top: verticalPosition(value) }}
          >
            {value % 10 === 0 ? <b>{value}</b> : null}
          </span>
        ))}
        <span
          className="k-editor-ruler__marker k-editor-ruler__marker--top"
          style={{ top: verticalPosition(marginTopMm) }}
          title={`Margem superior: ${marginTopMm} mm`}
        />
        <span
          className="k-editor-ruler__marker k-editor-ruler__marker--bottom"
          style={{ top: verticalPosition(Math.max(0, heightMm - marginBottomMm)) }}
          title={`Margem inferior: ${marginBottomMm} mm`}
        />
        <span className="k-editor-ruler__center" style={{ top: "50%" }}>
          ½
        </span>
      </div>
      <div className="k-editor-ruler__bleed-label" aria-hidden="true">
        Sangria {bleedMm} mm
      </div>
      {point ? (
        <>
          <span
            className="k-editor-ruler__crosshair k-editor-ruler__crosshair--vertical"
            style={{ left: point.x }}
            aria-hidden="true"
          />
          <span
            className="k-editor-ruler__crosshair k-editor-ruler__crosshair--horizontal"
            style={{ top: point.y }}
            aria-hidden="true"
          />
          <output
            className="k-editor-ruler__readout"
            data-testid="ruler-readout"
            style={{ left: point.x, top: point.y }}
          >
            X {point.xMm.toFixed(1)} mm · Y {point.yMm.toFixed(1)} mm
          </output>
        </>
      ) : null}
    </div>
  );
}

type ResizeBox = { left: number; top: number; width: number; height: number };

type FrameDraft = { frame: BlockFrame; box: ResizeBox };

function findBlockElement(pageElement: HTMLElement, blockId: string) {
  return Array.from(pageElement.querySelectorAll<HTMLElement>("[data-block-id]")).find(
    (element) => element.dataset["blockId"] === blockId,
  );
}

/** Alça visual do editor: dimensões são gravadas em mm para permanecerem físicas no print. */
function ImageResizeOverlay({
  pageRef,
  pageId,
  block,
  updateBlock,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: ImageBlock;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
}) {
  const [box, setBox] = useState<ResizeBox | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const syncBox = useCallback(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = findBlockElement(pageElement, block.id);
    if (!target) {
      setBox(null);
      return;
    }
    const pageRect = pageElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    setBox({
      left: (targetRect.left - pageRect.left) / scale,
      top: (targetRect.top - pageRect.top) / scale,
      width: targetRect.width / scale,
      height: targetRect.height / scale,
    });
  }, [block.id, pageRef]);

  useLayoutEffect(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const frame = window.requestAnimationFrame(syncBox);
    const target = findBlockElement(pageElement, block.id);
    const observer = target ? new ResizeObserver(syncBox) : null;
    if (target && observer) observer.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [block.id, pageRef, syncBox]);

  useEffect(() => {
    window.addEventListener("resize", syncBox);
    window.addEventListener("scroll", syncBox, true);
    return () => {
      window.removeEventListener("resize", syncBox);
      window.removeEventListener("scroll", syncBox, true);
    };
  }, [syncBox]);

  useEffect(() => () => cleanupDragRef.current?.(), []);

  if (!box) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = findBlockElement(pageElement, block.id);
    if (!target) return;
    cleanupDragRef.current?.();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);

    const pageRect = pageElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    const startWidth = targetRect.width / scale;
    const startHeight = targetRect.height / scale;
    const maxWidth = pageElement.offsetWidth;
    const maxHeight = pageElement.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;
    const startObjectX = block.objectX ?? 50;
    const startObjectY = block.objectY ?? 50;
    const startOffsetX = block.offsetX ?? 0;
    const startOffsetY = block.offsetY ?? 0;
    const isMove = event.currentTarget.dataset["resize"] === "false";
    const handle = event.currentTarget.dataset["handle"] ?? "se";
    const initialFrame = block.frame;
    const keepRatio = event.shiftKey;
    const ratio = startHeight > 0 ? startWidth / startHeight : 1;

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Alguns navegadores podem perder o pointerup ao sair do canvas. Um
      // movimento sem botões pressionados encerra o gesto órfão imediatamente.
      if (moveEvent.buttons === 0) {
        onPointerUp();
        return;
      }
      if (cropMode) {
        updateBlock(pageId, block.id, {
          objectX: Math.max(
            0,
            Math.min(100, startObjectX - ((moveEvent.clientX - startX) / targetRect.width) * 100),
          ),
          objectY: Math.max(
            0,
            Math.min(100, startObjectY - ((moveEvent.clientY - startY) / targetRect.height) * 100),
          ),
        });
        return;
      }
      const width = Math.max(
        CSS_PX_PER_MM * 10,
        Math.min(maxWidth, startWidth + (moveEvent.clientX - startX) / scale),
      );
      let height = Math.max(
        CSS_PX_PER_MM * 10,
        Math.min(maxHeight, startHeight + (moveEvent.clientY - startY) / scale),
      );
      if (isMove) {
        if (initialFrame) {
          updateBlock(pageId, block.id, {
            frame: {
              ...initialFrame,
              x: initialFrame.x + (moveEvent.clientX - startX) / scale / CSS_PX_PER_MM,
              y: initialFrame.y + (moveEvent.clientY - startY) / scale / CSS_PX_PER_MM,
            },
          });
        } else {
          updateBlock(pageId, block.id, {
            offsetX: Math.max(
              -100,
              Math.min(100, startOffsetX + ((moveEvent.clientX - startX) / pageRect.width) * 100),
            ),
            offsetY: Math.max(
              -100,
              Math.min(100, startOffsetY + ((moveEvent.clientY - startY) / pageRect.height) * 100),
            ),
          });
        }
        return;
      }
      if (keepRatio) height = Math.min(maxHeight, width / ratio);
      if (initialFrame) {
        const dx = (moveEvent.clientX - startX) / scale / CSS_PX_PER_MM;
        const dy = (moveEvent.clientY - startY) / scale / CSS_PX_PER_MM;
        const next = { ...initialFrame };
        if (handle.includes("w")) {
          next.x = initialFrame.x + dx;
          next.width = Math.max(10, initialFrame.width - dx);
        } else {
          next.width = Math.max(10, initialFrame.width + dx);
        }
        if (handle.includes("n")) {
          next.y = initialFrame.y + dy;
          next.height = Math.max(10, initialFrame.height - dy);
        } else {
          next.height = Math.max(10, initialFrame.height + dy);
        }
        updateBlock(pageId, block.id, { frame: next });
      } else {
        updateBlock(pageId, block.id, {
          width: `${Math.round((width / CSS_PX_PER_MM) * 10) / 10}mm`,
          height: `${Math.round((height / CSS_PX_PER_MM) * 10) / 10}mm`,
        });
      }
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      pointerTarget.removeEventListener("lostpointercapture", onPointerUp);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* o ponteiro pode já ter sido liberado pelo navegador */
      }
      if (cleanupDragRef.current === onPointerUp) cleanupDragRef.current = null;
      syncBox();
    };
    cleanupDragRef.current = onPointerUp;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
    pointerTarget.addEventListener("lostpointercapture", onPointerUp);
  };

  return (
    <div
      className="k-editor-resize-overlay"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      aria-label="Área redimensionável da imagem"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setCropMode((value) => !value);
      }}
      onPointerUp={() => cleanupDragRef.current?.()}
      onPointerCancel={() => cleanupDragRef.current?.()}
    >
      <div
        className="k-editor-image-mode-toolbar"
        role="group"
        aria-label="Modo de manipulação da imagem"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={!cropMode ? "is-active" : ""}
          aria-pressed={!cropMode}
          data-testid="image-box-mode"
          onClick={() => setCropMode(false)}
        >
          Mover caixa
        </button>
        <button
          type="button"
          className={cropMode ? "is-active" : ""}
          aria-pressed={cropMode}
          data-testid="image-content-mode"
          onClick={() => setCropMode(true)}
        >
          Mover imagem
        </button>
      </div>
      <div
        className={`k-editor-image-crop-surface${cropMode ? " is-crop-mode" : ""}`}
        data-testid="image-drag-surface"
        data-resize="false"
        aria-label={cropMode ? "Mover imagem dentro do recorte" : "Mover imagem na página"}
        onPointerDown={handlePointerDown}
        onPointerUp={() => cleanupDragRef.current?.()}
        onPointerCancel={() => cleanupDragRef.current?.()}
      />
      {(["nw", "ne", "sw", "se"] as const).map((handle) => (
        <button
          key={handle}
          type="button"
          className="k-editor-resize-handle"
          data-handle={handle}
          data-testid={handle === "se" ? "image-resize-handle" : `image-resize-handle-${handle}`}
          aria-label={`Redimensionar imagem pelo canto ${handle}`}
          onPointerDown={handlePointerDown}
          onPointerUp={() => cleanupDragRef.current?.()}
          onPointerCancel={() => cleanupDragRef.current?.()}
        />
      ))}
    </div>
  );
}

function BlockTransformOverlay({
  pageRef,
  pageId,
  block,
  updateBlock,
  onEdit,
  snapGrid,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: Block;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  onEdit: () => void;
  snapGrid: boolean;
}) {
  const [box, setBox] = useState<ResizeBox | null>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const syncBox = useCallback(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = findBlockElement(pageElement, block.id);
    if (!target) return setBox(null);
    const pageRect = pageElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    setBox({
      left: (targetRect.left - pageRect.left) / scale,
      top: (targetRect.top - pageRect.top) / scale,
      width: targetRect.width / scale,
      height: targetRect.height / scale,
    });
  }, [block.id, pageRef]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(syncBox);
    const target = pageRef.current ? findBlockElement(pageRef.current, block.id) : null;
    const observer = target ? new ResizeObserver(syncBox) : null;
    if (target && observer) observer.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [block.id, pageRef, syncBox]);

  useEffect(() => {
    window.addEventListener("resize", syncBox);
    window.addEventListener("scroll", syncBox, true);
    return () => {
      window.removeEventListener("resize", syncBox);
      window.removeEventListener("scroll", syncBox, true);
    };
  }, [syncBox]);

  useEffect(() => () => cleanupDragRef.current?.(), []);

  if (!box) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = findBlockElement(pageElement, block.id);
    if (!target) return;
    cleanupDragRef.current?.();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);
    const pageRect = pageElement.getBoundingClientRect();
    const contentRect =
      pageElement.querySelector<HTMLElement>(".k-page__content")?.getBoundingClientRect() ??
      pageRect;
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    const pxPerMm = 96 / 25.4;
    const targetRect = target.getBoundingClientRect();
    const initial: BlockFrame = block.frame ?? {
      x: (targetRect.left - contentRect.left) / scale / pxPerMm,
      y: (targetRect.top - contentRect.top) / scale / pxPerMm,
      width: targetRect.width / scale / pxPerMm,
      height: Math.max(8, targetRect.height / scale / pxPerMm),
    };
    const resize = event.currentTarget.dataset["resize"] === "true";
    const handle = event.currentTarget.dataset["handle"] ?? "se";
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (moveEvent: PointerEvent) => {
      // Recupera o estado caso o navegador entregue um pointermove sem
      // pointerup após o cursor deixar a área do editor.
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      const dx = (moveEvent.clientX - startX) / scale / pxPerMm;
      const dy = (moveEvent.clientY - startY) / scale / pxPerMm;
      const next = resize ? { ...initial } : { ...initial, x: initial.x + dx, y: initial.y + dy };
      if (resize) {
        if (handle.includes("w")) {
          next.x = initial.x + dx;
          next.width = Math.max(8, initial.width - dx);
        } else {
          next.width = Math.max(8, initial.width + dx);
        }
        if (handle.includes("n")) {
          next.y = initial.y + dy;
          next.height = Math.max(8, initial.height - dy);
        } else {
          next.height = Math.max(8, initial.height + dy);
        }
      }
      if (snapGrid) {
        next.x = Math.round(next.x);
        next.y = Math.round(next.y);
        next.width = Math.round(next.width);
        next.height = Math.round(next.height);
      }
      updateBlock(pageId, block.id, { frame: next });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      pointerTarget.removeEventListener("lostpointercapture", stop);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* o ponteiro pode já ter sido liberado pelo navegador */
      }
      if (cleanupDragRef.current === stop) cleanupDragRef.current = null;
      syncBox();
    };
    cleanupDragRef.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    pointerTarget.addEventListener("lostpointercapture", stop);
  };

  return (
    <div
      className="k-editor-transform-overlay"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      aria-label={`Moldura de composição do bloco ${block.type}`}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (["text", "heading", "quote", "caption", "box"].includes(block.type)) onEdit();
      }}
      onPointerUp={() => cleanupDragRef.current?.()}
      onPointerCancel={() => cleanupDragRef.current?.()}
    >
      <div
        className="k-editor-transform-surface"
        data-testid="block-drag-surface"
        data-resize="false"
        aria-label={`Mover bloco ${block.type}`}
        onPointerDown={onPointerDown}
        onPointerUp={() => cleanupDragRef.current?.()}
        onPointerCancel={() => cleanupDragRef.current?.()}
      />
      {(["nw", "ne", "sw", "se"] as const).map((handle) => (
        <button
          key={handle}
          type="button"
          className="k-editor-transform-handle"
          data-testid={handle === "se" ? "block-resize-handle" : `block-resize-handle-${handle}`}
          data-handle={handle}
          data-resize="true"
          aria-label={`Redimensionar bloco ${block.type} pelo canto ${handle}`}
          onPointerDown={onPointerDown}
          onPointerUp={() => cleanupDragRef.current?.()}
          onPointerCancel={() => cleanupDragRef.current?.()}
        />
      ))}
    </div>
  );
}

/** Uma página no editor: seleção, overlays de produção e detecção de overflow. */
export function PageCanvas({
  book,
  page,
  index,
  active,
}: {
  book: Book;
  page: Page;
  index: number;
  active: boolean;
}) {
  const {
    overlays,
    selectedBlock,
    selectedBlockId,
    selectBlock,
    selectPage,
    addBlock,
    updatePage,
    updatePageSettings,
    frameToolActive,
    setFrameToolActive,
    reportOverflow,
    overflowPages,
    updateBlock,
    updateTable,
    removeBlock,
    duplicateBlock,
    snapGrid,
  } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(null);
  const [selectedPageControl, setSelectedPageControl] = useState<PageControl | null>(null);
  const [rulerPoint, setRulerPoint] = useState<{
    x: number;
    y: number;
    xMm: number;
    yMm: number;
  } | null>(null);

  const selectBlockFromCanvas = useCallback(
    (blockId: string | null) => {
      setSelectedPageControl(null);
      selectBlock(blockId);
    },
    [selectBlock],
  );

  const handleFramePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!active || !frameToolActive) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-block-id]")) return;
    const pageElement = ref.current;
    const contentElement =
      pageElement?.querySelector<HTMLElement>(".k-page__content") ?? pageElement;
    if (!pageElement || !contentElement) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);
    const pageRect = pageElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    const pxPerMm = 96 / 25.4;
    const contentWidth = contentRect.width / scale / pxPerMm;
    const contentHeight = contentRect.height / scale / pxPerMm;
    const startX = Math.max(
      0,
      Math.min(contentWidth - 10, (event.clientX - contentRect.left) / scale / pxPerMm),
    );
    const startY = Math.max(
      0,
      Math.min(contentHeight - 10, (event.clientY - contentRect.top) / scale / pxPerMm),
    );
    const startPageX = (event.clientX - pageRect.left) / scale;
    const startPageY = (event.clientY - pageRect.top) / scale;
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* ponteiro já liberado pelo navegador */
      }
      const endX = Math.max(
        startX + 10,
        Math.min(contentWidth, (lastClientX - contentRect.left) / scale / pxPerMm),
      );
      const endY = Math.max(
        startY + 10,
        Math.min(contentHeight, (lastClientY - contentRect.top) / scale / pxPerMm),
      );
      const frame = {
        x: Math.round(startX * 10) / 10,
        y: Math.round(startY * 10) / 10,
        width: Math.round((endX - startX) * 10) / 10,
        height: Math.round((endY - startY) * 10) / 10,
      };
      setFrameDraft({
        frame,
        box: {
          left: startPageX,
          top: startPageY,
          width: (endX - startX) * pxPerMm,
          height: (endY - startY) * pxPerMm,
        },
      });
      setFrameToolActive(false);
    };
    let lastClientX = event.clientX;
    let lastClientY = event.clientY;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      lastClientX = moveEvent.clientX;
      lastClientY = moveEvent.clientY;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  };

  const createDraftBlock = (kind: "text" | "image") => {
    if (!frameDraft) return;
    const id = nextId("frame");
    const block: Block =
      kind === "text"
        ? { id, type: "text", content: "", role: "body", align: "start", frame: frameDraft.frame }
        : {
            id,
            type: "image",
            src: "",
            alt: "Imagem do frame",
            fit: "cover",
            position: "flow",
            frame: frameDraft.frame,
          };
    addBlock(page.id, block);
    selectBlockFromCanvas(id);
    if (kind === "text") setEditingBlockId(id);
    setFrameDraft(null);
  };

  useEffect(() => {
    const node = ref.current;
    if (!active || !overlays.rulers || !node) {
      setRulerPoint(null);
      return;
    }
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const scale = node.offsetWidth > 0 ? rect.width / node.offsetWidth : 1;
      const x = Math.max(0, Math.min(node.offsetWidth, (event.clientX - rect.left) / scale));
      const y = Math.max(0, Math.min(node.offsetHeight, (event.clientY - rect.top) / scale));
      const widthMm = mmValue(book.tokens.pageWidth);
      const heightMm = mmValue(book.tokens.pageHeight);
      setRulerPoint({
        x,
        y,
        xMm: node.offsetWidth > 0 ? (x / node.offsetWidth) * widthMm : 0,
        yMm: node.offsetHeight > 0 ? (y / node.offsetHeight) * heightMm : 0,
      });
    };
    const leave = () => setRulerPoint(null);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, [active, book.tokens.pageHeight, book.tokens.pageWidth, overlays.rulers, page.id]);

  const handleAssetDrop = (event: React.DragEvent<HTMLElement>) => {
    const raw = event.dataTransfer.getData("application/x-kallistis-asset");
    if (!raw) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-recipe-slot]");
    const blockId = target?.closest<HTMLElement>("[data-block-id]")?.dataset["blockId"];
    const block = page.blocks.find((item) => item.id === blockId);
    try {
      const asset = JSON.parse(raw) as { src?: string; label?: string; effectivePpi?: number };
      if (!asset.src) return;
      event.preventDefault();
      if (target && block?.type === "image") {
        const slot = target.dataset["recipeSlot"] ?? "";
        if (
          !["portrait", "image", "hero-image", "map", "symbol"].some(
            (kind) => slot === kind || slot.startsWith(`${kind}-`),
          )
        )
          return;
        updateBlock(page.id, block.id, {
          src: asset.src,
          alt: asset.label ?? block.alt,
          ...(asset.effectivePpi ? { effectivePpi: asset.effectivePpi } : {}),
        });
        return;
      }
      const pageElement = ref.current;
      const contentElement =
        pageElement?.querySelector<HTMLElement>(".k-page__content") ?? pageElement;
      if (!pageElement || !contentElement) return;
      const pageRect = pageElement.getBoundingClientRect();
      const contentRect = contentElement.getBoundingClientRect();
      const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
      const pxPerMm = 96 / 25.4;
      const width = Math.min(54, contentRect.width / scale / pxPerMm);
      const height = Math.min(62, contentRect.height / scale / pxPerMm);
      const x = Math.max(
        0,
        Math.min(
          contentRect.width / scale / pxPerMm - width,
          (event.clientX - contentRect.left) / scale / pxPerMm - width / 2,
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          contentRect.height / scale / pxPerMm - height,
          (event.clientY - contentRect.top) / scale / pxPerMm - height / 2,
        ),
      );
      const image: ImageBlock = {
        id: nextId("frame-image"),
        type: "image",
        src: asset.src,
        alt: asset.label ?? "Imagem",
        fit: "cover",
        position: "flow",
        frame: { x, y, width, height },
        ...(asset.effectivePpi ? { effectivePpi: asset.effectivePpi } : {}),
      };
      addBlock(page.id, image);
      selectBlockFromCanvas(image.id);
    } catch {
      /* clipboard de asset inválido não altera o documento */
    }
  };

  useEffect(() => {
    if (!active || (!selectedBlockId && !selectedPageControl)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "Delete") {
        event.preventDefault();
        if (selectedPageControl) {
          if (
            selectedPageControl === "header" ||
            selectedPageControl === "footer" ||
            selectedPageControl === "pageNumber"
          ) {
            updatePageSettings(page.id, { [selectedPageControl]: false });
          } else if (selectedPageControl === "title") {
            updatePage(page.id, { title: "" });
          } else if (selectedPageControl === "subtitle") {
            updatePage(page.id, { subtitle: undefined });
          } else if (selectedPageControl === "eyebrow") {
            updatePage(page.id, { eyebrow: undefined });
          } else if (selectedPageControl === "templateMeta") {
            updatePage(page.id, { coverMode: "art-only" });
          }
          setSelectedPageControl(null);
          return;
        }
        if (selectedBlockId) removeBlock(page.id, selectedBlockId);
        selectBlockFromCanvas(null);
        return;
      }
      if (
        selectedBlockId &&
        (event.key === "ArrowLeft" ||
          event.key === "ArrowRight" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown")
      ) {
        event.preventDefault();
        const block = page.blocks.find((item) => item.id === selectedBlockId);
        if (!block?.frame || block.locked) return;
        const distance = event.shiftKey ? 5 : 1;
        const delta =
          event.key === "ArrowLeft"
            ? { x: -distance }
            : event.key === "ArrowRight"
              ? { x: distance }
              : event.key === "ArrowUp"
                ? { y: -distance }
                : { y: distance };
        updateBlock(page.id, block.id, {
          frame: {
            ...block.frame,
            x: block.frame.x + (delta.x ?? 0),
            y: block.frame.y + (delta.y ?? 0),
          },
        });
      }
      if (selectedBlockId && event.key.toLowerCase() === "d" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        duplicateBlock(page.id, selectedBlockId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    active,
    duplicateBlock,
    page.id,
    removeBlock,
    selectBlockFromCanvas,
    selectedBlockId,
    selectedPageControl,
    updatePage,
    updatePageSettings,
  ]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const check = () => {
      const box = node.querySelector<HTMLElement>(".k-page__content") ?? node;
      const overflowing = box.scrollHeight - box.clientHeight > 2;
      reportOverflow(page.id, overflowing);
    };
    const raf = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(raf);
  }, [page, reportOverflow]);

  return (
    <BookRenderContext.Provider
      value={{
        interactive: true,
        selectedBlockId,
        onSelectBlock: selectBlockFromCanvas,
        onSheetValueChange: (blockId, key, value) => {
          const block = page.blocks.find((item) => item.id === blockId);
          if (!block || block.type !== "sheet") return;
          updateBlock(page.id, blockId, {
            sheet: { ...block.sheet, values: { ...block.sheet.values, [key]: value } },
          });
        },
      }}
    >
      <PageRenderer
        ref={ref}
        book={book}
        page={page}
        index={index}
        className={`k-editor-page${active ? " k-editor-page--active" : ""}`}
        onClick={() => {
          setSelectedPageControl(null);
          selectPage(page.id);
        }}
        onPointerDown={handleFramePointerDown}
        onSelectPageControl={(control) => {
          setSelectedPageControl(control);
          selectBlock(null);
        }}
        onDoubleClick={(blockId) => {
          if (!active || !blockId) return;
          const target = page.blocks.find((block) => block.id === blockId);
          if (target && ["text", "heading", "quote", "caption", "box"].includes(target.type)) {
            setEditingBlockId(blockId);
          }
        }}
        onDragOver={(event) => {
          if (
            (event.target as HTMLElement).closest("[data-recipe-slot]") ||
            event.dataTransfer.types.includes("application/x-kallistis-asset")
          )
            event.preventDefault();
        }}
        onDrop={handleAssetDrop}
        overflow={Boolean(overflowPages[page.id])}
      >
        <OverlayLayers overlays={overlays} />
        {active && overlays.rulers ? <RulerOverlay book={book} point={rulerPoint} /> : null}
        {active && selectedBlock?.type === "image" ? (
          <ImageResizeOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
          />
        ) : null}
        {active && selectedBlock && !["image", "table", "sheet"].includes(selectedBlock.type) ? (
          <BlockTransformOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
            onEdit={() => {
              if (["text", "heading", "quote", "caption", "box"].includes(selectedBlock.type))
                setEditingBlockId(selectedBlock.id);
            }}
            snapGrid={snapGrid}
          />
        ) : null}
        {active && selectedBlock?.type === "table" ? (
          <TableEditorOverlay
            pageRef={ref}
            pageId={page.id}
            block={normalizeTableBlock(selectedBlock)}
            updateTable={updateTable}
          />
        ) : null}
        {active && selectedBlock?.type === "sheet" ? (
          <SheetDesignerOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
          />
        ) : null}
        {active && editingBlockId && selectedBlock?.id === editingBlockId ? (
          <InlineTextEditorOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
            onClose={() => setEditingBlockId(null)}
          />
        ) : null}
        {active && frameDraft ? (
          <div
            className="k-editor-frame-draft"
            style={frameDraft.box}
            aria-label="Novo frame"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="k-editor-frame-draft__actions" role="group" aria-label="Tipo de frame">
              <button type="button" onClick={() => createDraftBlock("text")}>
                TEXTO
              </button>
              <button type="button" onClick={() => createDraftBlock("image")}>
                IMAGEM
              </button>
              <button type="button" onClick={() => setFrameDraft(null)} aria-label="Cancelar frame">
                ×
              </button>
            </div>
          </div>
        ) : null}
      </PageRenderer>
    </BookRenderContext.Provider>
  );
}
