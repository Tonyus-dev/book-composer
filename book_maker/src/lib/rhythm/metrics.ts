/**
 * RHYTHM METADATA — métricas editoriais por página.
 *
 * Tudo aqui é DIAGNÓSTICO: derivado apenas do JSON, determinístico
 * (o mesmo livro produz sempre os mesmos números) e jamais altera composição.
 */
import type { Block, Book, Page, TemplateId } from "../../book/types";
import { normalizeTableBlock } from "../../book/tableModel";

/** Classe de composição — é o que a faixa de ritmo codifica. */
export type RhythmClass =
  "front" | "opening" | "narrative" | "rules" | "profile" | "table" | "art" | "map";

export const RHYTHM_CLASS_LABELS: Record<RhythmClass, string> = {
  front: "Pré-textual",
  opening: "Abertura",
  narrative: "Narrativa",
  rules: "Regras",
  profile: "Perfil",
  table: "Tabela",
  art: "Arte",
  map: "Mapa",
};

/** Cor de análise (não decoração): um token por classe. */
export const RHYTHM_CLASS_COLORS: Record<RhythmClass, string> = {
  front: "var(--k-rhythm-front)",
  opening: "var(--k-rhythm-opening)",
  narrative: "var(--k-rhythm-narrative)",
  rules: "var(--k-rhythm-rules)",
  profile: "var(--k-rhythm-profile)",
  table: "var(--k-rhythm-table)",
  art: "var(--k-rhythm-art)",
  map: "var(--k-rhythm-map)",
};

const CLASS_BY_TEMPLATE: Record<TemplateId, RhythmClass> = {
  blank: "art",
  cover: "front",
  front_matter: "front",
  toc: "front",
  part_opening: "opening",
  chapter_opening: "opening",
  narrative: "narrative",
  rules_2col: "rules",
  profile: "profile",
  table_page: "table",
  quote_layout: "narrative",
  full_art: "art",
  map_page: "map",
};

export interface PageRhythm {
  pageId: string;
  index: number;
  folio: number;
  template: TemplateId;
  rhythmClass: RhythmClass;
  /** 0..1 — estimativa de ocupação de texto na caixa útil */
  textDensity: number;
  /** 0..100 — cobertura aproximada de imagem/arte */
  artCoverage: number;
  images: number;
  tables: number;
  boxes: number;
  quotes: number;
  /** template de arte cheia ou bloco full bleed / posição full */
  fullArt: boolean;
  /** 0..100 — espaço branco aproximado */
  blankSpace: number;
  /** somatório de caracteres de texto corrido, títulos, citações e boxes */
  chars: number;
  /** true quando a página é uma abertura intencional (parte/capítulo/capa) */
  intentionalOpening: boolean;
}

function blockChars(block: Block): number {
  switch (block.type) {
    case "text":
      return block.content.length;
    case "heading":
      return block.text.length + (block.eyebrow?.length ?? 0);
    case "quote":
      return block.text.length + (block.attribution?.length ?? 0);
    case "box":
      return block.title.length + block.content.length;
    case "table": {
      const table = normalizeTableBlock(block);
      return (
        table.columns.map((column) => column.label ?? "").join("").length +
        table.rows.reduce(
          (sum, row) => sum + row.cells.reduce((cells, cell) => cells + cell.content.length, 0),
          0,
        )
      );
    }
    case "caption":
      return block.text.length;
    case "toc":
      return block.entries.reduce((sum, entry) => sum + entry.label.length + 4, 0);
    default:
      return 0;
  }
}

function mm(token: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(token ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Capacidade de caracteres da caixa útil. Deriva dos tokens do livro
 * (área útil ÷ área média de um caractere no corpo de texto), então acompanha
 * mudanças de margem e de corpo sem números mágicos por página.
 */
function charCapacity(book: Book, page: Page): number {
  const width =
    mm(book.tokens.pageWidth, 210) -
    mm(book.tokens.marginInner, 22) -
    mm(book.tokens.marginOuter, 17);
  const height =
    mm(book.tokens.pageHeight, 280) -
    mm(book.tokens.marginTop, 18) -
    mm(book.tokens.marginBottom, 22);
  const bodyPt = mm(book.tokens.bodySize, 10.75);
  const leadingPt = mm(book.tokens.bodyLeading, 14.5);
  /* largura média de caractere ≈ 0.46 do corpo; 1pt = 0.3528mm */
  const charWidthMm = bodyPt * 0.46 * 0.3528;
  const lineHeightMm = leadingPt * 0.3528;
  const lines = Math.max(1, Math.floor(height / lineHeightMm));
  const perLine = Math.max(1, Math.floor(width / charWidthMm));
  const columns = page.settings.columns === 2 ? 2 : 1;
  /* colunas não aumentam a área, apenas o número de linhas curtas */
  return lines * perLine * (columns === 2 ? 1.04 : 1);
}

/** Cobertura de um bloco de imagem em % da página (aproximação declarada). */
function imageCoverage(block: Extract<Block, { type: "image" }>, page: Page): number {
  if (block.fullBleed || block.position === "full" || page.settings.fullBleed) return 100;
  const width = block.width?.trim();
  const percent = width?.endsWith("%") ? Number.parseFloat(width) : null;
  const share = percent !== null && Number.isFinite(percent) ? percent / 100 : 0.6;
  const vertical =
    block.position === "top" || block.position === "bottom"
      ? 0.34
      : block.position === "left" || block.position === "right"
        ? 0.42
        : 0.46;
  return Math.round(share * vertical * 100);
}

export function pageRhythm(book: Book, page: Page, index: number, folio: number): PageRhythm {
  const images = page.blocks.filter((b) => b.type === "image");
  const chars = page.blocks.reduce((sum, block) => sum + blockChars(block), 0);
  const capacity = charCapacity(book, page);
  const artCoverage = Math.min(
    100,
    images.reduce((sum, block) => sum + imageCoverage(block, page), 0) +
      (page.template === "full_art" || page.template === "map_page" ? 100 : 0) +
      (page.blocks.some((b) => b.type === "lockup") ? 18 : 0),
  );
  const textDensity = Math.min(1.6, chars / capacity);
  const textCoverage = Math.min(100, textDensity * 100);
  const fullArt =
    page.template === "full_art" ||
    page.settings.fullBleed ||
    images.some((b) => b.fullBleed || b.position === "full");

  return {
    pageId: page.id,
    index,
    folio,
    template: page.template,
    rhythmClass: CLASS_BY_TEMPLATE[page.template],
    textDensity,
    artCoverage,
    images: images.length,
    tables: page.blocks.filter((b) => b.type === "table").length,
    boxes: page.blocks.filter((b) => b.type === "box").length,
    quotes: page.blocks.filter((b) => b.type === "quote").length,
    fullArt,
    blankSpace: Math.max(0, Math.round(100 - Math.min(100, textCoverage + artCoverage))),
    chars,
    intentionalOpening:
      page.template === "part_opening" ||
      page.template === "chapter_opening" ||
      page.template === "cover" ||
      page.template === "full_art" ||
      page.template === "quote_layout",
  };
}

export function bookRhythm(book: Book, folioFor: (index: number) => number): PageRhythm[] {
  return book.pages.map((page, index) => pageRhythm(book, page, index, folioFor(index)));
}
