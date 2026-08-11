import type { Block, Book, Page } from "../../book/types";
import { DEFAULT_TOKENS } from "../../book/types";
import { normalizeTableBlock } from "../../book/tableModel";
import { normalizeRecipe } from "../../book/authoring";
import { normalizeSheet } from "../../book/sheetModel";

const STORAGE_KEY = "kallistis.book-builder.project.v1";
const PROJECT_PREFIX = "kallistis.book-builder.project.v2.";
const PROJECTS_KEY = "kallistis.book-builder.projects.v1";
const ACTIVE_PROJECT_KEY = "kallistis.book-builder.active-project.v1";

export interface LocalProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
}

function projectStorageKey(projectId: string) {
  return `${PROJECT_PREFIX}${projectId}`;
}

function readRegistry(): LocalProjectSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is LocalProjectSummary =>
          Boolean(
            item &&
            typeof item === "object" &&
            typeof (item as LocalProjectSummary).id === "string" &&
            typeof (item as LocalProjectSummary).title === "string" &&
            typeof (item as LocalProjectSummary).updatedAt === "string",
          ),
        )
      : [];
  } catch {
    return [];
  }
}

function writeRegistry(projects: LocalProjectSummary[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function registerProject(projectId: string, title: string) {
  const projects = readRegistry().filter((project) => project.id !== projectId);
  projects.unshift({
    id: projectId,
    title: title || "Projeto sem título",
    updatedAt: new Date().toISOString(),
  });
  writeRegistry(projects.slice(0, 50));
}

export function createLocalProjectId() {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getActiveLocalProjectId() {
  if (typeof window === "undefined") return "default";
  const fromUrl = new URLSearchParams(window.location.search).get("project");
  if (fromUrl) return fromUrl;
  return window.sessionStorage.getItem(ACTIVE_PROJECT_KEY) || "default";
}

export function setActiveLocalProjectId(projectId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
}

export function listLocalProjects(): LocalProjectSummary[] {
  return readRegistry();
}

export function loadLocalBook(projectId = getActiveLocalProjectId()): Book | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(projectStorageKey(projectId)) ??
      (projectId === "default" ? window.localStorage.getItem(STORAGE_KEY) : null);
    if (!raw) return null;
    const book = normalizeBook(JSON.parse(raw));
    registerProject(projectId, book.meta.title);
    return book;
  } catch (error) {
    console.warn("[kallistis] projeto local inválido, ignorando", error);
    return null;
  }
}

export function saveLocalBook(book: Book, projectId = getActiveLocalProjectId()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(projectStorageKey(projectId), JSON.stringify(book));
  if (projectId === "default") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
  registerProject(projectId, book.meta.title);
}

export function clearLocalBook(projectId = getActiveLocalProjectId()) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(projectStorageKey(projectId));
  if (projectId === "default") window.localStorage.removeItem(STORAGE_KEY);
  writeRegistry(readRegistry().filter((project) => project.id !== projectId));
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
