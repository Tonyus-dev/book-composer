import type { Book, Page } from "../../book/types";
import { BookRoot } from "../../book/renderer/BookRoot";
import { PageRenderer } from "../../book/renderer/PageRenderer";

const MM_TO_PX = 96 / 25.4;

/** Thumbnail leve: renderiza a própria página em escala reduzida (sem interação). */
export function PageThumbnail({
  book,
  page,
  index,
  width = 44,
}: {
  book: Book;
  page: Page;
  index: number;
  width?: number;
}) {
  const pageWidthPx = Number.parseFloat(book.tokens.pageWidth) * MM_TO_PX;
  const pageHeightPx = Number.parseFloat(book.tokens.pageHeight) * MM_TO_PX;
  const scale = width / pageWidthPx;

  return (
    <div
      className="shrink-0 overflow-hidden border border-border bg-card"
      style={{ width, height: pageHeightPx * scale }}
      aria-hidden="true"
    >
      <BookRoot tokens={book.tokens}>
        <div className="k-thumb" style={{ transform: `scale(${scale})` }}>
          <PageRenderer book={book} page={page} index={index} />
        </div>
      </BookRoot>
    </div>
  );
}
