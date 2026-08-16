import { forwardRef, type CSSProperties } from "react";
import type { Book, Page } from "../types";
import { TEMPLATES } from "../templates";
import { PageFooterNote, PageHeader, PageNumber } from "../components/BookComponents";
import { useBookRender } from "./context";

export type PageControl =
  "header" | "footer" | "pageNumber" | "title" | "subtitle" | "eyebrow" | "templateMeta";

function pageControlForTarget(target: HTMLElement): PageControl | null {
  if (target.closest(".k-runhead")) return "header";
  if (target.closest(".k-footnote")) return "footer";
  if (target.closest(".k-folio")) return "pageNumber";
  if (target.closest(".k-cover__sub")) return "subtitle";
  if (target.closest(".k-cover__foot")) return "templateMeta";
  if (target.closest(".k-eyebrow, .k-part__label, .k-chapter__number")) return "eyebrow";
  if (
    target.closest(
      ".k-cover__product, .k-part__title, .k-chapter__title, .k-h1, .k-h2, .k-h3, .k-h4, .k-h5",
    )
  )
    return "title";
  return null;
}

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
  onDoubleClick?: (blockId: string | null) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onSelectPageControl?: (control: PageControl) => void;
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLElement>) => void;
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
  {
    book,
    page,
    index,
    className,
    style,
    children,
    onClick,
    onDoubleClick,
    onContextMenu,
    onPointerDown,
    onSelectPageControl,
    onDragOver,
    onDrop,
    overflow,
  },
  ref,
) {
  const { interactive, onSelectBlock } = useBookRender();
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
    page.materialization?.compositionFamily
      ? `k-page--composition-${page.materialization.compositionFamily.toLowerCase().replaceAll("_", "-")}`
      : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderPage = page.blocks.some((block) => block.hidden)
    ? { ...page, blocks: page.blocks.filter((block) => !block.hidden) }
    : page;
  const templateProps = { page: renderPage, meta: book.meta, folio, verso };
  const planAssignments = (book.productionPlan?.assignments ?? []).filter((assignment) =>
    assignment.pageIds.includes(page.id),
  );
  const pageStyle = {
    ...style,
    ...(page.settings.pageColor ? { background: page.settings.pageColor } : {}),
    ...(page.settings.pageColor ? { "--page-color": page.settings.pageColor } : {}),
  } as CSSProperties;
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    const block = (event.target as HTMLElement).closest<HTMLElement>("[data-block-id]");
    const blockId = block?.dataset["blockId"];
    if (interactive && blockId) {
      event.stopPropagation();
      onSelectBlock?.(blockId, {
        additive: event.shiftKey || event.metaKey || event.ctrlKey,
      });
      return;
    }
    const pageControl = pageControlForTarget(event.target as HTMLElement);
    if (interactive && pageControl) {
      event.stopPropagation();
      onSelectPageControl?.(pageControl);
      return;
    }
    onClick?.();
  };
  const handleDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    const block = (event.target as HTMLElement).closest<HTMLElement>("[data-block-id]");
    onDoubleClick?.(block?.dataset["blockId"] ?? null);
  };

  return (
    <section
      ref={ref}
      className={classes}
      style={pageStyle}
      data-page-id={page.id}
      data-template={page.template}
      data-folio={folio}
      data-fixed={page.fixed ? "true" : undefined}
      data-overflow={overflow ? "true" : undefined}
      data-production-profile={book.productionPlan?.profile}
      data-production-plan-status={planAssignments.length > 0 ? "planned" : "unplanned"}
      data-production-plan-assets={
        planAssignments.map((assignment) => assignment.src).join(" ") || undefined
      }
      onClick={interactive ? handleClick : onClick}
      onDoubleClick={interactive ? handleDoubleClick : undefined}
      onContextMenu={interactive ? onContextMenu : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onDragOver={interactive ? onDragOver : undefined}
      onDrop={interactive ? onDrop : undefined}
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
