import type { Block, Book, Page, TemplateId } from "../../book/types";
import { folioFor, isVerso } from "../../book/renderer/PageRenderer";
import { normalizeTableBlock, tableGrid } from "../../book/tableModel";
import { findAsset } from "../assets/catalog";
import {
  effectivePpiForSize,
  isAssetRef,
  lookupAsset,
  resolutionSeverity,
} from "../assets/registry";
import { findPrimaryImage } from "../../book/templates/types";
import { evaluateSheetFormulas } from "../../book/sheetFormula";
import {
  PREFLIGHT_RULES,
  type PreflightIssue,
  type PreflightRuleId,
  type PreflightSeverity,
} from "./types";

const MIN_PPI = 300;
const CRITICAL_PPI = 150;
const MIN_BLEED_MM = 3;
/** acima disso um box raramente cabe em uma coluna sem quebrar */
const BOX_SPLIT_CHARS = 1100;

/** Templates cujo miolo é numerado e leva running header. */
const BODY_TEMPLATES: TemplateId[] = [
  "narrative",
  "rules_2col",
  "profile",
  "table_page",
  "toc",
  "quote_layout",
];

const OPENING_TEMPLATES: TemplateId[] = ["part_opening", "chapter_opening"];

function mm(token: string | undefined): number {
  const parsed = Number.parseFloat(token ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function explicitMm(token: string | undefined): number | null {
  if (!token || !/^\s*\d+(?:\.\d+)?mm\s*$/i.test(token)) return null;
  const value = Number.parseFloat(token);
  return value > 0 ? value : null;
}

function imageSourcePixels(block: Extract<Block, { type: "image" }>) {
  const asset = lookupAsset(block.src);
  if (!asset) return null;
  const legacy = asset as typeof asset & {
    printInterpolated?: boolean;
    sourcePixelWidth?: number;
    sourcePixelHeight?: number;
  };
  if (legacy.printInterpolated && legacy.sourcePixelWidth && legacy.sourcePixelHeight) {
    return { width: legacy.sourcePixelWidth, height: legacy.sourcePixelHeight };
  }
  return { width: asset.pixelWidth, height: asset.pixelHeight };
}

export function effectiveImagePpi(
  book: Book,
  page: Page,
  block: Extract<Block, { type: "image" }>,
) {
  const pixels = imageSourcePixels(block);
  if (!pixels) return block.effectivePpi ?? findAsset(block.src)?.effectivePpi ?? null;

  if (page.template === "cover" && (block.fullBleed || block.position === "full")) {
    const bleed = mm(book.tokens.bleed);
    return effectivePpiForSize(
      pixels.width,
      pixels.height,
      mm(book.tokens.pageWidth) + bleed * 2,
      mm(book.tokens.pageHeight) + bleed * 2,
    );
  }

  const widthMm = block.frame?.width ?? explicitMm(block.width);
  const heightMm = block.frame?.height ?? explicitMm(block.height);
  if (widthMm && heightMm) {
    return effectivePpiForSize(pixels.width, pixels.height, widthMm, heightMm);
  }
  return block.effectivePpi ?? null;
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function blockLabel(block: Block, index: number): string {
  return `bloco ${index + 1} · ${block.type}`;
}

function textOf(block: Block): string {
  if (block.type === "text" || block.type === "box") return block.content;
  if (block.type === "quote") return block.text;
  if (block.type === "caption") return block.text;
  if (block.type === "heading") return block.text;
  return "";
}

function isRecipeSlotEmpty(block: Block): boolean {
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
    case "table": {
      const table = normalizeTableBlock(block);
      return (
        table.rows.length === 0 ||
        table.rows.every((row) => row.cells.every((cell) => !cell.content.trim()))
      );
    }
    default:
      return false;
  }
}

/**
 * Regras estáticas: dependem apenas do JSON do livro, então rodam no editor,
 * na rota de impressão e no exportador com resultado idêntico.
 */
export function staticIssues(book: Book): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const bleedMm = mm(book.tokens.bleed);

  const push = (
    rule: PreflightRuleId,
    severity: PreflightSeverity,
    description: string,
    context: { page?: Page; folio?: number; blockId?: string; element: string },
  ) => {
    issues.push({
      rule,
      severity,
      pageId: context.page?.id ?? null,
      folio: context.folio ?? null,
      blockId: context.blockId,
      element: context.element,
      description,
      inspection: PREFLIGHT_RULES[rule].inspection,
      source: "static",
    });
  };

  /* ---- documento ---------------------------------------------------- */
  if (book.meta.firstFolio < 1) {
    push("numbering-discontinuity", "error", `Primeiro fólio inválido (${book.meta.firstFolio}).`, {
      element: "documento · meta.firstFolio",
    });
  }
  if (book.pages.length % 4 !== 0) {
    push(
      "numbering-discontinuity",
      "info",
      `Total de ${book.pages.length} páginas não fecha caderno de 4.`,
      { element: "documento · contagem física" },
    );
  }

  const firstFolio = book.meta.firstFolio;
  const lastFolio = firstFolio + book.pages.length - 1;
  const folioTargets = new Map<number, Page>();
  book.pages.forEach((page, index) => folioTargets.set(folioFor(book, index), page));

  /* destinos válidos para referências internas: id, título, capítulo, parte */
  const anchors = new Set<string>();
  for (const page of book.pages) {
    anchors.add(page.id);
    anchors.add(slug(page.id));
    for (const label of [page.title, page.chapter, page.part]) {
      if (label) anchors.add(slug(label));
    }
  }

  /* ---- páginas ------------------------------------------------------ */
  book.pages.forEach((page, index) => {
    const folio = folioFor(book, index);
    const verso = isVerso(folio);
    const ctx = { page, folio };

    if (page.recipeInstance) {
      if (!page.recipeInstance.recipeId || !Number.isInteger(page.recipeInstance.recipeVersion)) {
        push(
          "recipe-instance-invalid",
          "error",
          "Metadados de proveniência do modelo estão incompletos.",
          {
            ...ctx,
            element: `página ${folio} · recipeInstance`,
          },
        );
      }
    }

    /* página em branco acidental */
    if (page.blocks.length === 0 && page.template !== "full_art" && page.template !== "map_page") {
      push("blank-page", "warning", "Página sem nenhum bloco de conteúdo.", {
        ...ctx,
        element: `página ${folio}`,
      });
    }

    /* numeração */
    if (BODY_TEMPLATES.includes(page.template) && !page.settings.pageNumber) {
      push("missing-page-number", "warning", "Página de miolo sem número de página.", {
        ...ctx,
        element: `página ${folio} · fólio`,
      });
    }

    /* paridade */
    if (OPENING_TEMPLATES.includes(page.template) && verso) {
      push("page-parity", "warning", `Abertura em verso (fólio ${folio}). Aberturas pedem recto.`, {
        ...ctx,
        element: `página ${folio} · paridade`,
      });
    }
    if (page.template === "cover" && index !== 0) {
      push("page-parity", "error", "Capa fora da primeira posição física do livro.", {
        ...ctx,
        element: `página ${folio} · paridade`,
      });
    }
    if (page.template === "cover" && page.coverMode === "art-only") {
      const art = findPrimaryImage(page.blocks);
      const resolvable = Boolean(art?.src && (!isAssetRef(art.src) || lookupAsset(art.src)));
      if (!resolvable) {
        push("missing-asset", "error", "Capa em modo art-only sem arte principal válida.", {
          ...ctx,
          ...(art ? { blockId: art.id } : {}),
          element: `página ${folio} · capa art-only`,
        });
      }
    }

    /* running header */
    if (page.settings.header) {
      if (!page.part && !page.chapter && !page.title) {
        push("running-header", "warning", "Header ligado sem parte, capítulo ou título.", {
          ...ctx,
          element: `página ${folio} · running header`,
        });
      }
      if (page.template === "cover" || OPENING_TEMPLATES.includes(page.template)) {
        push("running-header", "info", "Header ligado em página de abertura.", {
          ...ctx,
          element: `página ${folio} · running header`,
        });
      }
    }

    /* blocos */
    page.blocks.forEach((block, blockIndex) => {
      const element = blockLabel(block, blockIndex);
      const base = { ...ctx, blockId: block.id, element };

      if (block.recipeSlotKey && block.recipeSlotRequired && isRecipeSlotEmpty(block)) {
        push(
          "required-recipe-slot-empty",
          "warning",
          `Slot obrigatório “${block.recipeSlotLabel ?? block.recipeSlotKey}” ainda está vazio.`,
          base,
        );
      }

      if (block.type === "image" || block.type === "lockup") {
        if (!block.src) {
          if (!block.recipeSlotKey) {
            push("missing-asset", "error", "Bloco de imagem sem asset definido.", base);
          }
        } else if (isAssetRef(block.src)) {
          if (!lookupAsset(block.src)) {
            push(
              "broken-asset-reference",
              "error",
              `Referência ${block.src} não existe em book.assets.`,
              base,
            );
          }
        } else if (block.src.startsWith("/") && !findAsset(block.src)) {
          push("asset-outside-catalog", "info", `Caminho ${block.src} não está no catálogo.`, base);
        }

        if (!block.alt) {
          push("missing-alt-text", "warning", "Imagem sem alt text editorial.", base);
        }

        const ppi = block.type === "image" ? effectiveImagePpi(book, page, block) : null;
        const severity = ppi ? resolutionSeverity(ppi) : null;
        if (ppi && severity === "error") {
          push(
            "image-low-resolution",
            "error",
            `Imagem com ${ppi} ppi efetivos (mínimo aceitável ${CRITICAL_PPI}).`,
            base,
          );
        } else if (ppi && severity === "warning") {
          push(
            "image-low-resolution",
            "warning",
            `Imagem com ${ppi} ppi efetivos (recomendado ${MIN_PPI}).`,
            base,
          );
        }
      }

      if (block.type === "image" && (block.fullBleed || page.settings.fullBleed)) {
        if (bleedMm <= 0) {
          push(
            "full-bleed-insufficient-bleed",
            "error",
            "Imagem full bleed com sangria zero no documento.",
            base,
          );
        } else if (bleedMm < MIN_BLEED_MM) {
          push(
            "full-bleed-insufficient-bleed",
            "warning",
            `Sangria de ${bleedMm}mm abaixo dos ${MIN_BLEED_MM}mm de produção.`,
            base,
          );
        }
      }

      if (block.type === "caption") {
        const previous = page.blocks[blockIndex - 1];
        if (!previous || (previous.type !== "image" && previous.type !== "table")) {
          push("caption-detached", "warning", "Legenda não segue imagem ou tabela.", base);
        }
      }

      if (block.type === "table") {
        const table = normalizeTableBlock(block);
        const widthSum = table.columns.reduce((sum, column) => sum + (column.width ?? 0), 0);
        const narrow = table.columns.filter(
          (column) => (column.width ?? 0) < (column.minWidth ?? 0.08),
        ).length;
        if (table.columns.length === 0 || table.rows.length === 0) {
          push("table-empty", "error", "Tabela sem colunas ou linhas editáveis.", base);
        }
        if (!Number.isFinite(widthSum) || Math.abs(widthSum - 1) > 0.01) {
          push(
            "table-width-invalid",
            "error",
            `Larguras somam ${Math.round(widthSum * 100)}%, não 100%.`,
            base,
          );
        }
        if (narrow > 0) {
          push(
            "table-column-too-narrow",
            "warning",
            `${narrow} coluna(s) abaixo do mínimo editorial.`,
            base,
          );
        }
        if (table.style?.fontSize && Number.parseFloat(table.style.fontSize) < 7) {
          push(
            "table-too-small-text",
            "warning",
            `Corpo de tabela ${table.style.fontSize} abaixo do mínimo confortável.`,
            base,
          );
        }
        const grid = tableGrid(table);
        const invalidMerge = table.rows.some((row) =>
          row.cells.some((cell) => {
            const entry = grid.flat().find((item) => item.cell.id === cell.id);
            return Boolean(
              entry &&
              (entry.rowIndex + entry.rowSpan > table.rows.length ||
                entry.columnIndex + entry.colSpan > table.columns.length),
            );
          }),
        );
        if (invalidMerge)
          push(
            "table-merge-invalid",
            "error",
            "Tabela contém uma mesclagem que ultrapassa a grade.",
            base,
          );
        const wide = table.columns.length > 6;
        if (wide && page.settings.columns === 2 && block.span !== "full") {
          push(
            "table-overflow",
            "error",
            `Tabela de ${block.columns.length} colunas dentro de coluna estreita.`,
            base,
          );
        } else if (wide) {
          push(
            "table-overflow",
            "warning",
            `Tabela larga (${block.columns.length} colunas): confira a medida.`,
            base,
          );
        }
        const ragged = table.rows.filter((row) => row.cells.length === 0).length;
        if (ragged > 0) {
          push(
            "table-overflow",
            "error",
            `${ragged} linha(s) com número de células diferente do cabeçalho.`,
            base,
          );
        }
      }

      if (block.type === "box" && block.content.length > BOX_SPLIT_CHARS) {
        push(
          "box-split",
          "warning",
          `Box com ${block.content.length} caracteres: risco de quebra entre colunas.`,
          base,
        );
      }

      if (block.type === "sheet") {
        const formulaEvaluation = evaluateSheetFormulas(
          block.sheet.formulas ?? {},
          block.sheet.values,
        );
        for (const [key, error] of Object.entries(formulaEvaluation.errors)) {
          push("sheet-formula-invalid", "error", `Fórmula “${key}” inválida (${error}).`, base);
        }
        block.sheet.pages.forEach((sheetPage, sheetPageIndex) => {
          sheetPage.elements.forEach((sheetElement) => {
            const { x, y, width, height } = sheetElement.rect;
            if (
              x < 0 ||
              y < 0 ||
              width <= 0 ||
              height <= 0 ||
              x + width > sheetPage.widthMm ||
              y + height > sheetPage.heightMm
            ) {
              push(
                "sheet-element-outside-page",
                "error",
                `Elemento ${sheetElement.id} ultrapassa a página física ${sheetPageIndex + 1}.`,
                base,
              );
            }
            if (
              [
                "text-field",
                "number-field",
                "checkbox",
                "choice",
                "scale",
                "text-area",
                "calculated",
              ].includes(sheetElement.type) &&
              !sheetElement.key
            ) {
              push(
                "sheet-field-unbound",
                "warning",
                `Campo ${sheetElement.id} não possui chave de dados.`,
                base,
              );
            }
          });
        });
      }

      /* referências internas em markdown: [texto](#destino) */
      const content = textOf(block);
      for (const match of content.matchAll(/\[[^\]]*\]\(#([^)]+)\)/g)) {
        const target = match[1] ?? "";
        if (!anchors.has(target) && !anchors.has(slug(target))) {
          push(
            "broken-internal-reference",
            "error",
            `Referência interna "#${target}" sem destino no livro.`,
            base,
          );
        }
      }

      /* sumário */
      if (block.type === "toc") {
        if (block.entries.length === 0) {
          push("toc-destination", "warning", "Sumário sem entradas.", base);
        }
        for (const entry of block.entries) {
          if (!Number.isFinite(entry.page) || entry.page < firstFolio || entry.page > lastFolio) {
            // fólio 0 (ou null) é ausência intencional de destino: o sumário
            // continua renderizando "—" e não cria destinos fictícios. Apenas
            // destinos realmente fora do livro (acima do último fólio) viram
            // ERROR; ausências intencionais são apenas informativas.
            if (!Number.isFinite(entry.page) || entry.page <= 0) {
              push(
                "toc-destination",
                "info",
                `Entrada "${entry.label}" sem destino definido (placeholder).`,
                base,
              );
            } else {
              push(
                "toc-destination",
                "error",
                `Entrada "${entry.label}" aponta para fólio ${entry.page} (fora de ${firstFolio}–${lastFolio}).`,
                base,
              );
            }
            continue;
          }
          const target = folioTargets.get(entry.page);
          const labels = [target?.title, target?.chapter, target?.part].filter(Boolean) as string[];
          if (target && !labels.some((label) => slug(label) === slug(entry.label))) {
            push(
              "toc-destination",
              "warning",
              `Entrada "${entry.label}" não confere com o fólio ${entry.page} (${labels[0] ?? "sem título"}).`,
              base,
            );
          }
        }
      }
    });

    /* título órfão no fim da página */
    const last = page.blocks[page.blocks.length - 1];
    if (last && last.type === "heading") {
      push("heading-orphan", "warning", "A página termina em título, sem texto abaixo.", {
        ...ctx,
        blockId: last.id,
        element: blockLabel(last, page.blocks.length - 1),
      });
    }

    /* template visual sem arte é perda de conteúdo na produção */
    if (
      (page.template === "full_art" || page.template === "map_page") &&
      !page.blocks.some((block) => block.type === "image")
    ) {
      push("missing-asset", "error", "Template visual sem nenhuma imagem.", {
        ...ctx,
        element: `página ${folio} · template ${page.template}`,
      });
    }
  });

  return issues;
}
