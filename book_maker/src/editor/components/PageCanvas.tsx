import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Block, BlockFrame, Book, ImageBlock, Page } from "../../book/types";
import { PageRenderer, type PageControl } from "../../book/renderer/PageRenderer";
import { BookRenderContext } from "../../book/renderer/context";
import { nextId, useEditor, type Overlays, type SelectionModifiers } from "../state/store";
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
    </div>
  );
}

function CursorGuideOverlay({
  point,
}: {
  point: { x: number; y: number; xMm: number; yMm: number } | null;
}) {
  if (!point) return null;
  return (
    <div className="k-editor-ruler k-editor-cursor-guides" aria-hidden="true">
      <span
        className="k-editor-ruler__crosshair k-editor-ruler__crosshair--vertical"
        style={{ left: point.x }}
      />
      <span
        className="k-editor-ruler__crosshair k-editor-ruler__crosshair--horizontal"
        style={{ top: point.y }}
      />
      <output
        className="k-editor-ruler__readout"
        data-testid="ruler-readout"
        style={{ left: point.x, top: point.y }}
      >
        X {point.xMm.toFixed(1)} mm · Y {point.yMm.toFixed(1)} mm
      </output>
    </div>
  );
}

type ContextMenuState = { x: number; y: number } | null;

function CanvasContextMenu({
  state,
  selectedPage,
  selectedBlock,
  selectedBlockIds,
  onClose,
  onEdit,
  onDuplicate,
  onCopy,
  onPaste,
  hasBlockClipboard,
  onGroup,
  onUngroup,
  onLock,
  onDelete,
  onAlign,
  onDistribute,
  onTidy,
  onMoveLayer,
  onInsert,
  onToggleMargins,
}: {
  state: ContextMenuState;
  selectedPage: Page;
  selectedBlock: Block | null;
  selectedBlockIds: string[];
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  hasBlockClipboard: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  onLock: () => void;
  onDelete: () => void;
  onAlign: (value: "left" | "center-x" | "right" | "top" | "center-y" | "bottom") => void;
  onDistribute: (axis: "horizontal" | "vertical") => void;
  onTidy: () => void;
  onMoveLayer: (direction: -1 | 1) => void;
  onInsert: (type: "text" | "image" | "box") => void;
  onToggleMargins: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const close = () => onClose();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [onClose, state]);

  if (!state || typeof document === "undefined") return null;
  const multiple = selectedBlockIds.length > 1;
  const hasGroup = selectedBlockIds.some((id) =>
    selectedPage.blocks.some((block) => block.id === id && block.groupId),
  );
  const allLocked = selectedBlockIds.length > 0 && selectedBlockIds.every((id) =>
    selectedPage.blocks.some((block) => block.id === id && block.locked),
  );
  const action = (callback: () => void) => () => {
    callback();
    onClose();
  };
  const button = (label: string, callback: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      className="k-editor-context-menu__item"
      onClick={action(callback)}
    >
      {label}
    </button>
  );
  return createPortal(
    <div
      className="k-editor-context-menu"
      style={{
        left: `${Math.max(8, Math.min(state.x || 0, window.innerWidth - 210))}px`,
        top: `${Math.max(8, Math.min(state.y || 0, window.innerHeight - 250))}px`,
      }}
      role="menu"
      aria-label="Menu contextual do canvas"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {selectedBlock ? button("Editar", onEdit, !["text", "heading", "quote", "caption", "box"].includes(selectedBlock.type)) : null}
      {selectedBlockIds.length ? button("Copiar", onCopy) : null}
      {button("Colar", onPaste, !hasBlockClipboard)}
      {selectedBlock ? button("Duplicar", onDuplicate) : null}
      {multiple ? button("Agrupar", onGroup) : null}
      {hasGroup ? button("Desagrupar", onUngroup) : null}
      {multiple ? (
        <>
          <div className="k-editor-context-menu__separator" />
          <div className="k-editor-context-menu__label">Alinhar</div>
          {button("À esquerda", () => onAlign("left"))}
          {button("Centro horizontal", () => onAlign("center-x"))}
          {button("À direita", () => onAlign("right"))}
          {button("Ao topo", () => onAlign("top"))}
          {button("Centro vertical", () => onAlign("center-y"))}
          {button("À base", () => onAlign("bottom"))}
          {button("Distribuir horizontal", () => onDistribute("horizontal"))}
          {button("Distribuir vertical", () => onDistribute("vertical"))}
          <div className="k-editor-context-menu__separator" />
          <div className="k-editor-context-menu__label">Organizar</div>
          {button("Espaçar igualmente horizontal", () => onDistribute("horizontal"))}
          {button("Espaçar igualmente vertical", () => onDistribute("vertical"))}
          {button("Arrumar automaticamente", onTidy)}
        </>
      ) : null}
      {selectedBlockIds.length ? (
        <>
          <div className="k-editor-context-menu__separator" />
          {button(allLocked ? "Desbloquear" : "Bloquear", onLock)}
          {selectedBlock ? button("Trazer para frente", () => onMoveLayer(1)) : null}
          {selectedBlock ? button("Enviar para trás", () => onMoveLayer(-1)) : null}
          {button("Excluir", onDelete)}
        </>
      ) : (
        <>
          {button("Inserir texto", () => onInsert("text"))}
          {button("Inserir imagem", () => onInsert("image"))}
          {button("Inserir box", () => onInsert("box"))}
          {button("Mostrar/ocultar margens", onToggleMargins)}
        </>
      )}
    </div>,
    document.body,
  );
}

type ResizeBox = { left: number; top: number; width: number; height: number };

type FrameDraft = { frame: BlockFrame; box: ResizeBox };
type SmartGuide = { axis: "x" | "y"; position: number; label: string };
type SnapCandidate = { value: number; guidePosition: number; label: string; priority: number };
type SnapResult = { frame: BlockFrame; guides: SmartGuide[] };

function SmartGuidesOverlay({
  guides,
  book,
  pageIndex,
}: {
  guides: SmartGuide[];
  book: Book;
  pageIndex: number;
}) {
  if (!guides.length) return null;
  const width = mmValue(book.tokens.pageWidth);
  const height = mmValue(book.tokens.pageHeight);
  const marginInner = mmValue(book.tokens.marginInner);
  const marginOuter = mmValue(book.tokens.marginOuter);
  const marginTop = mmValue(book.tokens.marginTop);
  const verso = (pageIndex + book.meta.firstFolio) % 2 === 0;
  const contentLeft = verso ? marginOuter : marginInner;
  return (
    <div className="k-editor-smart-guides" aria-live="polite">
      {guides.map((guide, index) => (
        <div
          key={`${guide.axis}-${guide.position}-${index}`}
          className={`k-editor-smart-guide k-editor-smart-guide--${guide.axis}`}
          style={
            guide.axis === "x"
              ? { left: `${((contentLeft + guide.position) / Math.max(1, width)) * 100}%` }
              : { top: `${((marginTop + guide.position) / Math.max(1, height)) * 100}%` }
          }
        >
          <span>{guide.label}</span>
        </div>
      ))}
    </div>
  );
}

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
  snapFrame,
  onGuidesChange,
  smartGuides,
  snapEnabled,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: ImageBlock;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  snapFrame?: (
    blockId: string,
    frame: BlockFrame,
    selectedIds: string[],
    movingBounds?: BlockFrame,
  ) => SnapResult;
  onGuidesChange?: (guides: SmartGuide[]) => void;
  smartGuides: boolean;
  snapEnabled: boolean;
}) {
  const [box, setBox] = useState<ResizeBox | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const geometryKey = [
    block.frame?.x,
    block.frame?.y,
    block.frame?.width,
    block.frame?.height,
    block.offsetX,
    block.offsetY,
    block.width,
    block.height,
  ].join("|");

  const syncBox = useCallback(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    if (block.locked) return;
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
  }, [block.id, pageRef, syncBox, geometryKey]);

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
    if (block.locked) return;
    cleanupDragRef.current?.();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);

    const pageRect = pageElement.getBoundingClientRect();
    const contentRect =
      pageElement.querySelector<HTMLElement>(".k-page__content")?.getBoundingClientRect() ??
      pageRect;
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
    const isMove = event.currentTarget.dataset["resize"] === "false";
    const handle = event.currentTarget.dataset["handle"] ?? "se";
    // “Mover caixa” deve mover o objeto inteiro. Para uma imagem que ainda
    // está no fluxo, o primeiro arraste materializa a geometria atual como
    // moldura física; offsetX/offsetY fica reservado ao enquadramento interno.
    const initialFrame = block.frame ?? {
      x: (targetRect.left - contentRect.left) / scale / CSS_PX_PER_MM,
      y: (targetRect.top - contentRect.top) / scale / CSS_PX_PER_MM,
      width: targetRect.width / scale / CSS_PX_PER_MM,
      height: Math.max(10, targetRect.height / scale / CSS_PX_PER_MM),
    };
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
        const rawFrame = {
          ...initialFrame,
          x: initialFrame.x + (moveEvent.clientX - startX) / scale / CSS_PX_PER_MM,
          y: initialFrame.y + (moveEvent.clientY - startY) / scale / CSS_PX_PER_MM,
        };
        const snapped = snapFrame
          ? snapFrame(block.id, rawFrame, [block.id])
          : { frame: rawFrame, guides: [] };
        onGuidesChange?.(smartGuides ? snapped.guides : []);
        updateBlock(pageId, block.id, {
          frame: snapEnabled ? snapped.frame : rawFrame,
        });
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
  selectedBlockIds,
  selectedBlocks,
  updateBlock,
  snapFrame,
  onGuidesChange,
  onEdit,
  snapGrid,
  smartGuides,
  snapEnabled,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: Block;
  selectedBlockIds: string[];
  selectedBlocks: Block[];
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  snapFrame?: (
    blockId: string,
    frame: BlockFrame,
    selectedIds: string[],
    movingBounds?: BlockFrame,
  ) => SnapResult;
  onGuidesChange?: (guides: SmartGuide[]) => void;
  onEdit: () => void;
  snapGrid: boolean;
  smartGuides: boolean;
  snapEnabled: boolean;
}) {
  const [box, setBox] = useState<ResizeBox | null>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const syncBox = useCallback(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const targets = selectedBlockIds
      .map((id) => findBlockElement(pageElement, id))
      .filter((element): element is HTMLElement => Boolean(element));
    const target = findBlockElement(pageElement, block.id);
    if (!target || !targets.length) return setBox(null);
    const pageRect = pageElement.getBoundingClientRect();
    const rects = targets.map((element) => element.getBoundingClientRect());
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    setBox({
      left: (left - pageRect.left) / scale,
      top: (top - pageRect.top) / scale,
      width: (right - left) / scale,
      height: (bottom - top) / scale,
    });
  }, [block.id, pageRef, selectedBlockIds]);

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
    if (block.locked) return;
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
    let lastDx = 0;
    let lastDy = 0;
    const groupFrames = selectedBlockIds.length > 1
      ? selectedBlocks.flatMap((item) => {
          const element = findBlockElement(pageElement, item.id);
          if (!element) return [];
          const rect = element.getBoundingClientRect();
          const frame = item.frame ?? {
            x: (rect.left - contentRect.left) / scale / pxPerMm,
            y: (rect.top - contentRect.top) / scale / pxPerMm,
            width: rect.width / scale / pxPerMm,
            height: Math.max(8, rect.height / scale / pxPerMm),
          };
          return [{ item, frame }];
        })
      : [];
    const initialGroupBounds = groupFrames.length
      ? {
          x: Math.min(...groupFrames.map(({ frame }) => frame.x)),
          y: Math.min(...groupFrames.map(({ frame }) => frame.y)),
          width:
            Math.max(...groupFrames.map(({ frame }) => frame.x + frame.width)) -
            Math.min(...groupFrames.map(({ frame }) => frame.x)),
          height:
            Math.max(...groupFrames.map(({ frame }) => frame.y + frame.height)) -
            Math.min(...groupFrames.map(({ frame }) => frame.y)),
        }
      : null;
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
      if (!resize && selectedBlockIds.length > 1) {
        const rawPrimary = { ...initial, x: initial.x + dx, y: initial.y + dy };
        const movingBounds = initialGroupBounds
          ? { ...initialGroupBounds, x: initialGroupBounds.x + dx, y: initialGroupBounds.y + dy }
          : undefined;
        const snapped = snapFrame
          ? snapFrame(block.id, rawPrimary, selectedBlockIds, movingBounds)
          : { frame: rawPrimary, guides: [] };
        onGuidesChange?.(smartGuides ? snapped.guides : []);
        const targetFrame = snapEnabled ? snapped.frame : rawPrimary;
        const correctionX = targetFrame.x - rawPrimary.x;
        const correctionY = targetFrame.y - rawPrimary.y;
        groupFrames.forEach(({ item, frame }) => {
          if (!item.locked) {
            updateBlock(pageId, item.id, {
              frame: {
                ...frame,
                x: frame.x + dx + correctionX,
                y: frame.y + dy + correctionY,
              },
            });
          }
        });
        lastDx = dx;
        lastDy = dy;
        return;
      }
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
      const snapped = !resize && snapFrame
        ? snapFrame(block.id, next, selectedBlockIds)
        : { frame: next, guides: [] };
      onGuidesChange?.(smartGuides ? snapped.guides : []);
      updateBlock(pageId, block.id, { frame: snapEnabled ? snapped.frame : next });
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
      onGuidesChange?.([]);
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
      aria-label={
        selectedBlockIds.length > 1
          ? `Moldura da seleção com ${selectedBlockIds.length} elementos`
          : `Moldura de composição do bloco ${block.type}`
      }
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
      {selectedBlockIds.length === 1
        ? (["nw", "ne", "sw", "se"] as const).map((handle) => (
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
      ))
        : null}
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
    selectedBlockIds,
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
    copySelectedBlocks,
    pasteBlocks,
    hasBlockClipboard,
    groupBlocks,
    ungroupBlocks,
    moveBlocksBy,
    toggleBlocksLocked,
    alignBlocks,
    distributeBlocks,
    tidyBlocks,
    moveBlock,
    toggleOverlay,
    snapGrid,
    smartGuides: smartGuidesEnabled,
    snapEnabled,
    cursorGuides,
  } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(null);
  const [selectedPageControl, setSelectedPageControl] = useState<PageControl | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const [rulerPoint, setRulerPoint] = useState<{
    x: number;
    y: number;
    xMm: number;
    yMm: number;
  } | null>(null);
  const lastPastePointRef = useRef<{ x: number; y: number } | null>(null);

  const recordPastePoint = useCallback((clientX: number, clientY: number) => {
    const pageElement = ref.current;
    const contentElement =
      pageElement?.querySelector<HTMLElement>(".k-page__content") ?? pageElement;
    if (!pageElement || !contentElement) return;
    const pageRect = pageElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    const pxPerMm = CSS_PX_PER_MM;
    const contentWidth = contentRect.width / scale / pxPerMm;
    const contentHeight = contentRect.height / scale / pxPerMm;
    lastPastePointRef.current = {
      x: Math.max(0, Math.min(contentWidth, (clientX - contentRect.left) / scale / pxPerMm)),
      y: Math.max(0, Math.min(contentHeight, (clientY - contentRect.top) / scale / pxPerMm)),
    };
  }, []);

  const selectBlockFromCanvas = useCallback(
    (blockId: string | null, modifiers?: SelectionModifiers) => {
      setSelectedPageControl(null);
      selectBlock(blockId, modifiers);
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

  const insertContextBlock = (type: "text" | "image" | "box") => {
    if (!contextMenu) return;
    const pageElement = ref.current;
    const contentElement =
      pageElement?.querySelector<HTMLElement>(".k-page__content") ?? pageElement;
    if (!pageElement || !contentElement) return;
    const pageRect = pageElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    const pxPerMm = 96 / 25.4;
    const width = type === "box" ? 62 : 54;
    const height = type === "box" ? 34 : 24;
    const frame = {
      x: Math.max(0, (contextMenu.x - contentRect.left) / scale / pxPerMm - width / 2),
      y: Math.max(0, (contextMenu.y - contentRect.top) / scale / pxPerMm - height / 2),
      width,
      height,
    };
    const block: Block =
      type === "text"
        ? { id: nextId("context-text"), type, content: "Novo texto.", role: "body", frame }
        : type === "image"
          ? { id: nextId("context-image"), type, src: "", alt: "Imagem", fit: "cover", position: "flow", frame }
          : { id: nextId("context-box"), type, kind: "regra", title: "Novo box", content: "Conteúdo.", frame };
    addBlock(page.id, block);
    selectBlockFromCanvas(block.id);
    if (type === "text") setEditingBlockId(block.id);
    setContextMenu(null);
  };

  const snapFrame = useCallback(
    (
      blockId: string,
      frame: BlockFrame,
      selectedIds: string[],
      currentMovingBounds?: BlockFrame,
    ): SnapResult => {
      const pageElement = ref.current;
      const contentElement =
        pageElement?.querySelector<HTMLElement>(".k-page__content") ?? pageElement;
      if (!pageElement || !contentElement) return { frame, guides: [] };
      const pageRect = pageElement.getBoundingClientRect();
      const contentRect = contentElement.getBoundingClientRect();
      const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
      const pxPerMm = 96 / 25.4;
      const contentWidth = contentRect.width / scale / pxPerMm;
      const contentHeight = contentRect.height / scale / pxPerMm;
      const pageWidthMm = mmValue(book.tokens.pageWidth);
      const pageHeightMm = mmValue(book.tokens.pageHeight);
      const marginInnerMm = mmValue(book.tokens.marginInner);
      const marginOuterMm = mmValue(book.tokens.marginOuter);
      const marginTopMm = mmValue(book.tokens.marginTop);
      const verso = (index + book.meta.firstFolio) % 2 === 0;
      const contentLeftMm = verso ? marginOuterMm : marginInnerMm;
      const pageCenterXInContent = pageWidthMm / 2 - contentLeftMm;
      const pageCenterYInContent = pageHeightMm / 2 - marginTopMm;
      const measured = (id: string): BlockFrame | null => {
        const element = findBlockElement(pageElement, id);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: (rect.left - contentRect.left) / scale / pxPerMm,
          y: (rect.top - contentRect.top) / scale / pxPerMm,
          width: rect.width / scale / pxPerMm,
          height: Math.max(8, rect.height / scale / pxPerMm),
        };
      };
      const movingFrames = selectedIds.length > 1
        ? page.blocks
            .filter((item) => selectedIds.includes(item.id) && !item.hidden)
            .map((item) => item.frame ?? measured(item.id))
            .filter((item): item is BlockFrame => Boolean(item))
        : [frame];
      const movingBounds: BlockFrame = currentMovingBounds ?? {
        x: Math.min(...movingFrames.map((item) => item.x)),
        y: Math.min(...movingFrames.map((item) => item.y)),
        width:
          Math.max(...movingFrames.map((item) => item.x + item.width)) -
          Math.min(...movingFrames.map((item) => item.x)),
        height:
          Math.max(...movingFrames.map((item) => item.y + item.height)) -
          Math.min(...movingFrames.map((item) => item.y)),
      };
      const otherFrames = page.blocks
        .filter((item) => item.id !== blockId && !selectedIds.includes(item.id) && !item.hidden)
        .map((item) => item.frame ?? measured(item.id))
        .filter((item): item is BlockFrame => Boolean(item));
      const safeInset = 5;
      const xCandidates: SnapCandidate[] = [
        { value: 0, guidePosition: 0, label: "margem esquerda", priority: 3 },
        {
          value: contentWidth - movingBounds.width,
          guidePosition: contentWidth,
          label: "margem direita",
          priority: 3,
        },
        {
          value: pageCenterXInContent - movingBounds.width / 2,
          guidePosition: pageCenterXInContent,
          label: "centro vertical",
          priority: 0,
        },
        { value: safeInset, guidePosition: safeInset, label: "área segura esquerda", priority: 4 },
        {
          value: contentWidth - safeInset - movingBounds.width,
          guidePosition: contentWidth - safeInset,
          label: "área segura direita",
          priority: 4,
        },
      ];
      const yCandidates: SnapCandidate[] = [
        { value: 0, guidePosition: 0, label: "margem superior", priority: 3 },
        {
          value: contentHeight - movingBounds.height,
          guidePosition: contentHeight,
          label: "margem inferior",
          priority: 3,
        },
        {
          value: pageCenterYInContent - movingBounds.height / 2,
          guidePosition: pageCenterYInContent,
          label: "centro horizontal",
          priority: 0,
        },
        { value: safeInset, guidePosition: safeInset, label: "área segura superior", priority: 4 },
        {
          value: contentHeight - safeInset - movingBounds.height,
          guidePosition: contentHeight - safeInset,
          label: "área segura inferior",
          priority: 4,
        },
      ];
      otherFrames.forEach((other) => {
        xCandidates.push(
          { value: other.x, guidePosition: other.x, label: "borda esquerda", priority: 1 },
          {
            value: other.x + other.width - movingBounds.width,
            guidePosition: other.x + other.width,
            label: "borda direita",
            priority: 1,
          },
          {
            value: other.x + other.width / 2 - movingBounds.width / 2,
            guidePosition: other.x + other.width / 2,
            label: "mesmo centro",
            priority: 1,
          },
        );
        yCandidates.push(
          { value: other.y, guidePosition: other.y, label: "topo alinhado", priority: 1 },
          {
            value: other.y + other.height - movingBounds.height,
            guidePosition: other.y + other.height,
            label: "base alinhada",
            priority: 1,
          },
          {
            value: other.y + other.height / 2 - movingBounds.height / 2,
            guidePosition: other.y + other.height / 2,
            label: "mesmo centro",
            priority: 1,
          },
        );
      });
      const sortedX = [...otherFrames].sort((a, b) => a.x - b.x);
      for (let index = 0; index + 1 < sortedX.length; index += 1) {
        const first = sortedX[index]!;
        const second = sortedX[index + 1]!;
        const available = second.x - (first.x + first.width) - movingBounds.width;
        if (available >= 0) {
          const gap = available / 2;
          xCandidates.push(
            {
              value: first.x + first.width + gap,
              guidePosition: first.x + first.width + gap + movingBounds.width / 2,
              label: `espaçamento ${gap.toFixed(1)} mm`,
              priority: 2,
            },
            {
              value: second.x - movingBounds.width - gap,
              guidePosition: second.x - gap - movingBounds.width / 2,
              label: `espaçamento ${gap.toFixed(1)} mm`,
              priority: 2,
            },
          );
        }
      }
      const sortedY = [...otherFrames].sort((a, b) => a.y - b.y);
      for (let index = 0; index + 1 < sortedY.length; index += 1) {
        const first = sortedY[index]!;
        const second = sortedY[index + 1]!;
        const available = second.y - (first.y + first.height) - movingBounds.height;
        if (available >= 0) {
          const gap = available / 2;
          yCandidates.push(
            {
              value: first.y + first.height + gap,
              guidePosition: first.y + first.height + gap + movingBounds.height / 2,
              label: `espaçamento ${gap.toFixed(1)} mm`,
              priority: 2,
            },
            {
              value: second.y - movingBounds.height - gap,
              guidePosition: second.y - gap - movingBounds.height / 2,
              label: `espaçamento ${gap.toFixed(1)} mm`,
              priority: 2,
            },
          );
        }
      }
      const choose = (value: number, candidates: SnapCandidate[]) => {
        const nearest = candidates.reduce((best, candidate) => {
          const candidateDistance = Math.abs(candidate.value - value);
          const bestDistance = Math.abs(best.value - value);
          if (candidateDistance < bestDistance - 0.01) return candidate;
          if (Math.abs(candidateDistance - bestDistance) <= 0.01) {
            return candidate.priority < best.priority ? candidate : best;
          }
          return best;
        });
        return Math.abs(nearest.value - value) <= 2.2 ? nearest : null;
      };
      const x = choose(movingBounds.x, xCandidates);
      const y = choose(movingBounds.y, yCandidates);
      const snappedX = x ? Math.max(0, x.value) : movingBounds.x;
      const snappedY = y ? Math.max(0, y.value) : movingBounds.y;
      return {
        frame: {
          ...frame,
          x: frame.x + snappedX - movingBounds.x,
          y: frame.y + snappedY - movingBounds.y,
        },
        guides: [
          ...(x ? [{ axis: "x" as const, position: x.guidePosition, label: x.label }] : []),
          ...(y ? [{ axis: "y" as const, position: y.guidePosition, label: y.label }] : []),
        ],
      };
    },
    [
      book.meta.firstFolio,
      book.tokens.marginInner,
      book.tokens.marginOuter,
      book.tokens.marginTop,
      book.tokens.pageHeight,
      book.tokens.pageWidth,
      index,
      page.blocks,
    ],
  );

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    recordPastePoint(event.clientX, event.clientY);
    const blockId = (event.target as HTMLElement).closest<HTMLElement>("[data-block-id]")?.dataset[
      "blockId"
    ];
    const selectionOverlay = (event.target as HTMLElement).closest(
      ".k-editor-transform-overlay, .k-editor-image-crop-surface",
    );
    if (blockId && !selectedBlockIds.includes(blockId)) selectBlockFromCanvas(blockId);
    if (!blockId && !selectionOverlay) selectBlockFromCanvas(null);
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) {
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
  }, [active, book.tokens.pageHeight, book.tokens.pageWidth, page.id]);

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
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingBlockId(null);
        setSelectedPageControl(null);
        selectBlockFromCanvas(null);
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "c" && selectedBlockIds.length) {
          event.preventDefault();
          copySelectedBlocks();
          return;
        }
        if (event.key.toLowerCase() === "v" && hasBlockClipboard) {
          event.preventDefault();
          pasteBlocks(page.id, lastPastePointRef.current ?? undefined);
          return;
        }
      }
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
        if (selectedBlockIds.length) {
          selectedBlockIds.forEach((blockId) => removeBlock(page.id, blockId));
        }
        selectBlockFromCanvas(null);
        return;
      }
      if (
        selectedBlockIds.length > 0 &&
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
        moveBlocksBy(page.id, selectedBlockIds, delta.x ?? 0, delta.y ?? 0);
      }
      if (selectedBlockIds.length > 1 && event.key.toLowerCase() === "g" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (event.shiftKey) ungroupBlocks(page.id, selectedBlockIds);
        else groupBlocks(page.id, selectedBlockIds);
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
    copySelectedBlocks,
    hasBlockClipboard,
    page.id,
    removeBlock,
    groupBlocks,
    ungroupBlocks,
    moveBlocksBy,
    selectBlockFromCanvas,
    selectedBlockId,
    selectedBlockIds,
    selectedPageControl,
    pasteBlocks,
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
        selectedBlockIds,
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
        onPointerDown={(event) => {
          recordPastePoint(event.clientX, event.clientY);
          handleFramePointerDown(event);
        }}
        onContextMenu={handleContextMenu}
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
        {active ? <SmartGuidesOverlay guides={smartGuides} book={book} pageIndex={index} /> : null}
        {active && overlays.rulers ? <RulerOverlay book={book} point={rulerPoint} /> : null}
        {active && cursorGuides ? <CursorGuideOverlay point={rulerPoint} /> : null}
        {active && selectedBlockIds.length === 1 && selectedBlock?.type === "image" ? (
          <ImageResizeOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
            snapFrame={snapFrame}
            onGuidesChange={setSmartGuides}
            smartGuides={smartGuidesEnabled}
            snapEnabled={snapEnabled}
          />
        ) : null}
        {active &&
        selectedBlock &&
        (selectedBlockIds.length > 1 || !["image", "table", "sheet"].includes(selectedBlock.type)) ? (
          <BlockTransformOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            selectedBlockIds={selectedBlockIds}
            selectedBlocks={page.blocks.filter((item) => selectedBlockIds.includes(item.id))}
            updateBlock={updateBlock}
            snapFrame={snapFrame}
            onGuidesChange={setSmartGuides}
            onEdit={() => {
              if (["text", "heading", "quote", "caption", "box"].includes(selectedBlock.type))
                setEditingBlockId(selectedBlock.id);
            }}
            snapGrid={snapGrid}
            smartGuides={smartGuidesEnabled}
            snapEnabled={snapEnabled}
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
      <CanvasContextMenu
        state={contextMenu}
        selectedPage={page}
        selectedBlock={selectedBlock}
        selectedBlockIds={selectedBlockIds}
        onClose={() => setContextMenu(null)}
        onEdit={() => {
          if (selectedBlock && ["text", "heading", "quote", "caption", "box"].includes(selectedBlock.type))
            setEditingBlockId(selectedBlock.id);
        }}
        onDuplicate={() => {
          if (selectedBlock) duplicateBlock(page.id, selectedBlock.id);
        }}
        onCopy={copySelectedBlocks}
        onPaste={() => pasteBlocks(page.id, lastPastePointRef.current ?? undefined)}
        hasBlockClipboard={hasBlockClipboard}
        onGroup={() => groupBlocks(page.id, selectedBlockIds)}
        onUngroup={() => ungroupBlocks(page.id, selectedBlockIds)}
        onLock={() => toggleBlocksLocked(page.id, selectedBlockIds)}
        onDelete={() => selectedBlockIds.forEach((blockId) => removeBlock(page.id, blockId))}
        onAlign={(alignment) => alignBlocks(page.id, selectedBlockIds, alignment)}
        onDistribute={(axis) => distributeBlocks(page.id, selectedBlockIds, axis)}
        onTidy={() => tidyBlocks(page.id, selectedBlockIds)}
        onMoveLayer={(direction) => {
          if (selectedBlock) moveBlock(page.id, selectedBlock.id, direction);
        }}
        onInsert={insertContextBlock}
        onToggleMargins={() => toggleOverlay("margins")}
      />
    </BookRenderContext.Provider>
  );
}
