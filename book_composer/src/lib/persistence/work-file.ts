import type { Book } from "../../book/types";
import { serializeBook } from "./json";

type Permission = "granted" | "denied" | "prompt";

interface WorkFileHandle {
  name: string;
  getFile: () => Promise<File>;
  queryPermission?: (options?: { mode?: "read" | "readwrite" }) => Promise<Permission>;
  requestPermission?: (options?: { mode?: "read" | "readwrite" }) => Promise<Permission>;
  createWritable: () => Promise<{
    write: (content: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

interface PickerWindow extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WorkFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WorkFileHandle>;
}

const DB_NAME = "kallistis.book-builder.work-file.v1";
const STORE_NAME = "handles";
const HANDLE_KEY = "current";

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Não foi possível abrir o vínculo do arquivo."));
  });
}

async function readHandle(): Promise<WorkFileHandle | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as WorkFileHandle | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Não foi possível ler o arquivo de trabalho."));
  });
}

export async function getWorkFileName(): Promise<string | null> {
  try {
    return (await readHandle())?.name ?? null;
  } catch {
    return null;
  }
}

async function writeHandle(handle: WorkFileHandle): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Não foi possível guardar o vínculo do arquivo."));
  });
}

/** Exportado para que savePortableBookAs possa persistir o handle do "Salvar como". */
export async function persistWorkFileHandle(handle: WorkFileHandle): Promise<void> {
  return writeHandle(handle);
}

async function ensureWritePermission(handle: WorkFileHandle): Promise<boolean> {
  const options = { mode: "readwrite" as const };
  const current = handle.queryPermission ? await handle.queryPermission(options) : "granted";
  if (current === "granted") return true;
  return handle.requestPermission ? (await handle.requestPermission(options)) === "granted" : false;
}

async function assertWorkFileMatchesBook(book: Book, handle: WorkFileHandle): Promise<void> {
  const existing = JSON.parse(await (await handle.getFile()).text()) as {
    pages?: unknown;
  };
  const existingPageCount = Array.isArray(existing.pages) ? existing.pages.length : 0;
  const currentPageCount = book.pages.length;
  const isLargeProject = existingPageCount >= 50 || currentPageCount >= 50;
  const isSuspiciousReduction =
    isLargeProject && existingPageCount > 0 && currentPageCount < existingPageCount * 0.8;
  if (isSuspiciousReduction) {
    throw new Error(
      `Proteção contra sobrescrita: o arquivo tem ${existingPageCount} páginas, ` +
        `mas o editor está com ${currentPageCount}. Abra o arquivo correto antes de salvar.`,
    );
  }
}

async function writeBookWithHandle(book: Book, handle: WorkFileHandle): Promise<void> {
  await assertWorkFileMatchesBook(book, handle);
  const writable = await handle.createWritable();
  await writable.write(serializeBook(book));
  await writable.close();
  await writeHandle(handle);
}

/**
 * Abre um projeto pelo seletor nativo e registra o handle real do arquivo.
 * Assim, o próximo Salvar reutiliza exatamente esse caminho, em vez de
 * tratar o JSON apenas como um upload descartável.
 */
export async function openWorkFile(): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("O arquivo de trabalho só pode ser aberto no navegador.");
  }
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (!picker) {
    throw new Error(
      "Este navegador não permite vincular diretamente o arquivo de trabalho. Use Chromium/Chrome.",
    );
  }
  const [handle] = await picker({
    multiple: false,
    types: [{ description: "Projeto KALLISTIS", accept: { "application/json": [".json"] } }],
  });
  if (!handle) throw new Error("Nenhum arquivo de trabalho foi selecionado.");
  const file = await handle.getFile();
  await writeHandle(handle);
  return file;
}

/** Carrega o arquivo de trabalho vinculado quando o editor inicia novamente. */
export async function loadBoundBookFromWorkFile(): Promise<Book | null> {
  try {
    const handle = await readHandle();
    if (!handle) return null;
    const permission = handle.queryPermission
      ? await handle.queryPermission({ mode: "read" })
      : "granted";
    if (permission !== "granted") return null;
    const payload = JSON.parse(await (await handle.getFile()).text()) as Book;
    return Array.isArray(payload.pages) && payload.pages.length > 0 ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Autosave silencioso: só grava se já houver um arquivo vinculado. Nunca abre
 * um seletor de arquivos durante uma edição automática.
 */
export async function saveBoundBookToWorkFile(book: Book): Promise<boolean> {
  try {
    const handle = await readHandle();
    if (!handle) return false;
    const permission = handle.queryPermission
      ? await handle.queryPermission({ mode: "readwrite" })
      : "granted";
    if (permission !== "granted") return false;
    await writeBookWithHandle(book, handle);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grava o snapshot atual no arquivo escolhido pelo usuário. O handle fica
 * associado ao BOOK-COMPOSER para que os próximos cliques em Salvar reutilizem
 * exatamente o mesmo arquivo.
 *
 * `suggestedName` é derivado do `book.meta.title` (genérico); o caller pode
 * sobrescrever. Não há mais nome KALLISTIS hardcoded.
 */
export async function saveBookToWorkFile(book: Book, suggestedName?: string): Promise<string> {
  if (typeof window === "undefined")
    throw new Error("O arquivo de trabalho só pode ser salvo no navegador.");
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) {
    throw new Error(
      "Este navegador não permite gravar diretamente no arquivo de trabalho. Use Chromium/Chrome.",
    );
  }
  const safeTitle = (book.meta.title || "projeto").trim();
  const fallbackName = `${slugify(safeTitle)}.json`;
  const finalSuggested = suggestedName ?? fallbackName;

  let handle = await readHandle();
  if (!handle || !(await ensureWritePermission(handle))) {
    handle = await picker({
      suggestedName: finalSuggested,
      types: [{ description: "Projeto BOOK-COMPOSER", accept: { "application/json": [".json"] } }],
    });
    if (!(await ensureWritePermission(handle))) {
      throw new Error("Permissão de escrita não concedida para o arquivo de trabalho.");
    }
  }

  await writeBookWithHandle(book, handle);
  return handle.name;
}

/** Slug simples para o nome sugerido do arquivo de trabalho. */
function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "projeto"
  );
}
