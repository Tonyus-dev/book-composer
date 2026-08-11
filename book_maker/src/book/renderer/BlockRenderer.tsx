import type { CSSProperties } from "react";
import type { Block } from "../types";
import {
  BodyText,
  BookBox,
  BookHeading,
  BookImage,
  BookTable,
  BookToc,
  BrandLockup,
  Caption,
  BookForm,
  PullQuote,
  SectionDivider,
} from "../components/BookComponents";
import { useBookRender } from "./context";

export function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <BookHeading block={block} />;
    case "text":
      return <BodyText block={block} />;
    case "image":
      return <BookImage block={block} />;
    case "quote":
      return <PullQuote block={block} />;
    case "table":
      return <BookTable block={block} />;
    case "box":
      return <BookBox block={block} />;
    case "caption":
      return <Caption block={block} />;
    case "divider":
      return <SectionDivider block={block} />;
    case "toc":
      return <BookToc block={block} />;
    case "lockup":
      return <BrandLockup block={block} />;
    case "form":
      return <BookForm block={block} />;
    default:
      return null;
  }
}

/** Envelope de bloco: span, espaçamento editorial, identificação e (só no editor) seleção. */
export function BlockRenderer({ block }: { block: Block }) {
  const { interactive, selectedBlockId, onSelectBlock } = useBookRender();
  const style: CSSProperties = {
    marginTop: block.spaceBefore ? `${block.spaceBefore}mm` : undefined,
    marginBottom: block.spaceAfter ? `${block.spaceAfter}mm` : undefined,
  };
  const className = [
    "k-block",
    `k-block--${block.type}`,
    block.span === "full" ? "k-block--span-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * `data-block-id` identifica o bloco para medições geométricas fora do
   * editor (preflight, print view). Só deixa de sair do DOM quando o
   * renderer não roda — e isso é feature: blocos consumidos por templates
   * especiais (capa, full_art) têm layout próprio e são medidos pelos
   * contêineres .k-bleed / .k-cover. Seleção e clique continuam exclusivos
   * do editor.
   */
  return (
    <div
      className={className}
      style={style}
      data-block-id={block.id}
      data-selected={interactive && selectedBlockId === block.id ? "true" : undefined}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelectBlock?.(block.id);
            }
          : undefined
      }
    >
      <BlockBody block={block} />
    </div>
  );
}

export function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}
