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
    default:
      return null;
  }
}

/** Envelope de bloco: span, espaçamento editorial e (só no editor) seleção. */
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

  if (!interactive) {
    return (
      <div className={className} style={style}>
        <BlockBody block={block} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={style}
      data-block-id={block.id}
      data-selected={selectedBlockId === block.id ? "true" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelectBlock?.(block.id);
      }}
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
