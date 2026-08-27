import { StructurePanel } from "./panels/StructurePanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { AssetBrowser } from "./panels/AssetBrowser";
import { LayersPanel } from "./panels/LayersPanel";
import { PreflightPanel } from "./panels/PreflightPanel";
import { PreviewArea } from "./components/PreviewArea";
import { ContextToolbar } from "./components/ContextToolbar";
import { Toolbar } from "./components/Toolbar";
import { EditorProvider } from "./state/store";
import { getAuthSession } from "../lib/auth";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./state/store";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PageGuide, ReviewState } from "../lib/persistence/production-plan";
import "./styles/editor.css";

function WorkspaceStatusBar() {
  const { book, selectedPageIndex, zoom, setZoom, status, lastSavedAt, preflight } = useEditor();
  const summary = preflight.summary;
  const savedTime = lastSavedAt
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(lastSavedAt)
    : null;
  return (
    <footer className="k-editor-status-bar" data-testid="status-bar">
      <span>
        {status === "saving"
          ? "salvando…"
          : status === "offline"
            ? `offline · salvo localmente${savedTime ? ` às ${savedTime}` : ""}`
            : savedTime
              ? `salvo localmente às ${savedTime}`
              : "aguardando salvamento"}
      </span>
      <span>
        Página {selectedPageIndex + 1} / {book.pages.length}
      </span>
      <span>
        Preflight: {summary.errors} erros · {summary.warnings} avisos
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Diminuir zoom"
          onClick={() => setZoom(typeof zoom === "number" ? Math.max(0.25, zoom - 0.1) : 0.9)}
        >
          −
        </button>
        <span>{typeof zoom === "number" ? `${Math.round(zoom * 100)}%` : "Ajustar"}</span>
        <button
          type="button"
          aria-label="Aumentar zoom"
          onClick={() => setZoom(typeof zoom === "number" ? Math.min(2, zoom + 0.1) : 1.1)}
        >
          +
        </button>
      </span>
    </footer>
  );
}

const REVIEW_AXES: { key: keyof PageGuide["review"]; label: string }[] = [
  { key: "text", label: "Texto" },
  { key: "art", label: "Arte" },
  { key: "layout", label: "Layout" },
];

function ReviewBar() {
  const {
    reviewMode,
    book,
    selectedPage,
    selectedPageIndex,
    selectedPageGuide,
    selectPage,
    updatePageGuide,
  } = useEditor();
  if (!reviewMode) return null;

  const move = (delta: number) => {
    const next = book.pages[selectedPageIndex + delta];
    if (next) selectPage(next.id);
  };
  const toggleAxis = (axis: keyof PageGuide["review"]) => {
    const current = selectedPageGuide.review[axis];
    const next: ReviewState = current === "approved" ? "pending" : "approved";
    updatePageGuide(selectedPage.id, {
      review: { ...selectedPageGuide.review, [axis]: next },
    });
  };

  return (
    <div className="k-editor-review-bar" data-testid="review-bar" role="toolbar" aria-label="Revisão página a página">
      <strong>Revisão</strong>
      <button type="button" onClick={() => move(-1)} disabled={selectedPageIndex === 0}>
        ← Anterior
      </button>
      <span className="k-editor-review-bar__page">
        Página {selectedPageIndex + 1} / {book.pages.length}
      </span>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={selectedPageIndex === book.pages.length - 1}
      >
        Próxima →
      </button>
      <span className="k-editor-review-bar__divider" aria-hidden="true" />
      {REVIEW_AXES.map((axis) => (
        <button
          key={axis.key}
          type="button"
          aria-pressed={selectedPageGuide.review[axis.key] === "approved"}
          className={selectedPageGuide.review[axis.key] === "approved" ? "is-approved" : ""}
          onClick={() => toggleAxis(axis.key)}
          title={`Marcar ${axis.label.toLowerCase()} desta página como revisado`}
        >
          {selectedPageGuide.review[axis.key] === "approved" ? "✓" : "○"} {axis.label}
        </button>
      ))}
    </div>
  );
}

/** Workspace: páginas, assets e camadas ocupam a mesma sidebar contextual. */
export function EditorLayout() {
  const [allowed, setAllowed] = useState<boolean | null>(import.meta.env.DEV ? true : null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 900px)").matches,
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1100px)").matches,
  );
  const [leftTab, setLeftTab] = useState<"pages" | "assets" | "layers">("pages");
  const [focusMode, setFocusMode] = useState(false);
  const [leftPanelRatio, setLeftPanelRatio] = useState(() => {
    if (typeof window === "undefined") return 52;
    const raw = window.localStorage.getItem("kallistis.book-builder.left-panel-ratio.v1");
    const saved = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(saved) ? Math.max(28, Math.min(72, saved)) : 52;
  });
  const leftPanelRef = useRef<HTMLElement>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    void getAuthSession().then((session) => {
      if (session.authenticated) setAllowed(true);
      else window.location.replace("/login");
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "kallistis.book-builder.left-panel-ratio.v1",
        String(leftPanelRatio),
      );
    } catch {
      /* preferência visual não impede o editor de funcionar */
    }
  }, [leftPanelRatio]);

  useEffect(() => () => cleanupResizeRef.current?.(), []);

  const beginLeftPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    cleanupResizeRef.current?.();
    const panel = leftPanelRef.current;
    if (!panel) return;
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      const rect = panel.getBoundingClientRect();
      if (rect.height <= 0) return;
      const next = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setLeftPanelRatio(Math.max(28, Math.min(72, next)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      pointerTarget.removeEventListener("lostpointercapture", stop);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* o ponteiro pode já ter sido liberado pelo navegador */
      }
      if (cleanupResizeRef.current === stop) cleanupResizeRef.current = null;
    };
    cleanupResizeRef.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    pointerTarget.addEventListener("lostpointercapture", stop);
  };

  const adjustLeftPanelRatio = (delta: number) =>
    setLeftPanelRatio((current) => Math.max(28, Math.min(72, current + delta)));

  if (allowed !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">
        Verificando sessão…
      </div>
    );
  }

  return (
    <EditorProvider>
      <div
        className={`flex h-screen flex-col overflow-hidden bg-background text-foreground${focusMode ? " k-editor-focus-mode" : ""}`}
      >
        <Toolbar />
        <div className="k-editor-workspace flex min-h-0 flex-1">
          <aside
            id="k-editor-left-panel"
            ref={leftPanelRef}
            className={`k-editor-side-panel k-editor-side-panel--left flex w-[224px] shrink-0 flex-col border-r border-border bg-card ${leftPanelOpen ? "is-open" : "is-closed"}`}
            aria-hidden={!leftPanelOpen}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className="k-editor-sidebar-tabs"
                role="tablist"
                aria-label="Painéis do documento"
              >
                {(
                  [
                    ["pages", "Páginas"],
                    ["assets", "Assets"],
                    ["layers", "Camadas"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={leftTab === value}
                    className={leftTab === value ? "is-active" : ""}
                    onClick={() => setLeftTab(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                {leftTab === "pages" ? (
                  <StructurePanel />
                ) : leftTab === "assets" ? (
                  <AssetBrowser />
                ) : (
                  <LayersPanel />
                )}
              </div>
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col">
            <div className="k-editor-panel-controls" role="toolbar" aria-label="Painéis laterais">
              <button
                type="button"
                className="k-editor-panel-toggle"
                aria-expanded={leftPanelOpen}
                aria-controls="k-editor-left-panel"
                onClick={() => setLeftPanelOpen((open) => !open)}
              >
                ☰ <span>Estrutura e assets</span>
              </button>
              <button
                type="button"
                className="k-editor-panel-toggle"
                aria-pressed={focusMode}
                onClick={() => setFocusMode((value) => !value)}
                title="Recolher ou reabrir painéis laterais"
              >
                {focusMode ? "Sair do foco" : "Foco no canvas"}
              </button>
              <button
                type="button"
                className="k-editor-panel-toggle k-editor-panel-toggle--right"
                aria-expanded={rightPanelOpen}
                aria-controls="k-editor-right-panel"
                onClick={() => setRightPanelOpen((open) => !open)}
              >
                <span>Propriedades</span> ☰
              </button>
            </div>
            <ContextToolbar />
            <ReviewBar />
            <PreviewArea />
          </main>

          <aside
            id="k-editor-right-panel"
            className={`k-editor-side-panel k-editor-side-panel--right w-[260px] shrink-0 border-l border-border bg-card ${rightPanelOpen ? "is-open" : "is-closed"}`}
            aria-hidden={!rightPanelOpen}
          >
            <PropertiesPanel />
          </aside>
        </div>
        <WorkspaceStatusBar />
        <PreflightPanel />
      </div>
    </EditorProvider>
  );
}
