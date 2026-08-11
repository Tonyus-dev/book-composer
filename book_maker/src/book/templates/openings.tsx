import { BlockList } from "../renderer/BlockRenderer";
import { BrandLockup } from "../components/BookComponents";
import {
  findImage,
  findPrimaryImage,
  firstOfType,
  withoutBlock,
  type TemplateProps,
} from "./types";
import { resolveAssetSrc } from "../../lib/assets/registry";

/** COVER — imagem full bleed + master do lockup. O wordmark nunca é recriado com fonte. */
export function CoverTemplate({ page, meta }: TemplateProps) {
  const art = findPrimaryImage(page.blocks);
  const lockup = firstOfType(page.blocks, "lockup");
  const showOverlay = (page.coverMode ?? "overlay") === "overlay";
  return (
    <>
      {art ? (
        <div className="k-bleed" data-block-id={art.id}>
          <img
            className="k-bleed--img"
            src={resolveAssetSrc(art.src)}
            alt={art.alt}
            style={{ objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%` }}
          />
        </div>
      ) : null}
      {showOverlay ? (
        <div className="k-cover">
          {lockup ? (
            <div data-block-id={lockup.id} className="k-cover__lockup-slot">
              <BrandLockup block={{ ...lockup, width: lockup.width ?? "108mm" }} />
            </div>
          ) : null}
          <div>
            <h1 className="k-cover__product">{page.title ?? meta.title}</h1>
            {page.subtitle ? <p className="k-cover__sub">{page.subtitle}</p> : null}
            <p className="k-cover__foot" style={{ marginTop: "10mm" }}>
              {meta.author}
            </p>
            <p className="k-cover__foot" style={{ marginTop: "2mm", opacity: 0.75 }}>
              {meta.imprint}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** PART_OPENING — grande transição: imagem forte, respiro, proposição curta. */
export function PartOpeningTemplate({ page }: TemplateProps) {
  const art = findImage(page.blocks);
  const claim = firstOfType(page.blocks, "text");
  return (
    <>
      {art ? (
        <div className="k-bleed" data-block-id={art.id}>
          <img
            className="k-bleed--img"
            src={resolveAssetSrc(art.src)}
            alt={art.alt}
            style={{ objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%` }}
          />
        </div>
      ) : null}
      <div className="k-part">
        <div className="k-part__rule" />
        {page.eyebrow ? <p className="k-part__label">{page.eyebrow}</p> : null}
        <h1 className="k-part__title">{page.title}</h1>
        {claim ? (
          <p className="k-part__claim" data-block-id={claim.id}>
            {claim.content}
          </p>
        ) : null}
      </div>
    </>
  );
}

/**
 * CHAPTER_OPENING — o capítulo começa NA MESMA PÁGINA.
 * variant "image-top": faixa horizontal 35–45% + número + título + lead + corpo.
 * variant "image-side": imagem lateral 30–40% + título e texto no restante.
 */
export function ChapterOpeningTemplate({ page }: TemplateProps) {
  const art =
    findImage(page.blocks, "top") ?? findImage(page.blocks, "left") ?? findImage(page.blocks);
  const rest = withoutBlock(page.blocks, art);
  const side = page.variant === "image-side";

  const heading = (
    <>
      {page.eyebrow ? <p className="k-chapter__number">{page.eyebrow}</p> : null}
      <h1 className="k-chapter__title">{page.title}</h1>
      <div className="k-chapter__rule" />
    </>
  );

  if (side) {
    return (
      <div className="k-chapter--side" style={{ ["--band-w" as string]: art?.width ?? "34%" }}>
        <div className="k-chapter__band" data-block-id={art?.id}>
          {art ? (
            <img
              src={resolveAssetSrc(art.src)}
              alt={art.alt}
              style={{ objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%` }}
            />
          ) : null}
        </div>
        <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
          {heading}
          <BlockList blocks={rest} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="k-chapter__band"
        data-block-id={art?.id}
        style={{ ["--band-h" as string]: art?.height ?? "40%" }}
      >
        {art ? (
          <img
            src={resolveAssetSrc(art.src)}
            alt={art.alt}
            style={{ objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%` }}
          />
        ) : null}
      </div>
      {heading}
      <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
        <BlockList blocks={rest} />
      </div>
    </div>
  );
}
