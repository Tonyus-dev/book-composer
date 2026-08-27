/**
 * BOOK-COMPOSER — projeto vazio genérico.
 *
 * Este é o estado inicial padrão do editor. NÃO importa nenhum projeto
 * específico (ex.: KALLISTIS). Cada novo projeto deve começar daqui e
 * crescer a partir das escolhas do usuário (título, autor, formato,
 * margens, número de páginas, etc.).
 *
 * Tokens aqui são neutros (A4, fontes com fallback genérico) e devem
 * ser sobrescritos pelas configurações do projeto assim que ele for
 * criado pelo modal "Novo livro".
 */
import type { Book } from "../book/types";
import { DEFAULT_TOKENS } from "../book/types";
import { createEmptyPage } from "../book/page-factory";

export interface EmptyBookInput {
  title?: string;
  author?: string;
  pageCount?: number;
  /** overrides opcionais de tokens (ex.: para um novo projeto A5) */
  tokens?: Partial<typeof DEFAULT_TOKENS>;
  meta?: Partial<Book["meta"]>;
}

export function createEmptyBook(input: EmptyBookInput = {}): Book {
  const pageCount = Math.max(1, Math.min(input.pageCount ?? 1, 1000));
  const tokens = { ...DEFAULT_TOKENS, ...(input.tokens ?? {}) };
  const pages = Array.from({ length: pageCount }, () => createEmptyPage("narrative"));
  return {
    schemaVersion: 1,
    meta: {
      title: input.title ?? "",
      subtitle: "",
      author: input.author ?? "",
      imprint: "",
      edition: "",
      firstFolio: 1,
      ...(input.meta ?? {}),
    },
    tokens,
    nodes: [],
    pages,
    assets: [],
    fonts: [],
    spreads: [],
    tableStyles: [],
    recipes: [],
    sheetTemplates: [],
    sheetInstances: [],
  };
}

/** Singleton neutro usado como INITIAL_BOOK do editor e como fallback de /print. */
export const emptyBook: Book = createEmptyBook({ pageCount: 1 });
