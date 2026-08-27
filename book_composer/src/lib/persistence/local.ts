import type { Block, Book, Page } from "../../book/types";
import { DEFAULT_TOKENS } from "../../book/types";
import { normalizeTableBlock } from "../../book/tableModel";
import { normalizeRecipe } from "../../book/authoring";
import { normalizeSheet } from "../../book/sheetModel";
import { dataUrlToBlob, hasAssetBlob, localAssetKey, putAssetBlob } from "../assets/local-store";

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

export function saveLocalBook(book: Book, projectId = getActiveLocalProjectId()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const serialized = JSON.stringify(bookSnapshot(book));
    const storageKey = projectStorageKey(projectId);
    try {
      window.localStorage.setItem(storageKey, serialized);
    } catch (error) {
      /* Projetos grandes podem ter uma cópia v1 antiga ocupando a quota.
         Remova somente essa chave legada e tente novamente a fonte v2. */
      if (projectId !== "default" || !(error instanceof DOMException && error.name === "QuotaExceededError")) {
        throw error;
      }
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(storageKey, serialized);
    }
    if (projectId === "default") {
      /* Nunca duplicar um livro grande: v1 permanece apenas como fallback de leitura. */
      window.localStorage.removeItem(STORAGE_KEY);
    }
    registerProject(projectId, book.meta.title);
    return true;
  } catch (error) {
    console.error("[kallistis] falha ao salvar projeto local", error);
    return false;
  }
}

/** Cópia leve para autosave/snapshot; inline só é removido após migração confirmada. */
export function bookSnapshot(book: Book): Book {
  return {
    ...book,
    assets: (book.assets ?? []).map((asset) => {
      if ((asset.storage?.kind === "local" || asset.storage?.kind === "r2") && asset.data) {
        const { data: _data, ...metadata } = asset;
        return metadata;
      }
      return { ...asset };
    }),
  };
}

/** Migração idempotente: a chave estável é projeto/id e data só sai após leitura confirmada. */
export async function migrateLegacyAssets(book: Book, projectId: string): Promise<Book> {
  let changed = false;
  const assets = await Promise.all(
    (book.assets ?? []).map(async (asset) => {
      if (!asset.data?.startsWith("data:image/")) return asset;
      const key =
        asset.storage?.kind === "local" ? asset.storage.key : localAssetKey(projectId, asset.id);
      try {
        if (!(await hasAssetBlob(key))) await putAssetBlob(key, dataUrlToBlob(asset.data));
        if (!(await hasAssetBlob(key))) return asset;
        changed = true;
        const { data: _data, ...metadata } = asset;
        return { ...metadata, storage: { kind: "local" as const, key } };
      } catch (error) {
        console.error("[kallistis] migração de asset preservou o inline", asset.id, error);
        return asset;
      }
    }),
  );
  return changed ? { ...book, assets } : book;
}

export async function externalizeAsset(
  asset: import("../../book/types").BookAsset,
  projectId: string,
) {
  if (!asset.data) return asset;
  const key = localAssetKey(projectId, asset.id);
  await putAssetBlob(key, dataUrlToBlob(asset.data));
  const { data: _data, ...metadata } = asset;
  return { ...metadata, storage: { kind: "local" as const, key } };
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
    ...(page.template === "cover" &&
    page.coverMode === undefined &&
    isCanonicalComposedCover(book, page)
      ? { coverMode: "art-only" as const }
      : {}),
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
    assets: Array.isArray(book.assets)
      ? book.assets.map((asset) => ({
          ...asset,
          ...(!asset.storage && asset.data ? { storage: { kind: "legacy-inline" as const } } : {}),
        }))
      : [],
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
    ...(book.productionPlan && typeof book.productionPlan === "object"
      ? { productionPlan: book.productionPlan }
      : {}),
  };
}

function isCanonicalComposedCover(book: Book, page: Page): boolean {
  return (
    book.meta?.title === "KALLISTIS — Livro Básico" &&
    page.blocks.some(
      (block) => block.type === "image" && block.src === "/assets/cover/capa-cristal.jpg",
    )
  );
}
