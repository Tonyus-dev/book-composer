import type { CSSProperties } from "react";
import type { Block, LayoutBlock } from "../types";
import {
  BodyText,
  BookBox,
  BookHeading,
  BookImage,
  BookShape,
  BookTable,
  BookToc,
  BrandLockup,
  Caption,
  BookForm,
  PullQuote,
  SectionDivider,
} from "../components/BookComponents";
import { useBookRender } from "./context";
import { normalizeTableBlock } from "../tableModel";
import { SheetRenderer } from "./SheetRenderer";

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
    case "sheet":
      return <SheetRenderer sheet={block.sheet} blockId={block.id} />;
    case "layout":
      return <LayoutBody block={block} />;
    case "shape":
      return <BookShape block={block} />;
    default:
      return null;
  }
}

function LayoutBody({ block }: { block: LayoutBlock }) {
  const { interactive } = useBookRender();
  return (
    <div
      className={`k-layout${interactive ? " k-layout--interactive" : ""}`}
      style={{
        gridTemplateColumns: block.widths.map((width) => `${width}fr`).join(" "),
        gridTemplateRows: block.heights.map((height) => `${height}fr`).join(" "),
      }}
      data-layout-columns={block.columns}
      data-layout-rows={block.rows}
    >
      {block.areas.map((area) => (
        <div
          key={area.id}
          className="k-layout__area"
          data-layout-area-id={area.id}
          data-layout-marker={area.marker}
          style={{
            gridColumn: `${area.column} / span ${area.colSpan ?? 1}`,
            gridRow: `${area.row} / span ${area.rowSpan ?? 1}`,
          }}
        >
          <BlockBody block={area.block} />
        </div>
      ))}
    </div>
  );
}

function recipeSlotIsEmpty(block: Block): boolean {
  switch (block.type) {
    case "heading":
      return !block.text.trim();
    case "text":
      return !block.content.trim();
    case "image":
      return !block.src;
    case "quote":
      return !block.text.trim();
    case "box":
      return !block.title.trim() && !block.content.trim();
    case "caption":
      return !block.text.trim();
    case "table":
      return (() => {
        const table = normalizeTableBlock(block);
        return (
          table.rows.length === 0 ||
          table.rows.every((row) => row.cells.every((cell) => !cell.content.trim()))
        );
      })();
    default:
      return false;
  }
}

/** Envelope de bloco: span, espaçamento editorial, identificação e (só no editor) seleção. */
export function BlockRenderer({ block }: { block: Block }) {
  const { interactive, selectedBlockId, onSelectBlock } = useBookRender();
  const style: CSSProperties = {
    marginTop: block.spaceBefore ? `${block.spaceBefore}mm` : undefined,
    marginBottom: block.spaceAfter ? `${block.spaceAfter}mm` : undefined,
  };
  if (block.frame) {
    style.position = "absolute";
    style.left = `${block.frame.x}mm`;
    style.top = `${block.frame.y}mm`;
    style.width = `${block.frame.width}mm`;
    style.height = `${block.frame.height}mm`;
    style.zIndex = 10;
  }
  if (block.fontFamily) style.fontFamily = `"${block.fontFamily.replace(/["\\]/g, "")}"`;
  if (block.rotation) style.transform = `rotate(${block.rotation}deg)`;
  const className = [
    "k-block",
    `k-block--${block.type}`,
    block.span === "full" ? "k-block--span-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const emptyRecipeSlot = Boolean(block.recipeSlotKey && recipeSlotIsEmpty(block));

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
      {emptyRecipeSlot && interactive ? (
        <div className="k-recipe-slot-placeholder" data-recipe-slot={block.recipeSlotKey}>
          <strong>{block.recipeSlotLabel ?? block.recipeSlotKey}</strong>
          <span>{block.type === "image" ? "Solte uma imagem" : "Clique para preencher"}</span>
        </div>
      ) : emptyRecipeSlot ? null : (
        <BlockBody block={block} />
      )}
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
