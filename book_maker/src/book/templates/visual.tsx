import { BlockList } from "../renderer/BlockRenderer";
import { findImage, withoutBlock, type TemplateProps } from "./types";
import { resolveAssetSrc } from "../../lib/assets/registry";

/** FULL_ART — arte entre ~50% e 100% da página. Ritmo e imersão. */
export function FullArtTemplate({ page }: TemplateProps) {
  const art = findImage(page.blocks);
  const rest = withoutBlock(page.blocks, art);
  const fullBleed = page.settings.fullBleed || art?.fullBleed;

  if (!art) {
    return (
      <div className="k-flow">
        <BlockList blocks={rest} />
      </div>
    );
  }

  if (fullBleed) {
    return (
      <>
        <div className="k-bleed">
          <img
            className="k-bleed--img"
            src={resolveAssetSrc(art.src)}
            alt={art.alt}
            style={{ objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%` }}
          />
        </div>
        {art.caption ? <p className="k-art__caption">{art.caption}</p> : null}
      </>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100%", gap: "5mm" }}>
      <div style={{ height: art.height ?? "62%" }}>
        <img
          src={resolveAssetSrc(art.src)}
          alt={art.alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: art.fit ?? "cover",
            objectPosition: `${art.objectX ?? 50}% ${art.objectY ?? 50}%`,
            display: "block",
          }}
        />
        {art.caption ? <p className="k-caption">{art.caption}</p> : null}
      </div>
      <div className="k-flow">
        <BlockList blocks={rest} />
      </div>
    </div>
  );
}

/** MAP_PAGE — mapa, diagrama, esquema. Legibilidade antes de textura. */
export function MapPageTemplate({ page }: TemplateProps) {
  const map = findImage(page.blocks);
  const rest = withoutBlock(page.blocks, map);
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", height: "100%" }}>
      <div>
        {page.eyebrow ? <p className="k-eyebrow">{page.eyebrow}</p> : null}
        {page.title ? (
          <h1 className="k-h2" style={{ marginTop: 0, marginBottom: "3mm" }}>
            {page.title}
          </h1>
        ) : null}
      </div>
      {map ? (
        <figure style={{ margin: "0 0 4mm", height: map.height ?? "52%" }}>
          <img
            src={resolveAssetSrc(map.src)}
            alt={map.alt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: map.fit ?? "contain",
              objectPosition: `${map.objectX ?? 50}% ${map.objectY ?? 50}%`,
              display: "block",
            }}
          />
          {map.caption ? <figcaption className="k-caption">{map.caption}</figcaption> : null}
        </figure>
      ) : (
        <div />
      )}
      <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
        <BlockList blocks={rest} />
      </div>
    </div>
  );
}
