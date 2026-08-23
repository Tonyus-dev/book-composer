import { BlockList } from "../renderer/BlockRenderer";
import { PullQuote } from "../components/BookComponents";
import { firstOfType, type TemplateProps } from "./types";

/** FRONT_MATTER — ficha técnica, créditos, notas. Uma coluna, muito limpo. */
export function FrontMatterTemplate({ page }: TemplateProps) {
  const dedication = page.variant === "dedication";
  const titlePage = page.variant === "title-page";
  const hasOwnHeading = page.blocks.some(
    (block) => block.type === "heading" && block.text === page.title,
  );
  const blocks = titlePage
    ? page.blocks.filter((block) => !(block.type === "heading" && block.text === "KALLISTIS"))
    : page.blocks;
  return (
    <div
      className={`k-flow${dedication ? " k-dedication" : ""}${titlePage ? " k-title-page" : ""}`}
    >
      {page.title && !hasOwnHeading && !dedication && !titlePage ? (
        <h1 className="k-h2" style={{ marginTop: 0 }}>
          {page.title}
        </h1>
      ) : null}
      <BlockList blocks={blocks} />
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

/** NARRATIVE — registro literário; duas colunas quando a página pedir. */
export function NarrativeTemplate({ page }: TemplateProps) {
  return (
    <div className={`k-flow${page.settings.columns === 2 ? " k-flow--2col" : ""}`}>
      <BlockList blocks={page.blocks} />
    </div>
  );
}

/** TIMELINE_MILESTONE — marcos como navegação histórica, sem quebrar o fluxo em cards. */
export function TimelineMilestoneTemplate({ page }: TemplateProps) {
  return (
    <div className="k-timeline-milestone k-flow">
      {page.title &&
      !page.blocks.some((block) => block.type === "heading" && block.text === page.title) ? (
        <h1 className="k-h2" style={{ marginTop: 0 }}>
          {page.title}
        </h1>
      ) : null}
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
      <div
        data-block-id={quote.id}
        style={{ display: "grid", height: "100%", alignContent: "center" }}
      >
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
