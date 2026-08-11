import { BlockList } from "../renderer/BlockRenderer";
import { resolveAssetSrc } from "../../lib/assets/registry";
import type { TemplateProps } from "./types";

/** Prancheta livre: nenhum conteúdo implícito; frames usam a geometria física da página. */
export function BlankTemplate({ page }: TemplateProps) {
  const fullBleed = page.blocks.filter(
    (block) => block.type === "image" && block.fullBleed && block.src,
  );
  const regular = page.blocks.filter((block) => !fullBleed.includes(block));
  return (
    <>
      {fullBleed.map((block) =>
        block.type === "image" ? (
          <div key={block.id} className="k-bleed" data-block-id={block.id}>
            <img
              className="k-bleed--img"
              src={resolveAssetSrc(block.src)}
              alt={block.alt}
              style={{
                objectFit: block.fit ?? "cover",
                objectPosition: `${block.objectX ?? 50}% ${block.objectY ?? 50}%`,
              }}
            />
          </div>
        ) : null,
      )}
      <BlockList blocks={regular} />
    </>
  );
}
