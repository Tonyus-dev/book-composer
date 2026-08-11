/**
 * Componentes editoriais do LIVRO.
 * Não importam nada da UI do editor (Tailwind/shadcn) — apenas CSS editorial.
 */
import type { CSSProperties, ReactNode } from "react";
import type {
  BoxBlock,
  CaptionBlock,
  DividerBlock,
  FormBlock,
  HeadingBlock,
  ImageBlock,
  LockupBlock,
  QuoteBlock,
  TableBlock,
  TextBlock,
  TocBlock,
} from "../types";
import { Markdown } from "../renderer/markdown";
import { resolveAssetSrc } from "../../lib/assets/registry";
import { normalizeTableBlock, tableHeaderRows } from "../tableModel";

const BOX_TITLES: Record<BoxBlock["kind"], string> = {
  regra: "Regra",
  exemplo: "Exemplo",
  ambientacao: "Ambientação",
  mestre: "Mestre",
  atencao: "Atenção",
};

export function BookHeading({ block }: { block: HeadingBlock }) {
  const Tag = `h${block.level + 1}` as unknown as "h2";
  return (
    <>
      {block.eyebrow ? <p className="k-eyebrow">{block.eyebrow}</p> : null}
      <Tag className={`k-h${block.level}`}>{block.text}</Tag>
    </>
  );
}

export function BodyText({ block }: { block: TextBlock }) {
  const classes = [
    "k-body",
    block.role && block.role !== "body" ? `k-body--${block.role}` : "",
    block.dropCap ? "k-body--dropcap" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      style={{
        maxWidth: block.width,
        textAlign: block.align === "justify" ? "justify" : block.align,
      }}
    >
      <Markdown source={block.content} />
    </div>
  );
}

export function BookImage({ block }: { block: ImageBlock }) {
  const position = block.position ?? "flow";
  return (
    <figure
      className={`k-figure k-figure--${position}`}
      style={
        {
          "--fig-w": block.width,
          "--fig-h": block.height,
          "--fig-fit": block.fit ?? "cover",
          "--fig-pos": `${block.objectX ?? 50}% ${block.objectY ?? 50}%`,
          "--fig-offset-x": `${block.offsetX ?? 0}%`,
          "--fig-offset-y": `${block.offsetY ?? 0}%`,
        } as React.CSSProperties
      }
    >
      {block.src ? (
        <img src={resolveAssetSrc(block.src)} alt={block.alt} />
      ) : (
        <div className="k-image-placeholder" aria-label={block.alt || "Imagem"}>
          {block.alt || "Imagem"}
        </div>
      )}
      {block.caption ? <figcaption className="k-caption">{block.caption}</figcaption> : null}
    </figure>
  );
}

export function PullQuote({ block }: { block: QuoteBlock }) {
  return (
    <blockquote
      className={`k-quote k-quote--${block.size ?? "md"} k-quote--${block.variant ?? "plain"}`}
      style={{ textAlign: block.align === "justify" ? "left" : block.align }}
    >
      <p className="k-quote__text">{block.text}</p>
      {block.attribution ? <p className="k-quote__attr">{block.attribution}</p> : null}
    </blockquote>
  );
}

export function BookTable({ block }: { block: TableBlock }) {
  const table = normalizeTableBlock(block);
  const style = table.style ?? {};
  const headerRows = table.continuationHeader ?? tableHeaderRows(table);
  const bodyRows = table.rows.filter((row) => row.kind !== "header" && row.kind !== "footer");
  const footerRows = table.rows.filter((row) => row.kind === "footer");
  const tableStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    color: style.textColor,
    ["--table-padding-x" as string]: style.cellPaddingX,
    ["--table-padding-y" as string]: style.cellPaddingY,
    ["--table-border-width" as string]: style.borderWidth,
    ["--table-border-color" as string]: style.borderColor,
    ["--table-header-bg" as string]: style.headerBackground,
    ["--table-header-color" as string]: style.headerColor,
    ["--table-body-bg" as string]: style.bodyBackground,
    ["--table-zebra-bg" as string]: style.zebraBackground,
  } as CSSProperties;
  const row = (
    current: (typeof table.rows)[number],
    section: "head" | "body" | "foot",
    index: number,
  ) => (
    <tr
      key={current.id}
      data-table-row-id={current.id}
      className={current.kind ? `k-table__row--${current.kind}` : undefined}
      style={{
        minHeight: current.minHeight ? `${current.minHeight}mm` : undefined,
        background: current.style?.background,
      }}
    >
      {current.cells.map((cell, cellIndex) => {
        const isHeader = section === "head";
        const Cell = isHeader ? "th" : "td";
        const cellStyle = {
          textAlign: cell.align ?? table.columns[cellIndex]?.align ?? "left",
          verticalAlign: cell.verticalAlign ?? "top",
          fontWeight:
            cell.emphasis === "strong"
              ? 700
              : isHeader
                ? (style.headerWeight ?? 700)
                : style.firstColumnStrong && cellIndex === 0
                  ? 600
                  : cell.style?.fontWeight,
          background: cell.style?.background,
          color: cell.style?.color,
          fontSize: cell.style?.fontSize,
          fontStyle: cell.style?.fontStyle,
        } as CSSProperties;
        return (
          <Cell
            key={cell.id}
            data-table-cell-id={cell.id}
            scope={isHeader ? (cellIndex === 0 ? "col" : "col") : undefined}
            colSpan={cell.colSpan}
            rowSpan={cell.rowSpan}
            style={cellStyle}
          >
            {cell.content}
          </Cell>
        );
      })}
    </tr>
  );
  return (
    <div
      className="k-table-wrap"
      data-table-id={table.id}
      data-allow-page-break={table.allowPageBreak ? "true" : "false"}
      data-continuation-of={table.continuationOf}
    >
      <table
        className={`k-table${table.compact ? " k-table--compact" : ""}`}
        style={tableStyle}
        data-table-border={style.borderMode ?? "horizontal"}
        data-table-zebra={style.zebra ? "true" : "false"}
      >
        {table.caption ? <caption>{table.caption}</caption> : null}
        <colgroup>
          {table.columns.map((column) => (
            <col
              key={column.id}
              data-table-column-id={column.id}
              style={{ width: `${(column.width ?? 1 / table.columns.length) * 100}%` }}
            />
          ))}
        </colgroup>
        {headerRows.length > 0 ? (
          <thead>{headerRows.map((current, index) => row(current, "head", index))}</thead>
        ) : null}
        {bodyRows.length > 0 ? (
          <tbody>{bodyRows.map((current, index) => row(current, "body", index))}</tbody>
        ) : null}
        {footerRows.length > 0 ? (
          <tfoot>{footerRows.map((current, index) => row(current, "foot", index))}</tfoot>
        ) : null}
      </table>
    </div>
  );
}

export function BookBox({ block }: { block: BoxBlock }) {
  return (
    <aside className={`k-box k-box--${block.kind}`}>
      <p className="k-box__title">{block.title || BOX_TITLES[block.kind]}</p>
      <div className="k-box__body">
        <Markdown source={block.content} />
      </div>
    </aside>
  );
}

export function Caption({ block }: { block: CaptionBlock }) {
  return <p className="k-caption">{block.text}</p>;
}

export function SectionDivider({ block }: { block: DividerBlock }) {
  return (
    <div className="k-divider" aria-hidden="true">
      {block.ornament ? <span className="k-divider__mark" /> : <span className="k-divider__line" />}
    </div>
  );
}

export function BookForm({ block }: { block: FormBlock }) {
  return (
    <section className="k-form" aria-label={block.title}>
      <h2 className="k-form__title">{block.title}</h2>
      {block.intro ? <p className="k-form__intro">{block.intro}</p> : null}
      <div className={`k-form__fields k-form__fields--${block.columns ?? 1}`}>
        {block.fields.map((field) => (
          <div key={field.id} className={`k-form__field k-form__field--${field.type}`}>
            <div className="k-form__label">
              {field.label}
              {field.required ? <span aria-hidden="true"> *</span> : null}
            </div>
            {field.hint ? <div className="k-form__hint">{field.hint}</div> : null}
            {field.type === "checkbox" ? (
              <div className="k-form__checkbox" aria-hidden="true">
                □
              </div>
            ) : field.type === "multiline" ? (
              <div
                className="k-form__lines"
                style={{ "--form-lines": field.lines ?? 3 } as CSSProperties}
              />
            ) : field.type === "line" ? (
              <div className="k-form__line" />
            ) : (
              <div className="k-form__line" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function BookToc({ block }: { block: TocBlock }) {
  return (
    <nav className="k-toc" style={{ ["--toc-cols" as string]: String(block.columns) }}>
      {block.entries.map((entry, i) => (
        <div key={i} className={`k-toc__item k-toc__item--${entry.level}`}>
          <span>{entry.label}</span>
          <span className="k-toc__folio">{entry.page}</span>
        </div>
      ))}
    </nav>
  );
}

export function BrandLockup({ block }: { block: LockupBlock }) {
  return (
    <img
      className="k-lockup"
      src={resolveAssetSrc(block.src)}
      alt={block.alt}
      style={{ ["--lockup-w" as string]: block.width ?? "60mm" }}
    />
  );
}

export function PageHeader({
  verso,
  left,
  right,
}: {
  verso: boolean;
  left?: string;
  right?: string;
}) {
  return (
    <div className={`k-runhead k-runhead--${verso ? "verso" : "recto"}`}>
      {verso ? (left ?? "") : (right ?? "")}
    </div>
  );
}

export function PageNumber({ verso, folio }: { verso: boolean; folio: number }) {
  return <div className={`k-folio k-folio--${verso ? "verso" : "recto"}`}>{folio}</div>;
}

export function PageFooterNote({ verso, text }: { verso: boolean; text: string }) {
  return <div className={`k-footnote k-footnote--${verso ? "verso" : "recto"}`}>{text}</div>;
}

export function BleedLayer({ children }: { children: ReactNode }) {
  return <div className="k-bleed">{children}</div>;
}
