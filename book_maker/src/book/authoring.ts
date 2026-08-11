import type { Block, BookRecipe, FormBlock, FormFieldType, Page, TemplateId } from "./types";
import { createTableBlock, parseTabularText } from "./tableModel";
import { normalizeTableBlock } from "./tableModel";
import { TEMPLATES } from "./templates";

function id(prefix: string, index: number) {
  return `${prefix}-${Date.now().toString(36)}-${index + 1}`;
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
  return { ...block, id: nextId } as Block;
}

export function cloneRecipe(recipe: BookRecipe): BookRecipe {
  return {
    ...recipe,
    blocks: recipe.blocks.map((block, index) => cloneBlockForInsert(block, index)),
  };
}

function formFromLines(lines: string[], blockIndex: number): FormBlock {
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
      return { id: `form-${blockIndex + 1}-field-${index + 1}`, label: rawLabel ?? line, type };
    });
  return {
    id: id("form", blockIndex),
    type: "form",
    title: "Nova ficha",
    fields:
      fields.length > 0
        ? fields
        : [{ id: `form-${blockIndex + 1}-field-1`, label: "Campo", type: "text" }],
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
  const lines = source.replace(/\r/g, "").split("\n");
  let template: TemplateId | undefined;
  let title: string | undefined;
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let formLines: string[] | null = null;
  let blockIndex = 0;
  const flushParagraph = () => {
    const content = paragraph.join("\n").trim();
    if (content) blocks.push({ id: id("text", blockIndex++), type: "text", content, role: "body" });
    paragraph = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (formLines) {
      if (trimmed.toLowerCase() === "[/form]") {
        blocks.push(formFromLines(formLines, blockIndex++));
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
          id("table", blockIndex++),
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
        id: id("heading", blockIndex++),
        type: "heading",
        level,
        text: trimmed.replace(/^#+\s*/, ""),
      });
    } else if (trimmed.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        id: id("quote", blockIndex++),
        type: "quote",
        text: trimmed.slice(2),
        size: "md",
        variant: "rule",
      });
    } else {
      paragraph.push(line);
    }
  }
  if (formLines) blocks.push(formFromLines(formLines, blockIndex++));
  flushParagraph();
  return { ...(template ? { template } : {}), ...(title ? { title } : {}), blocks };
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
      id("table", 0),
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
