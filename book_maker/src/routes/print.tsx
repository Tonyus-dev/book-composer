import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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
      <SpreadAwarePages book={book} />
    </BookRoot>
  );
}

/**
 * Renderiza páginas do livro agrupando os pares de spread (008-009 etc.)
 * em uma única folha física de largura 2*trim + 2*bleed. Cada página
 * continua sendo renderizada por PageRenderer para preservar header/footer
 * e paridade.
 */
function SpreadAwarePages({ book }: { book: Book }) {
  const spreads = book.spreads ?? [];
  const spreadPair = new Map<number, { left: number; right: number }>();
  for (const s of spreads) {
    spreadPair.set(s.left, { left: s.left, right: s.right });
  }

  const pages = book.pages;
  const emitted = new Set<number>();
  const out: ReactNode[] = [];

  pages.forEach((page, index) => {
    if (emitted.has(index)) return;
    const folioNum = book.meta.firstFolio + index;
    const spread = spreadPair.get(folioNum);
    if (spread) {
      const rightIndex = index + 1;
      const rightPage = pages[rightIndex];
      if (rightPage) {
        emitted.add(index);
        emitted.add(rightIndex);
        out.push(
          <div
            key={`spread-${folioNum}`}
            className="k-print-sheet k-print-sheet--spread"
            data-spread-left={folioNum}
            data-spread-right={folioNum + 1}
          >
            <div className="k-spread__left">
              <PageRenderer book={book} page={page} index={index} />
            </div>
            <div className="k-spread__gutter" aria-hidden="true" />
            <div className="k-spread__right">
              <PageRenderer book={book} page={rightPage} index={rightIndex} />
            </div>
          </div>,
        );
        return;
      }
    }
    emitted.add(index);
    out.push(
      <div key={page.id} className="k-print-sheet" data-page-index={index}>
        <PageRenderer book={book} page={page} index={index} />
      </div>,
    );
  });

  return <>{out}</>;
}
