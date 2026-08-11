import { StructurePanel } from "./panels/StructurePanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { AssetBrowser } from "./panels/AssetBrowser";
import { PreflightPanel } from "./panels/PreflightPanel";
import { PreviewArea } from "./components/PreviewArea";
import { Toolbar } from "./components/Toolbar";
import { EditorProvider } from "./state/store";
import { getAuthSession } from "../lib/auth";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./styles/editor.css";

/** Três painéis: ESTRUTURA · PREVIEW · PROPRIEDADES (assets abaixo da estrutura). */
export function EditorLayout() {
  const [allowed, setAllowed] = useState<boolean | null>(import.meta.env.DEV ? true : null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 900px)").matches,
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1100px)").matches,
  );
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
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <Toolbar />
        <div className="k-editor-workspace flex min-h-0 flex-1">
          <aside
            id="k-editor-left-panel"
            ref={leftPanelRef}
            className={`k-editor-side-panel k-editor-side-panel--left flex w-[268px] shrink-0 flex-col border-r border-border bg-card ${leftPanelOpen ? "is-open" : "is-closed"}`}
            aria-hidden={!leftPanelOpen}
          >
            <div
              className="k-editor-left-panel-sections"
              style={{
                gridTemplateRows: `minmax(0, ${leftPanelRatio}fr) 7px minmax(0, ${100 - leftPanelRatio}fr)`,
              }}
            >
              <div className="min-h-0">
                <StructurePanel />
              </div>
              <div
                className="k-editor-panel-separator"
                role="separator"
                tabIndex={0}
                aria-label="Redimensionar Estrutura e Assets"
                aria-orientation="horizontal"
                aria-valuemin={28}
                aria-valuemax={72}
                aria-valuenow={Math.round(leftPanelRatio)}
                onPointerDown={beginLeftPanelResize}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    adjustLeftPanelRatio(-2);
                  }
                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    adjustLeftPanelRatio(2);
                  }
                }}
              />
              <div className="min-h-0 border-t border-border">
                <AssetBrowser />
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
                className="k-editor-panel-toggle k-editor-panel-toggle--right"
                aria-expanded={rightPanelOpen}
                aria-controls="k-editor-right-panel"
                onClick={() => setRightPanelOpen((open) => !open)}
              >
                <span>Propriedades</span> ☰
              </button>
            </div>
            <PreviewArea />
          </main>

          <aside
            id="k-editor-right-panel"
            className={`k-editor-side-panel k-editor-side-panel--right w-[300px] shrink-0 border-l border-border bg-card ${rightPanelOpen ? "is-open" : "is-closed"}`}
            aria-hidden={!rightPanelOpen}
          >
            <PropertiesPanel />
          </aside>
        </div>
        <PreflightPanel />
      </div>
    </EditorProvider>
  );
}
