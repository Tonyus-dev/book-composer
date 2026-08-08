import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Book } from "../book/types";
import { BookRoot } from "../book/renderer/BookRoot";
import { PageRenderer } from "../book/renderer/PageRenderer";
import { loadLocalBook, normalizeBook } from "../lib/persistence/local";
import { registerBookAssets } from "../lib/assets/registry";
import { buildReport } from "../lib/preflight/report";
import { measureIssues } from "../lib/preflight/measure";
import { demoBook } from "../data/demo-book";

const title = "KALLISTIS — impressão do Livro Básico";
const description =
  "Rota de impressão limpa do KALLISTIS Book Builder: apenas páginas do livro, sem interface de editor.";

export const Route = createFileRoute("/print")({
  validateSearch: (search: Record<string, unknown>): { src?: string } =>
    typeof search["src"] === "string" ? { src: search["src"] } : {},
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrintView,
});

/**
 * ROTA DE IMPRESSÃO: nenhuma UI de editor, nenhum overlay, nenhum scroll artificial.
 * O Chromium imprime esta rota em 1:1 com as dimensões físicas dos tokens.
 */
function PrintView() {
  const { src } = useSearch({ from: "/print" });
  const [book, setBook] = useState<Book>(demoBook);
  const [ready, setReady] = useState(false);

  /* Assets embutidos no JSON precisam estar mapeados antes de pintar as páginas. */
  registerBookAssets(book.assets);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1. JSON injetado pelo exportador (Playwright) — export reprodutível.
      const injected = (window as unknown as { __KALLISTIS_BOOK__?: unknown }).__KALLISTIS_BOOK__;
      if (injected) {
        try {
          setBook(normalizeBook(injected));
          return;
        } catch (error) {
          console.error("[kallistis] JSON injetado inválido", error);
        }
      }

      // 2. ?src=/caminho/arquivo.json — export a partir de um arquivo servido.
      if (src) {
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const parsed = normalizeBook(await response.json());
          if (!cancelled) setBook(parsed);
          return;
        } catch (error) {
          console.error("[kallistis] falha ao carregar JSON de", src, error);
        }
      }

      // 3. Projeto local do editor.
      const local = loadLocalBook();
      if (local && local.pages.length > 0 && !cancelled) setBook(local);
    };

    void run().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const flag = async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
      if (document.fonts?.ready) await document.fonts.ready;
      if (cancelled) return;
      /*
       * Preflight completo (estático + medições no DOM impresso) publicado
       * para o exportador auditar antes de gerar o PDF de produção.
       */
      const report = buildReport(book, measureIssues(document.body, book), { measured: true });
      (window as unknown as { __KALLISTIS_PREFLIGHT__?: unknown }).__KALLISTIS_PREFLIGHT__ = report;
      document.documentElement.dataset["preflightErrors"] = String(report.summary.errors);
      if (!cancelled) document.documentElement.dataset["printReady"] = "true";
    };
    void flag();
    return () => {
      cancelled = true;
    };
  }, [ready, book]);

  return (
    <BookRoot tokens={book.tokens} className="k-print">
      {book.pages.map((page, index) => (
        <div key={page.id} className="k-print-sheet" data-page-index={index}>
          <PageRenderer book={book} page={page} index={index} />
        </div>
      ))}
    </BookRoot>
  );
}
