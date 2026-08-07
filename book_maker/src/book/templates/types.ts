import type { BookMeta, Page, Block, ImageBlock, ImagePosition } from "../types";

export interface TemplateProps {
  page: Page;
  meta: BookMeta;
  folio: number;
  /** página par (verso): margem interna à direita, folio à esquerda */
  verso: boolean;
}

export function findImage(blocks: Block[], position?: ImagePosition): ImageBlock | undefined {
  return blocks.find(
    (b): b is ImageBlock =>
      b.type === "image" && (position === undefined || (b.position ?? "flow") === position),
  );
}

export function withoutBlock(blocks: Block[], block?: Block): Block[] {
  return block ? blocks.filter((b) => b.id !== block.id) : blocks;
}

export function firstOfType<T extends Block["type"]>(
  blocks: Block[],
  type: T,
): Extract<Block, { type: T }> | undefined {
  return blocks.find((b) => b.type === type) as Extract<Block, { type: T }> | undefined;
}
