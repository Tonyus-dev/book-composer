import { forwardRef, type CSSProperties } from "react";
import type { Book, Page } from "../types";
import { TEMPLATES } from "../templates";
import { PageFooterNote, PageHeader, PageNumber } from "../components/BookComponents";

export interface PageRenderProps {
  book: Book;
  page: Page;
  /** índice da página no livro (0-based) */
  index: number;
  className?: string;
  style?: CSSProperties;
  /** children é usado pelo editor para overlays de produção */
  children?: React.ReactNode;
  onClick?: () => void;
  /** sinalização de overflow (editor); não afeta o livro impresso */
  overflow?: boolean;
}

export function folioFor(book: Book, index: number) {
  return index + book.meta.firstFolio;
}

export function isVerso(folio: number) {
  return folio % 2 === 0;
}

/**
 * Renderiza UMA página física. Não conhece zoom, seleção ou overlays:
 * é o mesmo componente usado no editor e na print view.
 */
export const PageRenderer = forwardRef<HTMLDivElement, PageRenderProps>(function PageRenderer(
  { book, page, index, className, style, children, onClick, overflow },
  ref,
) {
  const definition = TEMPLATES[page.template];
  const Template = definition.component;
  const folio = folioFor(book, index);
  const verso = isVerso(folio);

  const classes = [
    "k-page",
    `k-page--${page.template}`,
    verso ? "k-page--verso" : "k-page--recto",
    page.settings.background === "obsidian" ? "k-page--obsidian" : "",
    definition.register === "referencia" ? "k-page--rules" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const templateProps = { page, meta: book.meta, folio, verso };

  return (
    <section
      ref={ref}
      className={classes}
      style={style}
      data-page-id={page.id}
      data-folio={folio}
      data-overflow={overflow ? "true" : undefined}
      onClick={onClick}
      aria-label={`Página ${folio}${page.title ? ` — ${page.title}` : ""}`}
    >
      {page.settings.header ? (
        <PageHeader
          verso={verso}
          left={`KALLISTIS${page.part ? ` · ${page.part}` : ""}`}
          right={page.chapter ?? page.title ?? ""}
        />
      ) : null}

      {definition.usesContentBox ? (
        <div className="k-page__content">
          <Template {...templateProps} />
        </div>
      ) : (
        <Template {...templateProps} />
      )}

      {page.settings.pageNumber ? <PageNumber verso={verso} folio={folio} /> : null}
      {page.settings.footer ? <PageFooterNote verso={verso} text={book.meta.edition} /> : null}

      {children}
    </section>
  );
});
