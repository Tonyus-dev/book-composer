/**
 * Componentes editoriais do LIVRO.
 * Não importam nada da UI do editor (Tailwind/shadcn) — apenas CSS editorial.
 */
import type { ComponentProps, CSSProperties, ReactNode } from "react";
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
  ShapeBlock,
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

export function ResolvedImage({
  src,
  ...props
}: { src?: string } & Omit<ComponentProps<"img">, "src">) {
  const resolvedSrc = resolveAssetSrc(src);
  return resolvedSrc ? <img {...props} src={resolvedSrc} /> : null;
}

export function BookHeading({ block }: { block: HeadingBlock }) {
  const Tag = `h${block.level + 1}` as unknown as "h2";
  return (
    <>
      {block.eyebrow ? <p className="k-eyebrow">{block.eyebrow}</p> : null}
      <Tag className={`k-h${block.level}${block.compact ? " k-heading--compact" : ""}`}>
        {block.text}
      </Tag>
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
  const boxOpacity = Math.max(0, Math.min(100, block.boxOpacity ?? 0));
  const boxGrain = Math.max(0, Math.min(100, block.boxGrain ?? 0));
  const boxColor = block.boxColor ?? "#542869";
  return (
    <div
      className={`${classes}${boxOpacity > 0 || boxGrain > 0 ? " k-body--text-box" : ""}`}
      style={{
        maxWidth: block.width,
        textAlign: block.align === "justify" ? "justify" : block.align,
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        fontStyle: block.fontStyle,
        lineHeight: block.lineHeight,
        color: block.color,
        ...(boxOpacity > 0 || boxGrain > 0
          ? {
              backgroundColor: `color-mix(in srgb, ${boxColor} ${boxOpacity}%, transparent)`,
              backgroundImage:
                boxGrain > 0
                  ? `radial-gradient(circle at 20% 30%, rgb(0 0 0 / ${boxGrain * 0.0016}) 0 0.45px, transparent 0.8px), radial-gradient(circle at 70% 60%, rgb(255 255 255 / ${boxGrain * 0.0012}) 0 0.5px, transparent 0.9px)`
                  : undefined,
              backgroundSize: boxGrain > 0 ? "4px 4px, 5px 5px" : undefined,
              backgroundBlendMode: boxGrain > 0 ? "multiply" : undefined,
            }
          : {}),
      }}
    >
      <Markdown source={block.content} />
    </div>
  );
}

export function BookImage({ block }: { block: ImageBlock }) {
  const position = block.position ?? "flow";
  const src = resolveAssetSrc(block.src);
  const feather = Math.max(0, Math.min(48, block.feather ?? 0));
  const direction = block.featherDirection ?? "all";
  const cropWindow = block.cropWindow;
  const maskImage = feather
    ? direction === "all"
      ? `radial-gradient(ellipse at center, #000 ${Math.max(0, 50 - feather)}%, transparent 100%)`
      : `linear-gradient(to ${direction === "bottom" ? "bottom" : direction === "top" ? "bottom" : direction === "left" ? "right" : "left"}, ${direction === "top" || direction === "left" ? "transparent" : "#000"} 0%, #000 ${feather}%, #000 ${100 - feather}%, ${direction === "bottom" || direction === "right" ? "transparent" : "#000"} 100%)`
    : undefined;
  return (
    <figure
      className={`k-figure k-figure--${position}${block.centered ? " k-figure--centered" : ""}`}
      style={
        {
          "--fig-w": block.width,
          "--fig-h": block.height,
          "--fig-fit": block.fit ?? "cover",
          "--fig-pos": cropWindow
            ? `${cropWindow.x + cropWindow.width / 2}% ${cropWindow.y + cropWindow.height / 2}%`
            : `${block.objectX ?? 50}% ${block.objectY ?? 50}%`,
          "--fig-offset-x": `${block.offsetX ?? 0}%`,
          "--fig-offset-y": `${block.offsetY ?? 0}%`,
          ...(block.frameAspectRatio ? { aspectRatio: String(block.frameAspectRatio) } : {}),
          ...(block.mirror ? { transform: "scaleX(-1)" } : {}),
          ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
        } as React.CSSProperties
      }
    >
      {src ? (
        <img src={src} alt={block.alt} />
      ) : (
        <div className="k-image-placeholder" aria-label={block.alt || "Imagem"}>
          {block.alt || "Imagem"}
        </div>
      )}
      {block.caption ? <figcaption className="k-caption">{block.caption}</figcaption> : null}
    </figure>
  );
}

export function BookShape({ block }: { block: ShapeBlock }) {
  return (
    <div
      className={`k-shape k-shape--${block.shape}`}
      aria-label={block.label ?? block.shape}
      style={
        {
          "--shape-stroke": block.stroke,
          "--shape-fill": block.fill,
          "--shape-stroke-width": block.strokeWidth,
        } as CSSProperties
      }
    >
      {block.label ? <span>{block.label}</span> : null}
    </div>
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
            {renderTableCellContent(cell.content)}
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
              style={{ width: `${(column.width ?? 1 / table.columns.length) * 100}%`, minWidth: 0 }}
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
      {table.graphics?.map((graphic) => (
        <div
          key={graphic.id}
          className={`k-table-graphic k-table-graphic--${graphic.kind}`}
          style={{
            left: `${graphic.x}%`,
            top: `${graphic.y}%`,
            width: `${graphic.width}%`,
            height: `${graphic.height}%`,
            borderColor: graphic.stroke,
            borderWidth: graphic.strokeWidth,
            background: graphic.fill,
          }}
        >
          {graphic.kind === "label" ? graphic.text : null}
        </div>
      ))}
    </div>
  );
}

function renderTableCellContent(content: string): ReactNode {
  return <>{content}</>;
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
    <ResolvedImage
      className="k-lockup"
      src={block.src}
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
