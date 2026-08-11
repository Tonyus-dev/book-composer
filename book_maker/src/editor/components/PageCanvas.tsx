import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Book, ImageBlock, Page } from "../../book/types";
import { PageRenderer } from "../../book/renderer/PageRenderer";
import { BookRenderContext } from "../../book/renderer/context";
import { useEditor, type Overlays } from "../state/store";
import { normalizeTableBlock } from "../../book/tableModel";
import { TableEditorOverlay } from "./TableEditorOverlay";
import { InlineTextEditorOverlay } from "./InlineTextEditorOverlay";

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

type ResizeBox = { left: number; top: number; width: number; height: number };

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

  if (!box) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = findBlockElement(pageElement, block.id);
    if (!target) return;
    event.currentTarget.setPointerCapture(event.pointerId);

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
    const keepRatio = event.shiftKey;
    const ratio = startHeight > 0 ? startWidth / startHeight : 1;

    const onPointerMove = (moveEvent: PointerEvent) => {
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
        return;
      }
      if (keepRatio) height = Math.min(maxHeight, width / ratio);
      updateBlock(pageId, block.id, {
        width: `${Math.round((width / CSS_PX_PER_MM) * 10) / 10}mm`,
        height: `${Math.round((height / CSS_PX_PER_MM) * 10) / 10}mm`,
      });
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      syncBox();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
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
    >
      <div
        className={`k-editor-image-crop-surface${cropMode ? " is-crop-mode" : ""}`}
        data-testid="image-drag-surface"
        data-resize="false"
        aria-label={cropMode ? "Mover imagem dentro do recorte" : "Mover imagem na página"}
        onPointerDown={handlePointerDown}
      />
      <button
        type="button"
        className="k-editor-resize-handle"
        data-testid="image-resize-handle"
        aria-label="Redimensionar imagem"
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => event.stopPropagation()}
      />
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
    reportOverflow,
    overflowPages,
    updateBlock,
    updateTable,
    removeBlock,
    duplicateBlock,
  } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !selectedBlockId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "Delete") {
        event.preventDefault();
        removeBlock(page.id, selectedBlockId);
        selectBlock(null);
        return;
      }
      if (event.key.toLowerCase() === "d" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        duplicateBlock(page.id, selectedBlockId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, duplicateBlock, page.id, removeBlock, selectBlock, selectedBlockId]);

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
      value={{ interactive: true, selectedBlockId, onSelectBlock: selectBlock }}
    >
      <PageRenderer
        ref={ref}
        book={book}
        page={page}
        index={index}
        className={`k-editor-page${active ? " k-editor-page--active" : ""}`}
        onClick={() => selectPage(page.id)}
        onDoubleClick={(blockId) => {
          if (!active || !blockId) return;
          const target = page.blocks.find((block) => block.id === blockId);
          if (target && ["text", "heading", "quote", "caption", "box"].includes(target.type)) {
            setEditingBlockId(blockId);
          }
        }}
        overflow={Boolean(overflowPages[page.id])}
      >
        <OverlayLayers overlays={overlays} />
        {active && selectedBlock?.type === "image" ? (
          <ImageResizeOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
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
        {active && editingBlockId && selectedBlock?.id === editingBlockId ? (
          <InlineTextEditorOverlay
            pageRef={ref}
            pageId={page.id}
            block={selectedBlock}
            updateBlock={updateBlock}
            onClose={() => setEditingBlockId(null)}
          />
        ) : null}
      </PageRenderer>
    </BookRenderContext.Provider>
  );
}
