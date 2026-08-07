import type { Book } from "../../book/types";
import { normalizeBook } from "./local";

/** JSON legível e diffável em Git: 2 espaços, chaves estáveis. */
export function serializeBook(book: Book): string {
  return `${JSON.stringify(book, null, 2)}\n`;
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

export async function readBookFromFile(file: File): Promise<Book> {
  const text = await file.text();
  return normalizeBook(JSON.parse(text));
}
