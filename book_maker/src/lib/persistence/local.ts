import type { Block, Book, Page } from "../../book/types";
import { DEFAULT_TOKENS } from "../../book/types";
import { normalizeTableBlock } from "../../book/tableModel";
import { normalizeRecipe } from "../../book/authoring";
import { normalizeSheet } from "../../book/sheetModel";

const STORAGE_KEY = "kallistis.book-builder.project.v1";

export function loadLocalBook(): Book | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeBook(JSON.parse(raw));
  } catch (error) {
    console.warn("[kallistis] projeto local inválido, ignorando", error);
    return null;
  }
}

export function saveLocalBook(book: Book) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
}

export function clearLocalBook() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Tolerante a JSON de versões anteriores: completa tokens ausentes. */
export function normalizeBook(input: unknown): Book {
  const book = input as Book;
  if (!book || typeof book !== "object" || !Array.isArray(book.pages)) {
    throw new Error("JSON de projeto inválido: campo 'pages' ausente.");
  }
  const pages: Page[] = book.pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type === "table") return normalizeTableBlock(block);
      if (block.type === "sheet") return { ...block, sheet: normalizeSheet(block.sheet) };
      return block as Block;
    }),
  }));
  return {
    schemaVersion: 1,
    meta: book.meta,
    tokens: { ...DEFAULT_TOKENS, ...(book.tokens ?? {}) },
    nodes: book.nodes ?? [],
    pages,
    assets: Array.isArray(book.assets) ? book.assets : [],
    fonts: Array.isArray(book.fonts) ? book.fonts : [],
    spreads: Array.isArray(book.spreads) ? book.spreads : [],
    tableStyles: Array.isArray(book.tableStyles) ? book.tableStyles : [],
    recipes: Array.isArray(book.recipes)
      ? book.recipes.flatMap((recipe) => {
          try {
            return [normalizeRecipe(recipe)];
          } catch (error) {
            console.warn("[kallistis] recipe inválida ignorada", error);
            return [];
          }
        })
      : [],
    sheetTemplates: Array.isArray(book.sheetTemplates) ? book.sheetTemplates : [],
    sheetInstances: Array.isArray(book.sheetInstances) ? book.sheetInstances : [],
  };
}
