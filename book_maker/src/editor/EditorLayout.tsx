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
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[268px] shrink-0 flex-col border-r border-border bg-card">
            <div className="min-h-0 flex-1">
              <StructurePanel />
            </div>
            <div className="h-[42%] min-h-0 border-t border-border">
              <AssetBrowser />
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <PreviewArea />
          </main>

          <aside className="w-[300px] shrink-0 border-l border-border bg-card">
            <PropertiesPanel />
          </aside>
        </div>
        <PreflightPanel />
      </div>
    </EditorProvider>
  );
}
