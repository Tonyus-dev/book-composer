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
  const { book, view, zoom, selectedPage, selectedPageIndex, selectPage } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);

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
    <div ref={containerRef} className="relative flex-1 overflow-auto bg-muted/20">
      <div
        className="flex min-h-full w-full items-center justify-center p-12"
        onClick={() => undefined}
      >
        <BookRoot tokens={book.tokens}>
          <div
            className="flex items-start gap-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
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

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-2 rounded-sm border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground">
          <button
            type="button"
            className="px-2 py-0.5 hover:text-foreground"
            onClick={() => goto(-1)}
            aria-label={view === "spread" ? "Spread anterior" : "Página anterior"}
          >
            ←
          </button>
          <span className="tabular-nums">
            {view === "spread"
              ? `${spread.left !== null ? folioFor(book, spread.left) : "—"} · ${
                  spread.right !== null ? folioFor(book, spread.right) : "—"
                }`
              : `fólio ${folioFor(book, selectedPageIndex)} de ${book.pages.length}`}
          </span>
          <button
            type="button"
            className="px-2 py-0.5 hover:text-foreground"
            onClick={() => goto(1)}
            aria-label={view === "spread" ? "Próximo spread" : "Próxima página"}
          >
            →
          </button>
          <span className="ml-2 opacity-60">{Math.round(scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
