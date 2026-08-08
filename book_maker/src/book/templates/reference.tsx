import { BlockList } from "../renderer/BlockRenderer";
import { findImage, withoutBlock, type TemplateProps } from "./types";
import type { ImageBlock } from "../types";
import { resolveAssetSrc } from "../../lib/assets/registry";

function Portrait({ block, auto }: { block: ImageBlock; auto?: boolean }) {
  return (
    <figure
      className={`k-profile__portrait${auto ? " k-profile__portrait--auto" : ""}`}
      data-block-id={block.id}
      style={{ margin: 0 }}
    >
      <img
        src={resolveAssetSrc(block.src)}
        alt={block.alt}
        style={{
          objectFit: block.fit ?? "cover",
          objectPosition: `${block.objectX ?? 50}% ${block.objectY ?? 50}%`,
        }}
      />
      {block.caption ? <figcaption className="k-caption">{block.caption}</figcaption> : null}
    </figure>
  );
}

/**
 * PROFILE — Povos, Ofícios, NPCs, criaturas, grupos.
 * Retrato + prosa + mecânica. O retrato participa da página; não é card de ficha web.
 */
export function ProfileTemplate({ page }: TemplateProps) {
  const variant = page.variant ?? "portrait-left";
  const portraits = page.blocks.filter((b): b is ImageBlock => b.type === "image");
  const primary = portraits[0];
  const secondary = portraits[1];

  const heading = (
    <>
      {page.eyebrow ? <p className="k-eyebrow">{page.eyebrow}</p> : null}
      {page.title ? (
        <h1 className="k-h1" style={{ marginBottom: "3mm" }}>
          {page.title}
        </h1>
      ) : null}
    </>
  );

  if (variant === "dual-portrait") {
    const rest = page.blocks.filter((b) => b.id !== primary?.id && b.id !== secondary?.id);
    return (
      <div className="k-profile k-profile--dual" style={{ display: "block" }}>
        {heading}
        <div className="k-profile__portraits" style={{ height: "34%" }}>
          {primary ? <Portrait block={primary} /> : null}
          {secondary ? <Portrait block={secondary} /> : null}
        </div>
        <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
          <BlockList blocks={rest} />
        </div>
      </div>
    );
  }

  if (variant === "portrait-bottom") {
    const rest = withoutBlock(page.blocks, primary);
    return (
      <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "100%" }}>
        <div>
          {heading}
          <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
            <BlockList blocks={rest} />
          </div>
        </div>
        {primary ? (
          <div style={{ height: primary.height ?? "42%" }}>
            <Portrait block={primary} />
          </div>
        ) : null}
      </div>
    );
  }

  const rest = withoutBlock(page.blocks, primary);
  const body = (
    <div className="k-profile__body">
      {heading}
      <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
        <BlockList blocks={rest} />
      </div>
    </div>
  );

  return (
    <div
      className={`k-profile k-profile--${variant}`}
      style={{ ["--portrait-w" as string]: primary?.width ?? "38%" }}
    >
      {variant === "portrait-left" ? (
        <>
          {primary ? <Portrait block={primary} /> : <div />}
          {body}
        </>
      ) : (
        <>
          {body}
          {primary ? <Portrait block={primary} /> : <div />}
        </>
      )}
    </div>
  );
}

/** TABLE_PAGE — referência de mesa. Tabela editorial, nunca planilha. */
export function TablePageTemplate({ page }: TemplateProps) {
  return (
    <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
      {page.title ? (
        <h1 className="k-h2" style={{ marginTop: 0, marginBottom: "4mm" }}>
          {page.title}
        </h1>
      ) : null}
      <BlockList blocks={page.blocks} />
    </div>
  );
}

export { findImage };
