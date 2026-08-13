import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookRoot } from "../../book/renderer/BookRoot";
import { folioFor, isVerso } from "../../book/renderer/PageRenderer";
import { useEditor } from "../state/store";
import { PageCanvas } from "./PageCanvas";
import { LightTable } from "./LightTable";

const MM_TO_PX = 96 / 25.4;

function mmValue(token: string) {
  const parsed = Number.parseFloat(token);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * PREVIEW central. Dois modos: PAGE (uma página) e SPREAD (verso + recto).
 * O zoom é apenas visual: não altera dimensões editoriais internas.
 */
export function PreviewArea() {
  const { book, view, zoom, setZoom, selectedPage, selectedPageIndex, selectPage } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const pageWidthPx = mmValue(book.tokens.pageWidth) * MM_TO_PX;
  const pageHeightPx = mmValue(book.tokens.pageHeight) * MM_TO_PX;

  /** Em SPREAD o par é sempre (verso, recto): página par à esquerda. */
  const spread = useMemo(() => {
    const folio = folioFor(book, selectedPageIndex);
    const leftIndex = isVerso(folio) ? selectedPageIndex : selectedPageIndex - 1;
    return {
      left: leftIndex >= 0 ? leftIndex : null,
      right: leftIndex + 1 < book.pages.length ? leftIndex + 1 : null,
    };
  }, [book, selectedPageIndex]);

  const columns = view === "spread" ? 2 : 1;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const compute = () => {
      const availableW = node.clientWidth - 96;
      const availableH = node.clientHeight - 96;
      const scale = Math.min(availableW / (pageWidthPx * columns), availableH / pageHeightPx);
      setFitScale(Math.max(0.15, Math.min(scale, 1.5)));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(node);
    return () => observer.disconnect();
  }, [columns, pageHeightPx, pageWidthPx]);

  const scale = zoom === "fit" ? fitScale : zoom;

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const current = zoom === "fit" ? fitScale : zoom;
    const next = Math.max(0.25, Math.min(2, current * Math.exp(-event.deltaY * 0.001)));
    const wrapper = event.currentTarget.querySelector<HTMLElement>("[data-editor-page-stage]");
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      setZoomOrigin({
        x: Math.max(
          0,
          Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100),
        ),
        y: Math.max(
          0,
          Math.min(100, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100),
        ),
      });
    }
    setZoom(Math.round(next * 100) / 100);
  };

  const goto = useCallback(
    (delta: number) => {
      const step = view === "spread" ? 2 : 1;
      const next = Math.min(book.pages.length - 1, Math.max(0, selectedPageIndex + delta * step));
      const page = book.pages[next];
      if (page) selectPage(page.id);
    },
    [book.pages, selectPage, selectedPageIndex, view],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") goto(1);
      if (event.key === "ArrowLeft") goto(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto]);

  const indices =
    view === "spread"
      ? [spread.left, spread.right].filter((i): i is number => i !== null)
      : [selectedPageIndex];

  /* LIGHT TABLE substitui o palco de composição por uma leitura global. */
  if (view === "light") return <LightTable />;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-muted/20"
      onWheel={handleWheel}
      data-testid="editor-canvas"
    >
      <div
        className="flex min-h-full w-full items-center justify-center p-12"
        onClick={() => undefined}
      >
        <BookRoot tokens={book.tokens} fonts={book.fonts}>
          <div
            data-editor-page-stage
            className="flex items-start gap-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
              width: pageWidthPx * columns,
              height: pageHeightPx,
            }}
          >
            {indices.map((index) => {
              const page = book.pages[index]!;
              return (
                <PageCanvas
                  key={page.id}
                  book={book}
                  page={page}
                  index={index}
                  active={page.id === selectedPage.id}
                />
              );
            })}
          </div>
        </BookRoot>
      </div>

      <div
        className="absolute inset-x-0 bottom-2 flex justify-center text-[10px] text-muted-foreground"
        aria-hidden="true"
      >
        {view === "spread" ? "Spread" : "Canvas"}
      </div>
    </div>
  );
}
