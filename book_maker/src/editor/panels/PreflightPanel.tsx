import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "../../book/types";
import { BookRoot } from "../../book/renderer/BookRoot";
import { PageRenderer } from "../../book/renderer/PageRenderer";
import { measureIssues, waitForLayout } from "../../lib/preflight/measure";
import { downloadPreflightHtml, downloadPreflightJson } from "../../lib/preflight/download";
import {
  PREFLIGHT_RULES,
  SEVERITY_LABEL,
  type PreflightIssue,
  type PreflightSeverity,
} from "../../lib/preflight/types";
import { useEditor } from "../state/store";

const SEVERITY_CLASS: Record<PreflightSeverity, string> = {
  error: "text-destructive",
  warning: "text-[#c08b2b]",
  info: "text-muted-foreground",
};

/**
 * Renderiza o livro inteiro fora da tela, em escala 1:1, apenas para medir.
 * Medir no canvas do editor seria errado: ele tem zoom, overlays e recorte.
 */
function MeasurementMount({
  book,
  onDone,
}: {
  book: Book;
  onDone: (issues: PreflightIssue[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const root = ref.current;
      if (!root) return;
      await waitForLayout(root);
      if (cancelled || !ref.current) return;
      onDone(measureIssues(ref.current, book));
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [book, onDone]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-preflight-mount="true"
      style={{
        position: "fixed",
        left: -20000,
        top: 0,
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <BookRoot tokens={book.tokens} fonts={book.fonts}>
        {book.pages.map((page, index) => (
          <PageRenderer key={page.id} book={book} page={page} index={index} />
        ))}
      </BookRoot>
    </div>
  );
}

function IssueRow({ issue }: { issue: PreflightIssue }) {
  const { focusIssue, selectedPageId, selectedBlockId } = useEditor();
  const active =
    issue.pageId === selectedPageId && (issue.blockId ?? null) === (selectedBlockId ?? null);
  return (
    <li>
      <button
        type="button"
        data-preflight-rule={issue.rule}
        data-preflight-severity={issue.severity}
        onClick={() => focusIssue(issue)}
        className={`flex w-full gap-3 border-b border-border px-3 py-2 text-left hover:bg-accent/40 ${
          active ? "bg-accent/60" : ""
        }`}
      >
        <span
          className={`w-[62px] shrink-0 text-[10px] font-semibold tracking-[0.12em] ${SEVERITY_CLASS[issue.severity]}`}
        >
          {SEVERITY_LABEL[issue.severity]}
        </span>
        <span className="w-8 shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {issue.folio ?? "—"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-foreground">{issue.description}</span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {PREFLIGHT_RULES[issue.rule].label} · {issue.element}
            {issue.blockId ? ` · ${issue.blockId}` : ""} · {issue.source}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground italic">
            {issue.inspection}
          </span>
        </span>
      </button>
    </li>
  );
}

/** PREFLIGHT: diagnóstico do livro inteiro, sem alterar uma linha do conteúdo. */
export function PreflightPanel() {
  const {
    book,
    preflight,
    preflightOpen,
    preflightRunning,
    preflightStale,
    closePreflight,
    runPreflight,
    completePreflight,
  } = useEditor();
  const [filter, setFilter] = useState<PreflightSeverity | "all">("all");

  const onDone = useCallback(
    (issues: PreflightIssue[]) => completePreflight(issues),
    [completePreflight],
  );

  const issues = useMemo(
    () =>
      filter === "all" ? preflight.issues : preflight.issues.filter((i) => i.severity === filter),
    [filter, preflight.issues],
  );

  if (!preflightOpen) {
    return preflightRunning ? <MeasurementMount book={book} onDone={onDone} /> : null;
  }

  const { errors, warnings, infos } = preflight.summary;

  return (
    <>
      {preflightRunning ? <MeasurementMount book={book} onDone={onDone} /> : null}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6">
        <div className="flex max-h-[80vh] w-[860px] max-w-full flex-col border border-border bg-card shadow-xl">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <h2 className="text-[12px] font-semibold tracking-[0.2em] text-foreground uppercase">
              Preflight
            </h2>
            <span className="text-[11px] text-muted-foreground">
              <span className={errors > 0 ? "text-destructive" : ""}>{errors} Errors</span>
              {" · "}
              {warnings} Warnings{" · "}
              {infos} Info
            </span>
            <span className="text-[10px] text-muted-foreground">
              {preflightRunning
                ? "medindo layout…"
                : preflight.measured
                  ? "estático + medições de layout"
                  : "somente regras estáticas"}
              {preflightStale && !preflightRunning ? " · medições desatualizadas" : ""}
            </span>
            <button
              type="button"
              onClick={closePreflight}
              className="ml-auto border border-border px-2 py-1 text-[11px] hover:bg-accent"
            >
              Fechar
            </button>
          </header>

          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            {(["all", "error", "warning", "info"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`border px-2 py-1 text-[11px] ${
                  filter === value
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {value === "all" ? "Tudo" : SEVERITY_LABEL[value]}
              </button>
            ))}
            <button
              type="button"
              onClick={runPreflight}
              disabled={preflightRunning}
              className="ml-auto border border-primary bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-60"
            >
              {preflightRunning ? "Analisando…" : "Reexecutar análise"}
            </button>
            <button
              type="button"
              onClick={() => downloadPreflightJson(preflight)}
              className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            >
              report.json
            </button>
            <button
              type="button"
              onClick={() => downloadPreflightHtml(preflight)}
              className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            >
              report.html
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {issues.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-muted-foreground">
                Nenhuma ocorrência nesta categoria.
              </p>
            ) : (
              <ul>
                {issues.map((issue, index) => (
                  <IssueRow
                    key={`${issue.rule}-${issue.pageId ?? "doc"}-${issue.blockId ?? index}-${index}`}
                    issue={issue}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            {book.meta.title} · {book.pages.length} páginas · fingerprint{" "}
            {preflight.book.fingerprint}
          </footer>
        </div>
      </div>
    </>
  );
}
