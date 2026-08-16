import { BlockList } from "../renderer/BlockRenderer";
import { BrandLockup, ResolvedImage } from "../components/BookComponents";
import {
  findImage,
  findPrimaryImage,
  firstOfType,
  withoutBlock,
  type TemplateProps,
} from "./types";

/** COVER — imagem full bleed + master do lockup. O wordmark nunca é recriado com fonte. */
export function CoverTemplate({ page, meta }: TemplateProps) {
  const art = findPrimaryImage(page.blocks);
  const lockup = firstOfType(page.blocks, "lockup");
  const showOverlay = (page.coverMode ?? "overlay") === "overlay";
  return (
    <>
      {art ? (
        <div className="k-bleed" data-block-id={art.id}>
          <ResolvedImage
            className="k-bleed--img"
            src={art.src}
            alt={art.alt}
            style={{
              objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
              transform: art.mirror ? "scaleX(-1)" : undefined,
            }}
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
  const titleBlock = firstOfType(page.blocks, "heading");
  const claim = firstOfType(page.blocks, "text");
  const title = titleBlock?.text ?? page.title;
  const titleContent =
    title === "PARTE I — O MUNDO PARTIDO" ? <>PARTE I — O&nbsp;MUNDO PARTIDO</> : title;
  return (
    <>
      {art ? (
        <div className="k-bleed" data-block-id={art.id}>
          <ResolvedImage
            className="k-bleed--img"
            src={art.src}
            alt={art.alt}
            style={{
              objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
              transform: art.mirror ? "scaleX(-1)" : undefined,
            }}
          />
        </div>
      ) : null}
      <div className="k-part">
        <div className="k-part__rule" />
        {page.eyebrow ? <p className="k-part__label">{page.eyebrow}</p> : null}
        <div className="k-part__copy">
          <div data-block-id={titleBlock?.id}>
            <h1 className="k-part__title">{titleContent}</h1>
          </div>
          {claim ? (
            <p className="k-part__claim" data-block-id={claim.id}>
              {claim.content}
            </p>
          ) : null}
        </div>
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
  const quadrant = page.variant === "quadrant-image";
  if (quadrant) {
    const images = page.blocks.filter((block) => block.type === "image");
    const art = images[0];
    const support = images.slice(1);
    const rest = page.blocks.filter((block) => block.type !== "image");
    const titleBlock = firstOfType(rest, "heading");
    const bodyBlocks = withoutBlock(rest, titleBlock);
    const heading = (
      <>
        {page.eyebrow ? <p className="k-chapter__number">{page.eyebrow}</p> : null}
        <div data-block-id={titleBlock?.id}>
          <h1 className="k-chapter__title">{titleBlock?.text ?? page.title}</h1>
        </div>
        <div className="k-chapter__rule" />
      </>
    );
    const introBlocks = bodyBlocks.slice(0, 2);
    const remainingBlocks = bodyBlocks.slice(introBlocks.length);
    return (
      <div className="k-chapter--quadrant">
        <div className="k-quadrant-visual">
          {art ? (
            <figure
              className={`k-quadrant-art k-quadrant-art--${art.quadrant ?? "top-left"}`}
              data-block-id={art.id}
            >
              <ResolvedImage
                src={art.src}
                alt={art.alt}
                style={{
                  objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
                  objectFit: art.fit ?? "cover",
                  transform: art.mirror ? "scaleX(-1)" : undefined,
                }}
              />
            </figure>
          ) : null}
          {support.length ? (
            <div className="k-quadrant-support-stack">
              {support.map((block, index) => (
                <figure
                  className={`k-quadrant-support${block.alt.toLowerCase().includes("símbolo") ? " k-quadrant-support--symbol" : ""}`}
                  data-block-id={block.id}
                  key={`${block.id}-${index}`}
                >
                  <ResolvedImage
                    src={block.src}
                    alt={block.alt}
                    style={{
                      objectPosition: `${block.objectX ?? 50}% ${block.objectY ?? 50}%`,
                      objectFit: block.fit ?? "contain",
                      transform: block.mirror ? "scaleX(-1)" : undefined,
                    }}
                  />
                  {block.caption ? (
                    <figcaption className="k-caption">{block.caption}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : null}
        </div>
        <div className="k-quadrant-copy">
          {heading}
          <BlockList blocks={introBlocks} />
        </div>
        {remainingBlocks.length ? (
          <div className="k-quadrant-rest">
            <BlockList blocks={remainingBlocks} />
          </div>
        ) : null}
      </div>
    );
  }
  const art =
    findImage(page.blocks, "top") ?? findImage(page.blocks, "left") ?? findImage(page.blocks);
  const rest = withoutBlock(page.blocks, art);
  const side = page.variant === "image-side";
  const titleBlock = firstOfType(rest, "heading");
  const bodyBlocks = withoutBlock(rest, titleBlock);

  const heading = (
    <>
      {page.eyebrow ? <p className="k-chapter__number">{page.eyebrow}</p> : null}
      <div data-block-id={titleBlock?.id}>
        <h1 className="k-chapter__title">{titleBlock?.text ?? page.title}</h1>
      </div>
      <div className="k-chapter__rule" />
    </>
  );

  if (side) {
    return (
      <div className="k-chapter--side" style={{ ["--band-w" as string]: art?.width ?? "34%" }}>
        <div className="k-chapter__band" data-block-id={art?.id}>
          {art ? (
            <ResolvedImage
              src={art.src}
              alt={art.alt}
              style={{
                objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
                objectFit: art.fit ?? "cover",
                transform: art.mirror ? "scaleX(-1)" : undefined,
              }}
            />
          ) : null}
        </div>
        <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
          {heading}
          <BlockList blocks={bodyBlocks} />
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
          <ResolvedImage
            src={art.src}
            alt={art.alt}
            style={{
              objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
              objectFit: art.fit ?? "cover",
              transform: art.mirror ? "scaleX(-1)" : undefined,
            }}
          />
        ) : null}
      </div>
      {heading}
      <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
        <BlockList blocks={bodyBlocks} />
      </div>
    </div>
  );
}
