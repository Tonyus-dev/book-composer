import { StructurePanel } from "./panels/StructurePanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { AssetBrowser } from "./panels/AssetBrowser";
import { PreflightPanel } from "./panels/PreflightPanel";
import { PreviewArea } from "./components/PreviewArea";
import { Toolbar } from "./components/Toolbar";
import { EditorProvider } from "./state/store";
import { getAuthSession } from "../lib/auth";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (import.meta.env.DEV) return;
    void getAuthSession().then((session) => {
      if (session.authenticated) setAllowed(true);
      else window.location.replace("/login");
    });
  }, []);

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
            className={`k-editor-side-panel k-editor-side-panel--left flex w-[268px] shrink-0 flex-col border-r border-border bg-card ${leftPanelOpen ? "is-open" : "is-closed"}`}
            aria-hidden={!leftPanelOpen}
          >
            <div className="min-h-0 flex-1">
              <StructurePanel />
            </div>
            <div className="h-[42%] min-h-0 border-t border-border">
              <AssetBrowser />
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
