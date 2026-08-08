/**
 * Componentes editoriais do LIVRO.
 * Não importam nada da UI do editor (Tailwind/shadcn) — apenas CSS editorial.
 */
import type { ReactNode } from "react";
import type {
  BoxBlock,
  CaptionBlock,
  DividerBlock,
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
        } as React.CSSProperties
      }
    >
      <img src={resolveAssetSrc(block.src)} alt={block.alt} />
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
  return (
    <div className="k-table-wrap">
      <table className={`k-table${block.compact ? " k-table--compact" : ""}`}>
        {block.caption ? <caption>{block.caption}</caption> : null}
        <thead>
          <tr>
            {block.columns.map((col, i) => (
              <th key={i} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
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
