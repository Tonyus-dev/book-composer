import type { Book, Page } from "../../book/types";
import { normalizeBook } from "./local";
import { bookSnapshot } from "./local";
import { getAssetBlob } from "../assets/local-store";

/** JSON legível e diffável em Git: 2 espaços, chaves estáveis. */
export function serializeBook(book: Book): string {
  return `${JSON.stringify(bookSnapshot(book), null, 2)}\n`;
}

export function downloadBookJson(book: Book, filename = "kallistis-book.json") {
  const blob = new Blob([serializeBook(book)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Export portátil explícito: reembute bytes somente sob ação do usuário. */
export async function portableBook(book: Book): Promise<Book> {
  return {
    ...book,
    assets: await Promise.all(
      (book.assets ?? []).map(async (asset) => {
        const key =
          asset.storage?.kind === "local"
            ? asset.storage.key
            : asset.storage?.kind === "r2"
              ? asset.storage.localKey
              : undefined;
        if (asset.data) return { ...asset };
        const blob = key
          ? await getAssetBlob(key)
          : asset.storage?.kind === "r2"
            ? await fetch(asset.storage.url).then((response) =>
                response.ok ? response.blob() : null,
              )
            : null;
        if (!key && asset.storage?.kind !== "r2") return { ...asset };
        if (!blob) throw new Error(`Bytes locais ausentes para ${asset.label}`);
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        return { ...asset, data };
      }),
    ),
  };
}

export async function downloadPortableBookJson(
  book: Book,
  filename = "kallistis-book.portable.json",
) {
  downloadBookJson(await portableBook(book), filename);
}

export function downloadPageJson(page: Page, filename = "kallistis-page.json") {
  const blob = new Blob([JSON.stringify({ format: "kallistis.page.v1", page }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readBookFromFile(file: File): Promise<Book> {
  const text = await file.text();
  return normalizeBook(JSON.parse(text));
}

export async function readPageFromFile(file: File): Promise<Page> {
  const payload = JSON.parse(await file.text()) as { format?: unknown; page?: Page };
  if (
    payload.format !== "kallistis.page.v1" ||
    !payload.page?.id ||
    !Array.isArray(payload.page.blocks)
  ) {
    throw new Error("Arquivo de folha inválido.");
  }
  return payload.page;
}
