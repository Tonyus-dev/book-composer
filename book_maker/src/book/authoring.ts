import type {
  Block,
  BookRecipe,
  FormBlock,
  FormFieldType,
  LayoutAreaContent,
  LayoutBlock,
  Page,
  RecipeBlockMode,
  RecipeBlockNode,
  RecipePageBlueprint,
  RecipeSlot,
  RecipeSlotConstraints,
  RecipeSlotKind,
  TemplateId,
} from "./types";
import { createTableBlock, parseTabularText } from "./tableModel";
import { normalizeTableBlock } from "./tableModel";
import { TEMPLATES } from "./templates";

function id(prefix: string, index: number) {
  return `${prefix}-${Date.now().toString(36)}-${index + 1}`;
}

function stableId(prefix: string, index: number) {
  return `ascii-${prefix}-${index + 1}`;
}

export function cloneBlockForInsert(block: Block, index = 0): Block {
  const nextId = id("b", index);
  if (block.type === "table") {
    const table = normalizeTableBlock(
      JSON.parse(JSON.stringify(block)) as Extract<Block, { type: "table" }>,
    );
    return {
      ...table,
      id: nextId,
      columns: table.columns.map((column, columnIndex) => ({
        ...column,
        id: `${nextId}-col-${columnIndex + 1}`,
      })),
      rows: table.rows.map((row, rowIndex) => ({
        ...row,
        id: `${nextId}-row-${rowIndex + 1}`,
        cells: row.cells.map((cell, cellIndex) => ({
          ...cell,
          id: `${nextId}-cell-${rowIndex + 1}-${cellIndex + 1}`,
        })),
      })),
    };
  }
  if (block.type === "form") {
    return {
      ...JSON.parse(JSON.stringify(block)),
      id: nextId,
      fields: block.fields.map((field, fieldIndex) => ({
        ...field,
        id: `${nextId}-field-${fieldIndex + 1}`,
      })),
    } as FormBlock;
  }
  if (block.type === "layout") {
    return {
      ...JSON.parse(JSON.stringify(block)),
      id: nextId,
      areas: block.areas.map((area, areaIndex) => ({
        ...area,
        id: `${nextId}-area-${areaIndex + 1}`,
        block: cloneBlockForInsert(area.block as Block, areaIndex) as LayoutAreaContent,
      })),
    } as LayoutBlock;
  }
  return { ...block, id: nextId } as Block;
}

export interface RecipeBlockClassification {
  blockId: string;
  mode: RecipeBlockMode;
  kind?: RecipeSlotKind;
  key?: string;
  label?: string;
  required?: boolean;
  constraints?: RecipeSlotConstraints;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function suggestedRecipeKind(block: Block): RecipeSlotKind | null {
  switch (block.type) {
    case "heading":
      return block.level === 1 ? "title" : "subtitle";
    case "text":
      return block.role === "lead" ? "lead" : "body";
    case "image":
      if (block.position === "full" || block.fullBleed) return "hero-image";
      return block.position === "left" || block.position === "right" ? "portrait" : "image";
    case "table":
      return "table";
    case "quote":
      return "quote";
    case "box":
      return "box";
    case "caption":
      return "caption";
    case "lockup":
      return "symbol";
    case "form":
    case "toc":
      return "body";
    case "divider":
    case "layout":
      return null;
  }
}

function defaultConstraints(kind: RecipeSlotKind): RecipeSlotConstraints | undefined {
  if (kind === "portrait") return { preferredOrientation: "portrait", fit: "contain" };
  if (kind === "hero-image" || kind === "map") {
    return { preferredOrientation: "landscape", fit: "contain" };
  }
  if (kind === "title") return { maxCharacters: 60 };
  return undefined;
}

function emptyTable(block: Extract<Block, { type: "table" }>): Extract<Block, { type: "table" }> {
  const normalized = normalizeTableBlock(cloneJson(block));
  const { caption: _caption, ...withoutCaption } = normalized;
  return {
    ...withoutCaption,
    rows: withoutCaption.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({ ...cell, content: "" })),
    })),
  };
}

/** Remove conteúdo específico, preservando proporções, estilo e geometria editorial. */
export function emptyBlockForRecipe(block: Block, label: string, kind?: RecipeSlotKind): Block {
  const next = cloneJson(block);
  switch (next.type) {
    case "heading": {
      const { eyebrow: _eyebrow, ...withoutEyebrow } = next;
      return { ...withoutEyebrow, text: "" };
    }
    case "text":
      return { ...next, content: "" };
    case "image": {
      const { caption: _caption, ...withoutCaption } = next;
      return { ...withoutCaption, src: "", alt: `${label} — solte uma imagem` };
    }
    case "quote": {
      const { attribution: _attribution, ...withoutAttribution } = next;
      return { ...withoutAttribution, text: "" };
    }
    case "table":
      return emptyTable(next);
    case "box":
      return { ...next, title: "", content: "" };
    case "caption":
      return { ...next, text: "" };
    case "toc":
      return { ...next, entries: [] };
    case "form": {
      const { intro: _intro, ...withoutIntro } = next;
      return {
        ...withoutIntro,
        title: "",
        fields: next.fields.map((field) => {
          const { hint: _hint, ...withoutHint } = field;
          return { ...withoutHint, label: "" };
        }),
      };
    }
    case "lockup":
      return { ...next, src: "", alt: label };
    case "divider":
      return next;
    case "layout":
      return {
        ...next,
        areas: next.areas.map((area) => ({
          ...area,
          block: emptyBlockForRecipe(
            area.block as Block,
            area.marker ?? "Área",
          ) as LayoutAreaContent,
        })),
      };
  }
  return next;
}

function defaultMode(block: Block): RecipeBlockMode {
  return block.type === "divider" || block.type === "lockup" ? "fixed" : "slot";
}

function uniqueSlotKey(kind: RecipeSlotKind, used: Set<string>, preferred?: string): string {
  const base = (preferred || kind).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "slot";
  let key = base;
  let index = 2;
  while (used.has(key)) key = `${base}-${index++}`;
  used.add(key);
  return key;
}

function labelForBlock(block: Block, kind?: RecipeSlotKind): string {
  if (kind === "title") return "Título";
  if (kind === "portrait") return "Retrato";
  if (kind === "table") return "Tabela";
  if (kind === "quote") return "Citação";
  if (kind === "lead") return "Texto introdutório";
  if (kind === "body") return "Texto principal";
  if (block.type === "divider") return "Divisor fixo";
  return kind ? kind.replaceAll("-", " ") : block.type;
}

function blueprintFromPage(
  page: Page,
  classifications: RecipeBlockClassification[] = [],
): RecipePageBlueprint {
  const byBlockId = new Map(classifications.map((item) => [item.blockId, item]));
  const usedKeys = new Set<string>();
  const slots: RecipeSlot[] = [];
  const structure: RecipeBlockNode[] = [];

  page.blocks.forEach((block) => {
    const classification = byBlockId.get(block.id);
    const mode = classification?.mode ?? defaultMode(block);
    if (mode === "ignore") return;
    const kind = classification?.kind ?? suggestedRecipeKind(block);
    if (mode === "fixed" || !kind) {
      structure.push({
        type: "block",
        recipeBlockId: `recipe-block-${block.id}`,
        blockType: block.type,
        mode: "fixed",
        fixedContent: cloneJson(block),
      });
      return;
    }
    const label = classification?.label?.trim() || labelForBlock(block, kind);
    const key = uniqueSlotKey(kind, usedKeys, classification?.key);
    const constraints = classification?.constraints ?? defaultConstraints(kind);
    const slot: RecipeSlot = {
      id: `recipe-slot-${key}`,
      key,
      kind,
      label,
      required:
        classification?.required ?? ["title", "lead", "body", "portrait", "table"].includes(kind),
      acceptedBlockTypes: [block.type],
      sourceBlockId: block.id,
      ...(constraints ? { constraints } : {}),
    };
    slots.push(slot);
    structure.push({
      type: "block",
      recipeBlockId: `recipe-block-${block.id}`,
      blockType: block.type,
      mode: "slot",
      slotKey: key,
      style: emptyBlockForRecipe(block, label, kind),
    });
  });
  return {
    template: page.template,
    ...(page.variant ? { variant: page.variant } : {}),
    pageSettings: cloneJson(page.settings),
    structure,
    slots,
  };
}

export function semanticRecipeFromPage(
  page: Page,
  name: string,
  description = "",
  classifications: RecipeBlockClassification[] = [],
): BookRecipe {
  const now = new Date().toISOString();
  const blueprint = blueprintFromPage(page, classifications);
  return {
    id: `recipe-${Date.now().toString(36)}`,
    name,
    ...(description ? { description } : {}),
    version: 1,
    scope: "page",
    ...(blueprint.template ? { template: blueprint.template } : {}),
    ...(blueprint.variant ? { variant: blueprint.variant } : {}),
    ...(blueprint.pageSettings ? { pageSettings: blueprint.pageSettings } : {}),
    structure: blueprint.structure,
    slots: blueprint.slots,
    preview: {
      blockCount: blueprint.structure.length,
      slotCount: blueprint.slots.length,
      fixedCount: blueprint.structure.filter((node) => node.mode === "fixed").length,
      pageCount: 1,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function semanticRecipeFromSpread(
  left: Page,
  right: Page,
  name: string,
  description = "",
  leftClassifications: RecipeBlockClassification[] = [],
  rightClassifications: RecipeBlockClassification[] = [],
): BookRecipe {
  const now = new Date().toISOString();
  const leftBlueprint = blueprintFromPage(left, leftClassifications);
  const rightBlueprint = blueprintFromPage(right, rightClassifications);
  return {
    id: `recipe-${Date.now().toString(36)}`,
    name,
    ...(description ? { description } : {}),
    version: 1,
    scope: "spread",
    structure: leftBlueprint.structure,
    slots: leftBlueprint.slots,
    spread: { left: leftBlueprint, right: rightBlueprint },
    preview: {
      blockCount: leftBlueprint.structure.length + rightBlueprint.structure.length,
      slotCount: leftBlueprint.slots.length + rightBlueprint.slots.length,
      fixedCount:
        leftBlueprint.structure.filter((node) => node.mode === "fixed").length +
        rightBlueprint.structure.filter((node) => node.mode === "fixed").length,
      pageCount: 2,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Migra snapshots antigos para uma recipe semântica sem reutilizar conteúdo ao instanciar. */
export function normalizeRecipe(input: unknown): BookRecipe {
  const raw = input as Partial<BookRecipe>;
  if (!raw || typeof raw !== "object" || typeof raw.name !== "string") {
    throw new Error("Recipe inválida: nome ausente.");
  }
  if (Array.isArray(raw.structure) && Array.isArray(raw.slots)) {
    const validBlockTypes = new Set([
      "text",
      "heading",
      "image",
      "quote",
      "table",
      "box",
      "caption",
      "divider",
      "toc",
      "lockup",
      "form",
      "layout",
    ]);
    const validModes = new Set(["slot", "fixed", "ignore"]);
    if (
      (raw.scope !== undefined && raw.scope !== "page" && raw.scope !== "spread") ||
      (raw.scope === "spread" && (!raw.spread || !raw.spread.left || !raw.spread.right)) ||
      !raw.structure.every(
        (node) =>
          node &&
          node.type === "block" &&
          typeof node.recipeBlockId === "string" &&
          validBlockTypes.has(node.blockType) &&
          validModes.has(node.mode),
      ) ||
      !raw.slots.every(
        (slot) =>
          slot &&
          typeof slot.id === "string" &&
          typeof slot.key === "string" &&
          typeof slot.kind === "string",
      ) ||
      new Set(raw.slots.map((slot) => slot.key)).size !== raw.slots.length
    ) {
      throw new Error("Recipe inválida: estrutura, modos ou slots inconsistentes.");
    }
    return {
      ...raw,
      version: raw.version ?? 1,
      scope: raw.scope ?? "page",
      structure: raw.structure,
      slots: raw.slots,
    } as BookRecipe;
  }
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  const migrated = semanticRecipeFromPage(
    {
      id: "legacy-recipe-source",
      template: raw.template ?? "narrative",
      settings: {
        header: true,
        footer: false,
        pageNumber: true,
        columns: 1,
        background: "paper",
        fullBleed: false,
      },
      blocks,
    },
    raw.name,
    raw.description ?? "",
  );
  return {
    ...migrated,
    id: raw.id ?? migrated.id,
    createdAt: raw.createdAt ?? migrated.createdAt,
    updatedAt: raw.updatedAt ?? migrated.updatedAt,
  };
}

export function materializeRecipeBlueprint(blueprint: RecipePageBlueprint): Block[] {
  return blueprint.structure.flatMap((node, index) => {
    if (node.mode === "ignore") return [];
    const source = node.mode === "fixed" ? node.fixedContent : node.style;
    if (!source) return [];
    const slot = blueprint.slots.find((item) => item.key === node.slotKey);
    const block =
      node.mode === "slot"
        ? emptyBlockForRecipe(source, slot?.label ?? "Slot", slot?.kind)
        : source;
    const materialized = cloneBlockForInsert(block, index);
    if (node.mode !== "slot" || !slot) return [materialized];
    return [
      {
        ...materialized,
        recipeSlotKey: slot.key,
        recipeSlotLabel: slot.label,
        ...(slot.required === undefined ? {} : { recipeSlotRequired: slot.required }),
      },
    ];
  });
}

export function materializeRecipe(recipe: BookRecipe): Block[] {
  const normalized = normalizeRecipe(recipe);
  return materializeRecipeBlueprint({
    structure: normalized.structure,
    slots: normalized.slots,
    ...(normalized.template ? { template: normalized.template } : {}),
    ...(normalized.variant ? { variant: normalized.variant } : {}),
    ...(normalized.pageSettings ? { pageSettings: normalized.pageSettings } : {}),
  });
}

export function cloneRecipe(recipe: BookRecipe): BookRecipe {
  const normalized = normalizeRecipe(recipe);
  return cloneJson(normalized);
}

export function recipeFromPage(page: Page, name: string, description: string): BookRecipe {
  return semanticRecipeFromPage(page, name, description);
}

function formFromLines(lines: string[], blockIndex: number, stable = false): FormBlock {
  const fields = lines
    .map((line, index) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawLabel, rawType] = line.split("::").map((value) => value.trim());
      const type = (
        ["text", "multiline", "number", "checkbox", "line"] as FormFieldType[]
      ).includes(rawType as FormFieldType)
        ? (rawType as FormFieldType)
        : "text";
      return {
        id: `${stable ? "ascii" : "form"}-form-${blockIndex + 1}-field-${index + 1}`,
        label: rawLabel ?? line,
        type,
      };
    });
  return {
    id: stable ? stableId("form", blockIndex) : id("form", blockIndex),
    type: "form",
    title: "Nova ficha",
    fields:
      fields.length > 0
        ? fields
        : [
            {
              id: `${stable ? "ascii" : "form"}-form-${blockIndex + 1}-field-1`,
              label: "Campo",
              type: "text",
            },
          ],
    span: "full",
  };
}

const HORIZONTAL = new Set(["─", "━", "═"]);
const JUNCTION = new Set([
  "┌",
  "┬",
  "┐",
  "├",
  "┼",
  "┤",
  "└",
  "┴",
  "┘",
  "╔",
  "╦",
  "╗",
  "╠",
  "╬",
  "╣",
  "╚",
  "╩",
  "╝",
]);
const DOWN = new Set(["┬", "┼", "╦", "╬"]);
const UP = new Set(["┴", "┼", "╩", "╬"]);

function contentToArea(
  content: string[],
  areaIndex: number,
): { block: LayoutAreaContent; marker?: string } {
  const text = content
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  const markerMatch = text.match(/^@([A-Z][A-Z0-9_-]*)$/i);
  if (markerMatch) {
    const marker = markerMatch[1]!.toUpperCase();
    if (marker === "PORTRAIT" || marker === "IMAGE") {
      return {
        marker,
        block: {
          id: stableId("image", areaIndex),
          type: "image",
          src: "",
          alt: marker,
          fit: "cover",
          position: "flow",
        },
      };
    }
    if (marker === "QUOTE") {
      return {
        marker,
        block: {
          id: stableId("quote", areaIndex),
          type: "quote",
          text: "",
          size: "md",
          variant: "rule",
        },
      };
    }
    if (marker === "TABLE") {
      return { marker, block: createTableBlock(stableId("table", areaIndex), 2, 2, true) };
    }
    if (marker === "FORM") {
      return { marker, block: formFromLines([], areaIndex, true) };
    }
    if (marker === "TEXT") {
      return {
        marker,
        block: { id: stableId("text", areaIndex), type: "text", content: "", role: "body" },
      };
    }
    return {
      marker,
      block: { id: stableId("text", areaIndex), type: "text", content: `@${marker}`, role: "body" },
    };
  }
  const heading = text.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    return {
      block: {
        id: stableId("heading", areaIndex),
        type: "heading",
        level: Math.min(3, heading[1]!.length) as 1 | 2 | 3,
        text: heading[2]!,
      },
    };
  }
  if (text.startsWith("> ")) {
    return {
      block: {
        id: stableId("quote", areaIndex),
        type: "quote",
        text: text.slice(2),
        size: "md",
        variant: "rule",
      },
    };
  }
  return { block: { id: stableId("text", areaIndex), type: "text", content: text, role: "body" } };
}

function parseBoxDrawing(source: string): LayoutBlock | null {
  const lines = source.replace(/\r/g, "").split("\n");
  const horizontalRows = lines
    .map((line, index) => ({
      index,
      count: [...line].filter((char) => HORIZONTAL.has(char)).length,
    }))
    .filter((entry) => entry.count >= 2)
    .map((entry) => entry.index);
  if (horizontalRows.length < 2) return null;
  const width = Math.max(...lines.map((line) => [...line].length));
  const grid = lines.map((line) => [...line.padEnd(width, " ")]);
  if (!JUNCTION.has(grid[horizontalRows[0]!]![0]!)) return null;
  const xPositions = [
    ...new Set(
      horizontalRows.flatMap((row) =>
        grid[row]!.flatMap((char, x) => (JUNCTION.has(char) ? [x] : [])),
      ),
    ),
  ].sort((a, b) => a - b);
  if (xPositions.length < 2) return null;
  const columns = xPositions.length - 1;
  const rows = horizontalRows.length - 1;
  const totalWidth = xPositions.at(-1)! - xPositions[0]!;
  const totalHeight = horizontalRows.at(-1)! - horizontalRows[0]!;
  const widths = xPositions
    .slice(0, -1)
    .map((x, index) => (xPositions[index + 1]! - x) / totalWidth);
  const heights = horizontalRows
    .slice(0, -1)
    .map((y, index) => (horizontalRows[index + 1]! - y) / totalHeight);
  const areas: LayoutBlock["areas"] = [];
  let areaIndex = 0;
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const top = horizontalRows[rowIndex]!;
    const bottom = horizontalRows[rowIndex + 1]!;
    const segments = [0];
    for (let columnIndex = 1; columnIndex < columns; columnIndex += 1) {
      const x = xPositions[columnIndex]!;
      if (DOWN.has(grid[top]![x]!) || UP.has(grid[bottom]![x]!)) segments.push(columnIndex);
    }
    segments.push(columns);
    for (let segmentIndex = 0; segmentIndex < segments.length - 1; segmentIndex += 1) {
      const startColumn = segments[segmentIndex]!;
      const endColumn = segments[segmentIndex + 1]!;
      const xStart = xPositions[startColumn]!;
      const xEnd = xPositions[endColumn]!;
      const content = grid
        .slice(top + 1, bottom)
        .map((line) => line.slice(xStart + 1, xEnd).join(""));
      if (!content.some((line) => line.trim())) continue;
      const parsed = contentToArea(content, areaIndex);
      areas.push({
        id: stableId("area", areaIndex),
        row: rowIndex + 1,
        column: startColumn + 1,
        ...(endColumn - startColumn > 1 ? { colSpan: endColumn - startColumn } : {}),
        ...(parsed.marker ? { marker: parsed.marker } : {}),
        block: parsed.block,
      });
      areaIndex += 1;
    }
  }
  if (areas.length === 0) return null;
  return {
    id: stableId("layout", 0),
    type: "layout",
    columns,
    rows,
    widths,
    heights,
    areas,
    asciiSource: source.trim(),
    span: "full",
  };
}

/**
 * Layout ASCII deliberadamente pequeno e legível:
 * @template narrative | rules_2col | profile | table_page
 * @title Título
 * # heading / > quote / texto em parágrafos / tabelas Markdown ou TSV.
 * Um bloco [form] ... [/form] aceita `Nome::text` e `Notas::multiline`.
 */
export function parseAsciiLayout(source: string): {
  template?: TemplateId;
  title?: string;
  blocks: Block[];
} {
  const boxed = parseBoxDrawing(source);
  if (boxed) return { blocks: [boxed] };
  const lines = source.replace(/\r/g, "").split("\n");
  let template: TemplateId | undefined;
  let title: string | undefined;
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let formLines: string[] | null = null;
  let blockIndex = 0;
  const flushParagraph = () => {
    const content = paragraph.join("\n").trim();
    if (content)
      blocks.push({ id: stableId("text", blockIndex++), type: "text", content, role: "body" });
    paragraph = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (formLines) {
      if (trimmed.toLowerCase() === "[/form]") {
        blocks.push(formFromLines(formLines, blockIndex++, true));
        formLines = null;
      } else formLines.push(line);
      continue;
    }
    if (trimmed.toLowerCase() === "[form]") {
      flushParagraph();
      formLines = [];
      continue;
    }
    const templateMatch = trimmed.match(/^@template\s+([a-z0-9_]+)$/i);
    if (templateMatch) {
      const candidate = templateMatch[1] as TemplateId;
      if (candidate in TEMPLATES) template = candidate;
      continue;
    }
    const titleMatch = trimmed.match(/^@title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    const tableLines: string[] = [];
    if (trimmed.startsWith("|") && index + 1 < lines.length) {
      let cursor = index;
      while ((lines[cursor] ?? "").trim().startsWith("|")) tableLines.push(lines[cursor++]!);
      if (tableLines.length >= 2) {
        flushParagraph();
        const matrix = parseTabularText(tableLines.join("\n"));
        const table = createTableBlock(
          stableId("table", blockIndex++),
          matrix[0]?.length || 1,
          matrix.length,
          true,
        );
        table.rows = table.rows.map((row, rowIndex) => ({
          ...row,
          cells: row.cells.map((cell, cellIndex) => ({
            ...cell,
            content: matrix[rowIndex]?.[cellIndex] ?? "",
          })),
        }));
        blocks.push(table);
        index = cursor - 1;
        continue;
      }
    }
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      flushParagraph();
      const level = Math.min(3, trimmed.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      blocks.push({
        id: stableId("heading", blockIndex++),
        type: "heading",
        level,
        text: trimmed.replace(/^#+\s*/, ""),
      });
    } else if (trimmed.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        id: stableId("quote", blockIndex++),
        type: "quote",
        text: trimmed.slice(2),
        size: "md",
        variant: "rule",
      });
    } else {
      paragraph.push(line);
    }
  }
  if (formLines) blocks.push(formFromLines(formLines, blockIndex++, true));
  flushParagraph();
  return { ...(template ? { template } : {}), ...(title ? { title } : {}), blocks };
}

export function serializeAsciiLayout(layout: LayoutBlock): string {
  return layout.asciiSource ?? `@layout columns=${layout.columns} rows=${layout.rows}`;
}

export function parseSmartPaste(source: string): {
  kind: "table" | "layout";
  blocks: Block[];
  template?: TemplateId;
  title?: string;
} {
  const trimmed = source.trim();
  const looksTabular =
    /\t/.test(trimmed) ||
    /^\s*\|.+\|\s*$/m.test(trimmed) ||
    (trimmed.split(/\r?\n/).length > 1 &&
      trimmed.split(/\r?\n/).every((line) => line.includes(",")));
  if (looksTabular) {
    const matrix = parseTabularText(trimmed);
    const table = createTableBlock(
      stableId("table", 0),
      Math.max(1, matrix[0]?.length ?? 1),
      Math.max(1, matrix.length),
      true,
    );
    table.rows = table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, cellIndex) => ({
        ...cell,
        content: matrix[rowIndex]?.[cellIndex] ?? "",
      })),
    }));
    return { kind: "table", blocks: [table] };
  }
  const layout = parseAsciiLayout(trimmed);
  return { kind: "layout", ...layout };
}

export function createFormBlock(
  idValue: string,
  title: string,
  fieldText: string,
  columns: 1 | 2,
): FormBlock {
  const fields = fieldText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const form = formFromLines(fields, 0);
  return {
    ...form,
    id: idValue,
    title: title.trim() || "Nova ficha",
    columns,
    fields: form.fields.map((field, index) => ({ ...field, id: `${idValue}-field-${index + 1}` })),
  };
}
