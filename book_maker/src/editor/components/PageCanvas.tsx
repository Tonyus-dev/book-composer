import { useEffect, useRef } from "react";
import type { Book, Page } from "../../book/types";
import { PageRenderer } from "../../book/renderer/PageRenderer";
import { BookRenderContext } from "../../book/renderer/context";
import { useEditor, type Overlays } from "../state/store";

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
  const { overlays, selectedBlockId, selectBlock, selectPage, reportOverflow, overflowPages } =
    useEditor();
  const ref = useRef<HTMLDivElement>(null);

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
        overflow={Boolean(overflowPages[page.id])}
      >
        <OverlayLayers overlays={overlays} />
      </PageRenderer>
    </BookRenderContext.Provider>
  );
}
