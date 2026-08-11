import type {
  Block,
  BookRecipe,
  FormBlock,
  FormFieldType,
  LayoutAreaContent,
  LayoutBlock,
  Page,
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

export function cloneRecipe(recipe: BookRecipe): BookRecipe {
  return {
    ...recipe,
    blocks: recipe.blocks.map((block, index) => cloneBlockForInsert(block, index)),
  };
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

export function recipeFromPage(page: Page, name: string, description: string): BookRecipe {
  const now = new Date().toISOString();
  return {
    id: `recipe-${Date.now().toString(36)}`,
    name,
    ...(description ? { description } : {}),
    template: page.template,
    blocks: page.blocks.map((block, index) => cloneBlockForInsert(block, index)),
    createdAt: now,
    updatedAt: now,
  };
}
