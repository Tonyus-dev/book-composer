import { BlockList } from "../renderer/BlockRenderer";
import { PullQuote } from "../components/BookComponents";
import { firstOfType, type TemplateProps } from "./types";

/** FRONT_MATTER — ficha técnica, créditos, notas. Uma coluna, muito limpo. */
export function FrontMatterTemplate({ page }: TemplateProps) {
  return (
    <div className="k-flow">
      {page.title ? (
        <h1 className="k-h2" style={{ marginTop: 0 }}>
          {page.title}
        </h1>
      ) : null}
      <BlockList blocks={page.blocks} />
    </div>
  );
}

/** TOC — sumário editorial com hierarquia real. */
export function TocTemplate({ page }: TemplateProps) {
  return (
    <div className="k-flow">
      <h1 className="k-h1" style={{ marginBottom: "6mm" }}>
        {page.title ?? "Sumário"}
      </h1>
      <BlockList blocks={page.blocks} />
    </div>
  );
}

/** NARRATIVE — registro literário. Uma coluna, EB Garamond, respiro. */
export function NarrativeTemplate({ page }: TemplateProps) {
  return (
    <div className="k-flow">
      <BlockList blocks={page.blocks} />
    </div>
  );
}

/** RULES_2COL — página funcional. Duas colunas, gutter de 8 mm. */
export function RulesTemplate({ page }: TemplateProps) {
  return (
    <div className={`k-flow${page.settings.columns === 1 ? "" : " k-flow--2col"}`}>
      <BlockList blocks={page.blocks} />
    </div>
  );
}

/**
 * QUOTE_LAYOUT — citação como elemento de ritmo.
 * variant "full-page": página fortemente visual. Caso contrário: bloco na página.
 */
export function QuoteLayoutTemplate({ page }: TemplateProps) {
  const quote = firstOfType(page.blocks, "quote");
  if (page.variant === "full-page" && quote) {
    return (
      <div style={{ display: "grid", height: "100%", alignContent: "center" }}>
        <PullQuote block={{ ...quote, size: quote.size ?? "lg" }} />
      </div>
    );
  }

  return (
    <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
      <BlockList blocks={page.blocks} />
    </div>
  );
}
