import { useEffect, useMemo, useState, useRef } from "react";
import type { Block, BlockType, Page, ShapeBlock, ShapeKind } from "../../book/types";
import {
  cloneBlockForInsert,
  createFormBlock,
  parseAsciiLayout,
  parseSmartPaste,
  serializeAsciiLayout,
} from "../../book/authoring";
import { createTableBlock } from "../../book/tableModel";
import {
  blankSheet,
  cloneSheetForInsert,
  createKallistisCharacterSheet,
} from "../../book/sheetModel";
import {
  downloadPortableBookJson,
  savePortableBookAs,
  downloadPageJson,
  readBookFromFile,
  readPageFromFile,
} from "../../lib/persistence/json";
import { useEditor, nextId, type Overlays, type ZoomValue } from "../state/store";
import { RecipeDialog } from "./RecipeDialog";
import { logoutOwner } from "../../lib/auth";
import {
  clearLocalBook,
  createLocalProjectId,
  listLocalProjects,
  loadLocalBook,
  type LocalProjectSummary,
} from "../../lib/persistence/local";
import {
  getWorkFileName,
  openWorkFile,
  saveBookToWorkFile,
} from "../../lib/persistence/work-file";

const OVERLAY_LABELS: { key: keyof Overlays; label: string }[] = [
  { key: "rulers", label: "Réguas" },
  { key: "margins", label: "Margens" },
  { key: "bleed", label: "Sangria" },
  { key: "safe", label: "Área segura" },
  { key: "columns", label: "Colunas" },
  { key: "baseline", label: "Baseline" },
];

const ZOOMS: ZoomValue[] = ["fit", 0.5, 0.75, 1];

const NEW_BLOCKS: { type: BlockType; label: string }[] = [
  { type: "heading", label: "Título" },
  { type: "text", label: "Texto" },
  { type: "image", label: "Imagem" },
  { type: "quote", label: "Citação" },
  { type: "box", label: "Box" },
  { type: "table", label: "Tabela" },
  { type: "divider", label: "Divisor" },
  { type: "caption", label: "Legenda" },
  { type: "form", label: "Ficha / formulário" },
  { type: "sheet", label: "Sheet designer" },
];

function makeBlock(type: BlockType): Block {
  const id = nextId("b");
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "Novo título" };
    case "image":
      return { id, type, src: "", alt: "", fit: "cover", position: "flow", span: "full" };
    case "quote":
      return { id, type, text: "Nova citação.", size: "md", variant: "rule", span: "full" };
    case "box":
      return { id, type, kind: "regra", title: "Novo box", content: "Conteúdo.", span: "full" };
    case "table":
      return {
        id,
        type,
        columns: ["Coluna A", "Coluna B"],
        rows: [["—", "—"]],
        span: "full",
      };
    case "divider":
      return { id, type, ornament: true, span: "full" };
    case "caption":
      return { id, type, text: "Legenda." };
    case "form":
      return {
        id,
        type,
        title: "Nova ficha",
        fields: [{ id: `${id}-field-1`, label: "Nome", type: "text" }],
        span: "full",
      };
    case "sheet":
      return { id, type, sheet: blankSheet(`${id}-sheet`), span: "full" };
    case "shape":
      return {
        id,
        type,
        shape: "frame",
        label: "Moldura editorial",
        stroke: "#542869",
        fill: "transparent",
        frame: { x: 18, y: 28, width: 120, height: 38 },
      };
    case "toc":
      return { id, type, columns: 1, entries: [] };
    case "lockup":
      return {
        id,
        type,
        src: "/assets/branding/KALLISTIS_lockup_master.jpg",
        alt: "KALLISTIS",
        variant: "lockup",
        width: "70mm",
      };
    default:
      return { id, type: "text", content: "Novo parágrafo.", role: "body" };
  }
}

function makeShape(shape: ShapeKind): ShapeBlock {
  const labels: Record<ShapeKind, string> = {
    frame: "Moldura editorial",
    window: "Janela editorial",
    line: "Linha editorial",
    fill: "Área de cor",
  };
  return {
    id: nextId("shape"),
    type: "shape",
    shape,
    label: labels[shape],
    stroke: shape === "line" ? "#542869" : "#542869",
    fill: shape === "window" ? "#f1eee6" : shape === "fill" ? "#eee7f0" : "transparent",
    frame:
      shape === "line"
        ? { x: 18, y: 80, width: 120, height: 4 }
        : { x: 18, y: 28, width: 120, height: 38 },
  };
}

/** Barra superior: visualização, overlays, blocos, projeto e exportação. */
export function Toolbar() {
  const {
    book,
    view,
    setView,
    zoom,
    setZoom,
    frameToolActive,
    setFrameToolActive,
    overlays,
    toggleOverlay,
    status,
    lastSavedAt,
    reviewMode,
    toggleReviewMode,
    selectedPage,
    clearPage,
    updatePage,
    setTemplate,
    addBlock,
    selectBlock,
    selectedBlock,
    copySelectedBlocks,
    pasteBlocks,
    hasBlockClipboard,
    replaceBook,
    projectId,
    switchLocalProject,
    insertPage,
    resetToDemo,
    saveNow,
    preflight,
    preflightRunning,
    runPreflight,
    openPreflight,
    saveRecipe,
    createPageFromRecipe,
    deleteRecipe,
    canUndo,
    canRedo,
    undo,
    redo,
    snapGrid,
    toggleSnapGrid,
    smartGuides,
    toggleSmartGuides,
    snapEnabled,
    toggleSnapEnabled,
    cursorGuides,
    toggleCursorGuides,
  } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const pageFileRef = useRef<HTMLInputElement>(null);
  const visualizationMenuRef = useRef<HTMLDetailsElement>(null);
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [elementsOpen, setElementsOpen] = useState(false);
  const [newTableColumns, setNewTableColumns] = useState("3");
  const [newTableRows, setNewTableRows] = useState("5");
  const [newTableHeader, setNewTableHeader] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("Novo projeto KALLISTIS");
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);
  const [localProjects, setLocalProjects] = useState<LocalProjectSummary[]>([]);
  const [authoringOpen, setAuthoringOpen] = useState<
    "smart" | "ascii" | "form" | "sheet" | "recipes" | null
  >(null);
  const [authoringText, setAuthoringText] = useState("");
  const [formTitle, setFormTitle] = useState("Ficha de personagem");
  const [formColumns, setFormColumns] = useState<1 | 2>(1);
  const [sheetPreset, setSheetPreset] = useState("blank");
  const [workFileSaving, setWorkFileSaving] = useState(false);
  const [workFileName, setWorkFileName] = useState<string | null>(null);
  const { errors, warnings, infos } = preflight.summary;
  const savedTime = lastSavedAt
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(lastSavedAt)
    : null;

  useEffect(() => {
    let mounted = true;
    void getWorkFileName().then((name) => {
      if (mounted && name) setWorkFileName(name);
    });
    const onFileEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ fileName?: string }>).detail;
      if (detail?.fileName) setWorkFileName(detail.fileName);
    };
    window.addEventListener("kallistis-work-file-saved", onFileEvent);
    window.addEventListener("kallistis-work-file-opened", onFileEvent);
    return () => {
      mounted = false;
      window.removeEventListener("kallistis-work-file-saved", onFileEvent);
      window.removeEventListener("kallistis-work-file-opened", onFileEvent);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      event.preventDefault();
      if (event.key.toLowerCase() === "y" || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          /^(TEXTAREA|SELECT)$/.test(target.tagName) ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox"))
      )
        return;
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "g") return;
      event.preventDefault();
      toggleCursorGuides();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCursorGuides]);
  const asciiPreview = useMemo(() => {
    if (authoringOpen !== "ascii" || !authoringText.trim()) return null;
    const parsed = parseAsciiLayout(authoringText);
    const layout = parsed.blocks.find((block) => block.type === "layout");
    return {
      source: layout?.type === "layout" ? serializeAsciiLayout(layout) : authoringText.trim(),
      summary:
        layout?.type === "layout"
          ? `${layout.columns} colunas · ${layout.rows} faixas · ${layout.areas.length} áreas`
          : `${parsed.blocks.length} blocos editoriais`,
    };
  }, [authoringOpen, authoringText]);

  /* Exportação de produção nunca é silenciosa quando existe ERROR. */
  const openPrint = () => {
    if (errors > 0) {
      const proceed = window.confirm(
        `PREFLIGHT: ${errors} ERROR(S) no livro.\n\n` +
          "A exportação de produção pode perder conteúdo (texto cortado, arte fora do trim, asset ausente).\n\n" +
          "Confirmar a abertura do modo impressão mesmo com erros?",
      );
      if (!proceed) {
        openPreflight();
        return;
      }
    }
    window.open("/print", "_blank", "noopener");
  };

  /**
   * Gera o PDF pelo fluxo nativo do navegador, sempre depois de salvar o
   * snapshot atual. A rota /print continua sendo a única fonte de render:
   * o Chromium oferece "Salvar como PDF" no diálogo de impressão.
   */
  const generatePdf = async () => {
    if (errors > 0) {
      const proceed = window.confirm(
        `PREFLIGHT: ${errors} ERROR(S) no livro.\n\n` +
          "O diálogo nativo pode permitir salvar um PDF com conteúdo cortado ou asset ausente.\n\n" +
          "Continuar mesmo assim?",
      );
      if (!proceed) {
        openPreflight();
        return;
      }
    }
    // A janela precisa continuar controlável para navegar após o saveNow.
    const printWindow = window.open("about:blank", "_blank");
    if (!printWindow) {
      window.alert("Não foi possível abrir a janela de PDF. Permita pop-ups para este aplicativo.");
      return;
    }
    try {
      const saved = await saveNow();
      if (!saved) throw new Error("O snapshot atual não pôde ser salvo.");
      const query = new URLSearchParams({ project: projectId, autoprint: "1" });
      printWindow.location.href = `/print?${query.toString()}`;
    } catch (error) {
      printWindow.close();
      window.alert(`Não foi possível preparar o PDF.\n\n${String(error)}`);
    }
  };

  const insert = (type: BlockType | `shape:${ShapeKind}`) => {
    if (typeof type === "string" && type.startsWith("shape:")) {
      const shape = makeShape(type.slice("shape:".length) as ShapeKind);
      addBlock(selectedPage.id, shape);
      selectBlock(shape.id);
      setElementsOpen(false);
      return;
    }
    if (type === "table") {
      setNewTableOpen(true);
      return;
    }
    if (type === "form") {
      setAuthoringOpen("form");
      return;
    }
    if (type === "sheet") {
      setAuthoringOpen("sheet");
      return;
    }
    const block = makeBlock(type as BlockType);
    addBlock(selectedPage.id, block);
    selectBlock(block.id);
  };

  const createNewProject = (title: string, clearStored = false) => {
    if (!title.trim()) return;
    if (clearStored) clearLocalBook(projectId);
    const page: Page = {
      id: `page-${Date.now().toString(36)}`,
      template: "narrative",
      title: "Página 1",
      settings: { ...selectedPage.settings, header: false, footer: false, pageNumber: false },
      blocks: [],
    };
    const nextBook = {
      ...book,
      meta: { ...book.meta, title: title.trim(), edition: "Projeto editorial" },
      pages: [page],
      nodes: [],
      assets: [],
      fonts: [],
      spreads: [],
    };
    switchLocalProject(createLocalProjectId(), nextBook);
  };

  const openProjectLibrary = () => {
    setLocalProjects(listLocalProjects());
    setProjectLibraryOpen(true);
  };

  const openLocalProject = (localProjectId: string) => {
    const next = loadLocalBook(localProjectId);
    if (!next) {
      window.alert("O snapshot local deste projeto não está disponível.");
      return;
    }
    switchLocalProject(localProjectId, next);
    setProjectLibraryOpen(false);
  };

  const openProjectInWindow = (localProjectId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("project", localProjectId);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const requestCloneProject = (source: LocalProjectSummary) => {
    setCloneSourceId(source.id);
    setNewProjectTitle(`${source.title} — cópia`);
    setProjectLibraryOpen(false);
    setNewProjectOpen(true);
  };

  const exportCurrentPage = () => {
    const filename = `${selectedPage.title?.replace(/[^a-z0-9]+/gi, "-") || "pagina"}.json`;
    downloadPageJson(selectedPage, filename);
  };

  const closeAuthoring = () => {
    setAuthoringOpen(null);
    setAuthoringText("");
  };

  const addBlocks = (blocks: Block[]) => {
    const cloned = blocks.map((block, index) => cloneBlockForInsert(block, index));
    cloned.forEach((block) => addBlock(selectedPage.id, block));
    if (cloned[0]) selectBlock(cloned[0].id);
  };

  const saveWorkingFile = async () => {
    setWorkFileSaving(true);
    try {
      await saveNow();
      const fileName = await saveBookToWorkFile(book);
      window.dispatchEvent(new CustomEvent("kallistis-work-file-saved", { detail: { fileName } }));
    } catch (error) {
      if ((error as DOMException | undefined)?.name !== "AbortError") {
        window.alert(`O projeto foi salvo localmente, mas o arquivo de trabalho não foi gravado.\n\n${String(error)}`);
      }
    } finally {
      setWorkFileSaving(false);
    }
  };

  const openWorkingFile = async () => {
    try {
      const file = await openWorkFile();
      if (!window.confirm("Abrir este JSON e substituir o projeto atual?")) return;
      replaceBook(await readBookFromFile(file));
      setWorkFileName(file.name);
      window.dispatchEvent(
        new CustomEvent("kallistis-work-file-opened", { detail: { fileName: file.name } }),
      );
    } catch (error) {
      if ((error as DOMException | undefined)?.name === "AbortError") return;
      window.alert(`Não foi possível abrir o arquivo de trabalho.\n\n${String(error)}`);
    }
  };

  return (
    <>
      <header className="k-editor-toolbar flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-3 py-2">
        <div className="flex min-w-[220px] items-center gap-3">
          <span className="text-[13px] font-semibold tracking-[0.2em] text-foreground uppercase">
            Kallistis Book Maker
          </span>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <div className="min-w-0 leading-tight">
            <div
              className="truncate text-[11px] font-medium text-foreground"
              title={workFileName ?? "Arquivo de trabalho não vinculado"}
            >
              {workFileName ?? "Arquivo de trabalho não vinculado"}
            </div>
            {book.meta.edition ? (
              <div className="truncate text-[10px] text-muted-foreground" title={book.meta.edition}>
                {book.meta.edition}
              </div>
            ) : null}
          </div>
        </div>

        <details ref={visualizationMenuRef} className="relative">
          <summary className="cursor-pointer list-none border border-border px-2 py-1 text-[11px] hover:bg-accent">
            Visualização ▾
          </summary>
          <div className="absolute left-0 top-full z-50 grid min-w-[190px] gap-2 border border-border bg-card p-2 shadow-xl">
            <div className="grid grid-cols-3 gap-1">
              {(["page", "spread", "light"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  title={
                    mode === "light"
                      ? "Mesa de luz: ritmo, densidade e distribuição de arte no livro inteiro"
                      : undefined
                  }
                  className={`k-editor-view-tab k-editor-view-tab--${mode} border px-2 py-1 text-[11px] ${
                    view === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {mode === "page" ? "Página" : mode === "spread" ? "Spread" : "Mesa"}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              Zoom
              <select
                value={String(zoom)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setZoom(raw === "fit" ? "fit" : (Number(raw) as ZoomValue));
                }}
                className="border border-border bg-input/40 px-1.5 py-1 text-[11px] text-foreground"
              >
                {ZOOMS.map((value) => (
                  <option key={String(value)} value={String(value)}>
                    {value === "fit" ? "Ajustar página" : `${Number(value) * 100}%`}
                  </option>
                ))}
              </select>
            </label>
            {OVERLAY_LABELS.map((entry) => (
              <label key={entry.key} className="flex items-center gap-2 px-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={overlays[entry.key]}
                  onChange={() => toggleOverlay(entry.key)}
                />
                {entry.label}
              </label>
            ))}
            <label className="flex items-center gap-2 px-1 text-[11px]">
              <input type="checkbox" checked={snapGrid} onChange={toggleSnapGrid} />
              Grade 1 mm
            </label>
            <label className="flex items-center gap-2 px-1 text-[11px]">
              <input type="checkbox" checked={smartGuides} onChange={toggleSmartGuides} />
              Smart Guides
            </label>
            <label className="flex items-center gap-2 px-1 text-[11px]">
              <input type="checkbox" checked={snapEnabled} onChange={toggleSnapEnabled} />
              Snap
            </label>
            <label className="flex items-center gap-2 px-1 text-[11px]">
              <input type="checkbox" checked={cursorGuides} onChange={toggleCursorGuides} />
              Guias do cursor
            </label>
            <button
              type="button"
              data-testid="review-mode-toggle"
              aria-pressed={reviewMode}
              onClick={() => {
                toggleReviewMode();
                visualizationMenuRef.current?.removeAttribute("open");
              }}
              className={`border px-2 py-1 text-left text-[11px] ${reviewMode ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
            >
              {reviewMode ? "✓ Modo revisão ativo" : "Modo revisão"}
            </button>
            <button
              type="button"
              onClick={openPrint}
              className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
            >
              Modo impressão
            </button>
          </div>
        </details>

        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="undo-button"
            disabled={!canUndo}
            title="Desfazer (Ctrl/Cmd+Z)"
            onClick={undo}
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↶
          </button>
          <button
            type="button"
            data-testid="redo-button"
            disabled={!canRedo}
            title="Refazer (Shift+Ctrl/Cmd+Z)"
            onClick={redo}
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↷
          </button>
          {snapGrid ? (
            <span
              data-testid="snap-grid-indicator"
              className="k-editor-toolbar-indicator"
              title="Snap ativo: alinhar objetos à grade de 1 mm. Desative no menu Visualização."
            >
              Grade · 1 mm
            </span>
          ) : null}
        </div>

        <details
          open={elementsOpen}
          onToggle={(event) => setElementsOpen(event.currentTarget.open)}
          className="relative"
        >
          <summary className="cursor-pointer list-none border border-primary bg-primary/10 px-2 py-1 text-[11px] text-foreground">
            Inserir elemento ▾
          </summary>
          <div className="absolute left-0 top-full z-50 mt-1 grid min-w-[180px] gap-1 border border-border bg-card p-2 shadow-xl">
            <button
              type="button"
              className="border border-primary px-2 py-1 text-left text-[11px] hover:bg-accent"
              onClick={() => {
                setFrameToolActive(true);
                setElementsOpen(false);
              }}
            >
              Desenhar frame
            </button>
            {[
              ["shape:frame", "Moldura"],
              ["shape:window", "Janela / caixa"],
              ["shape:line", "Linha / filete"],
              ["shape:fill", "Área de cor"],
              ["text", "Texto"],
              ["heading", "Título"],
              ["quote", "Citação"],
              ["box", "Box semântico"],
              ["table", "Tabela"],
              ["image", "Imagem"],
              ["form", "Ficha / formulário"],
              ["sheet", "Sheet editorial"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
                onClick={() => insert(value as BlockType | `shape:${ShapeKind}`)}
              >
                {label}
              </button>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className="cursor-pointer list-none border border-border px-2 py-1 text-[11px] hover:bg-accent">
            Ferramentas ▾
          </summary>
          <div className="absolute left-0 top-full z-50 grid min-w-[180px] gap-1 border border-border bg-card p-2 shadow-xl">
            <button
              type="button"
              data-testid="clear-page"
              title="Remove a composição e os elementos opcionais desta página"
              onClick={() => {
                if (window.confirm("Limpar todos os elementos desta página?"))
                  clearPage(selectedPage.id);
              }}
              className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
            >
              Limpar página
            </button>
            <button
              type="button"
              className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              onClick={() => setAuthoringOpen("smart")}
              title="Importa texto, TSV, CSV ou Markdown como conteúdo editorial"
            >
              Colar inteligente
            </button>
            <button
              type="button"
              className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              onClick={() => setAuthoringOpen("ascii")}
              title="Cria uma composição a partir de uma notação ASCII simples"
            >
              Layout ASCII
            </button>
            <button
              type="button"
              className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              onClick={() => setAuthoringOpen("recipes")}
              title="Salvar e reaplicar receitas editoriais"
            >
              Receitas
            </button>
          </div>
        </details>

        <span className="sr-only">Inserção adicional disponível no menu Inserir.</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={runPreflight}
            disabled={preflightRunning}
            title="Analisar o livro inteiro e listar diagnósticos editoriais"
            className={`border px-2 py-1 text-[11px] font-medium disabled:opacity-60 ${
              errors > 0 ? "border-destructive text-destructive" : "border-border hover:bg-accent"
            }`}
          >
            {preflightRunning ? "Preflight…" : "Preflight"}
          </button>
          <button
            type="button"
            onClick={openPreflight}
            className="k-editor-preflight-summary"
            aria-label={`Preflight: ${errors} erros, ${warnings} avisos, ${infos} informações`}
            title={`${errors} Errors · ${warnings} Warnings · ${infos} Info. Abrir relatório de preflight.`}
          >
            <span className={errors > 0 ? "text-destructive" : "text-[#246b4a]"} aria-hidden="true">
              {errors > 0 ? "✕" : "✓"}
            </span>
            <span className={errors > 0 ? "text-destructive" : ""}>{errors}</span>
            <span
              className={warnings > 0 ? "text-[#a45a16]" : "text-muted-foreground"}
              aria-hidden="true"
            >
              ⚠
            </span>
            <span>{warnings}</span>
            <span className="text-muted-foreground" aria-hidden="true">
              ⓘ
            </span>
            <span>{infos}</span>
          </button>
          <span
            className="k-editor-save-indicator"
            title="O autosave local continua ativo mesmo sem a nuvem."
          >
            {status === "saving"
              ? "● Salvando…"
              : status === "conflict"
                ? "● Conflito"
                : status === "offline"
                  ? "● Offline · salvo"
                : status === "error"
                    ? "● Erro · salvo"
                    : savedTime
                      ? `● Salvo às ${savedTime}`
                      : "● Aguardando salvamento"}
          </span>
          <button
            type="button"
            data-testid="save-project"
            onClick={() => void saveWorkingFile()}
            disabled={workFileSaving}
            className="k-editor-primary-action border px-3 py-1 text-[11px] font-semibold disabled:opacity-60"
            title="Salvar no arquivo de trabalho e também no armazenamento local"
          >
            {workFileSaving || status === "saving" ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            data-testid="generate-pdf"
            onClick={() => void generatePdf()}
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            title="Salva o estado atual e abre o diálogo nativo para salvar como PDF"
          >
            Gerar PDF
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none border border-border px-2 py-1 text-[11px] hover:bg-accent">
              Projeto ▾
            </summary>
            <div className="absolute right-0 top-full z-50 mt-1 grid min-w-[190px] gap-1 border border-border bg-card p-2 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setCloneSourceId(null);
                  setNewProjectTitle("Novo projeto KALLISTIS");
                  setNewProjectOpen(true);
                }}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Novo projeto
              </button>
              <button
                type="button"
                onClick={() =>
                  void downloadPortableBookJson(book, `${book.meta.title || "projeto"}.json`)
                }
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Exportar JSON do projeto
              </button>
              <button
                type="button"
                onClick={() =>
                  void savePortableBookAs(
                    book,
                    `${book.meta.title || "kallistis-projeto"}.json`,
                  ).catch((error) => {
                    window.alert(`Não foi possível salvar a cópia: ${String(error)}`);
                  })
                }
                className="k-editor-primary-action border px-2 py-1 text-left text-[11px]"
              >
                Salvar como…
              </button>
              <button
                type="button"
                onClick={() => void openWorkingFile()}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
                title="Abre o JSON e vincula o arquivo para o Salvar e o autosave"
              >
                Abrir JSON do projeto
              </button>
              <button
                type="button"
                onClick={openProjectLibrary}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Biblioteca de projetos
              </button>
              <button
                type="button"
                onClick={copySelectedBlocks}
                disabled={!selectedBlock}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent disabled:opacity-40"
              >
                Copiar seleção
              </button>
              <button
                type="button"
                onClick={() => pasteBlocks(selectedPage.id)}
                disabled={!hasBlockClipboard}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Colar seleção
              </button>
              <button
                type="button"
                onClick={exportCurrentPage}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Exportar folha selecionada
              </button>
              <button
                type="button"
                onClick={() => pageFileRef.current?.click()}
                className="border border-border px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                Importar folha neste projeto
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Descartar o projeto local e voltar à maquete de desenvolvimento?"))
                    resetToDemo();
                }}
                className="border border-border px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-accent"
              >
                Restaurar maquete
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Excluir o projeto local atual? O arquivo exportado e a nuvem não serão apagados.",
                    )
                  )
                    clearLocalBook(projectId);
                  setNewProjectTitle("Novo projeto KALLISTIS");
                  setNewProjectOpen(true);
                }}
                className="border border-destructive px-2 py-1 text-left text-[11px] text-destructive hover:bg-accent"
              >
                Excluir projeto local
              </button>
            </div>
          </details>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if (window.confirm("Importar este JSON e substituir o projeto atual?")) {
                  replaceBook(await readBookFromFile(file));
                  setWorkFileName(file.name);
                  window.dispatchEvent(
                    new CustomEvent("kallistis-work-file-opened", {
                      detail: { fileName: file.name },
                    }),
                  );
                }
              } catch (error) {
                console.error(error);
                window.alert("Arquivo de projeto inválido.");
              }
              event.target.value = "";
            }}
          />
          <input
            ref={pageFileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                insertPage(await readPageFromFile(file));
              } catch (error) {
                console.error(error);
                window.alert("Arquivo de folha inválido.");
              }
              event.target.value = "";
            }}
          />
          {!import.meta.env.DEV ? (
            <button
              type="button"
              onClick={async () => {
                await logoutOwner();
                window.location.replace("/login");
              }}
              className="border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              Sair
            </button>
          ) : null}
        </div>
      </header>
      {newProjectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6">
          <form
            className="w-[360px] border border-border bg-card p-4 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              if (cloneSourceId) {
                const source = loadLocalBook(cloneSourceId);
                if (source) {
                  switchLocalProject(createLocalProjectId(), {
                    ...source,
                    meta: { ...source.meta, title: newProjectTitle.trim() },
                  });
                }
                setCloneSourceId(null);
              } else {
                createNewProject(newProjectTitle);
              }
              setNewProjectOpen(false);
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">
              {cloneSourceId ? "Clonar projeto" : "Novo projeto"}
            </h2>
            <label className="flex flex-col gap-1 text-xs">
              Nome do projeto
              <input
                autoFocus
                className="border border-border bg-input/40 px-2 py-1"
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="border border-border px-3 py-1 text-xs"
                onClick={() => {
                  setCloneSourceId(null);
                  setNewProjectOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
              >
                {cloneSourceId ? "Criar cópia" : "Criar projeto"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {projectLibraryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6">
          <div className="max-h-[80vh] w-[620px] max-w-full overflow-auto border border-border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Biblioteca de projetos locais</h2>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Cada projeto fica em um snapshot separado. Abra dois snapshots em janelas
                  diferentes para copiar blocos.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground"
                onClick={() => setProjectLibraryOpen(false)}
              >
                Fechar
              </button>
            </div>
            {localProjects.length === 0 ? (
              <p className="border border-dashed border-border p-4 text-xs text-muted-foreground">
                Ainda não há snapshots locais. Salve ou crie um projeto para ele aparecer aqui.
              </p>
            ) : (
              <div className="grid gap-2">
                {localProjects.map((localProject) => (
                  <div
                    key={localProject.id}
                    className="flex items-center justify-between gap-3 border border-border p-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{localProject.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Atualizado {new Date(localProject.updatedAt).toLocaleString("pt-BR")}
                        {localProject.id === projectId ? " · projeto atual" : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="border border-primary px-2 py-1 text-[10px] hover:bg-accent"
                        onClick={() => openLocalProject(localProject.id)}
                      >
                        Abrir aqui
                      </button>
                      <button
                        type="button"
                        className="border border-border px-2 py-1 text-[10px] hover:bg-accent"
                        onClick={() => requestCloneProject(localProject)}
                      >
                        Clonar
                      </button>
                      <button
                        type="button"
                        className="border border-border px-2 py-1 text-[10px] hover:bg-accent"
                        onClick={() => openProjectInWindow(localProject.id)}
                      >
                        Nova janela
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
      {newTableOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6">
          <form
            className="w-[360px] border border-border bg-card p-4 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              const table = createTableBlock(
                `table-${Date.now().toString(36)}`,
                Number(newTableColumns) || 3,
                Number(newTableRows) || 5,
                newTableHeader,
              );
              addBlock(selectedPage.id, table);
              selectBlock(table.id);
              setNewTableOpen(false);
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">Nova tabela</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                Colunas
                <input
                  className="border border-border bg-input/40 px-2 py-1"
                  type="number"
                  min="1"
                  max="24"
                  value={newTableColumns}
                  onChange={(event) => setNewTableColumns(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Linhas
                <input
                  className="border border-border bg-input/40 px-2 py-1"
                  type="number"
                  min="1"
                  max="200"
                  value={newTableRows}
                  onChange={(event) => setNewTableRows(event.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={newTableHeader}
                onChange={(event) => setNewTableHeader(event.target.checked)}
              />
              Primeira linha é cabeçalho
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="border border-border px-3 py-1 text-xs"
                onClick={() => setNewTableOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
              >
                Criar
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {authoringOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6">
          <div className="w-[560px] max-w-full border border-border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">
                  {authoringOpen === "smart"
                    ? "Colar inteligente"
                    : authoringOpen === "ascii"
                      ? "Layout ASCII"
                      : authoringOpen === "form"
                        ? "Criar ficha / formulário"
                        : authoringOpen === "sheet"
                          ? "Criar Sheet editorial"
                          : "Receitas editoriais"}
                </h2>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {authoringOpen === "smart"
                    ? "TSV/CSV/Markdown vira tabela; texto comum vira bloco textual."
                    : authoringOpen === "ascii"
                      ? "Use @template, @title, # título, > citação, parágrafos, tabelas Markdown e [form]."
                      : authoringOpen === "form"
                        ? "Um campo por linha: Nome::text, Notas::multiline, Vida::number ou Ativo::checkbox."
                        : authoringOpen === "sheet"
                          ? "Escolha uma tela vazia ou a reconstrução genérica da ficha de referência. Depois edite os elementos diretamente na página."
                          : "Salve a composição como modelo sem copiar o conteúdo específico da página."}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground"
                onClick={closeAuthoring}
              >
                Fechar
              </button>
            </div>

            {authoringOpen === "recipes" ? (
              <RecipeDialog
                page={selectedPage}
                pairedPage={
                  book.pages[book.pages.findIndex((page) => page.id === selectedPage.id) + 1]
                }
                recipes={book.recipes ?? []}
                onSave={saveRecipe}
                onCreatePage={(recipe) => {
                  createPageFromRecipe(selectedPage.id, recipe);
                  closeAuthoring();
                }}
                onDelete={deleteRecipe}
              />
            ) : authoringOpen === "form" ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const block = createFormBlock(
                    `form-${Date.now().toString(36)}`,
                    formTitle,
                    authoringText,
                    formColumns,
                  );
                  addBlocks([block]);
                  closeAuthoring();
                }}
              >
                <input
                  className="w-full border border-border bg-input/40 px-2 py-1 text-xs"
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  placeholder="Título da ficha"
                />
                <select
                  className="border border-border bg-input/40 px-2 py-1 text-xs"
                  value={String(formColumns)}
                  onChange={(event) => setFormColumns(Number(event.target.value) as 1 | 2)}
                >
                  <option value="1">Uma coluna</option>
                  <option value="2">Duas colunas</option>
                </select>
                <textarea
                  className="h-48 w-full resize-y border border-border bg-input/40 p-2 font-mono text-xs"
                  value={authoringText}
                  onChange={(event) => setAuthoringText(event.target.value)}
                  placeholder={
                    "Nome::text\nClasse::text\nVida::number\nNotas::multiline\nAtivo::checkbox"
                  }
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="border border-border px-3 py-1 text-xs"
                    onClick={closeAuthoring}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                  >
                    Criar ficha
                  </button>
                </div>
              </form>
            ) : authoringOpen === "sheet" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const id = `sheet-${Date.now().toString(36)}`;
                  const templateId = sheetPreset.startsWith("template:")
                    ? sheetPreset.slice("template:".length)
                    : null;
                  const template = templateId
                    ? book.sheetTemplates?.find((item) => item.id === templateId)
                    : undefined;
                  const sheet = template
                    ? cloneSheetForInsert(template.sheet, id)
                    : sheetPreset === "kallistis"
                      ? createKallistisCharacterSheet(id)
                      : blankSheet(id);
                  addBlocks([{ id: `b-${id}`, type: "sheet", sheet, span: "full" }]);
                  closeAuthoring();
                }}
              >
                <label className="flex items-start gap-2 border border-border p-3 text-xs">
                  <input
                    type="radio"
                    checked={sheetPreset === "blank"}
                    onChange={() => setSheetPreset("blank")}
                  />
                  <span>
                    <strong>Canvas vazio</strong>
                    <br />
                    <span className="text-muted-foreground">
                      Começar pelo inserir, arrastar e redimensionar.
                    </span>
                  </span>
                </label>
                {(book.sheetTemplates ?? []).map((template) => (
                  <label
                    key={template.id}
                    className="flex items-start gap-2 border border-border p-3 text-xs"
                  >
                    <input
                      type="radio"
                      checked={sheetPreset === `template:${template.id}`}
                      onChange={() => setSheetPreset(`template:${template.id}`)}
                    />
                    <span>
                      <strong>Modelo: {template.name}</strong>
                      <br />
                      <span className="text-muted-foreground">
                        Criar uma ficha a partir deste desenho salvo.
                      </span>
                    </span>
                  </label>
                ))}
                <label className="flex items-start gap-2 border border-border p-3 text-xs">
                  <input
                    type="radio"
                    checked={sheetPreset === "kallistis"}
                    onChange={() => setSheetPreset("kallistis")}
                  />
                  <span>
                    <strong>Ficha de personagem KALLISTIS</strong>
                    <br />
                    <span className="text-muted-foreground">
                      Duas páginas montadas com elementos genéricos do engine.
                    </span>
                  </span>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="border border-border px-3 py-1 text-xs"
                    onClick={closeAuthoring}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                  >
                    Criar Sheet
                  </button>
                </div>
              </form>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (authoringOpen === "ascii") {
                    const parsed = parseAsciiLayout(authoringText);
                    if (parsed.blocks.length === 0) return;
                    addBlocks(parsed.blocks);
                    if (parsed.title) updatePage(selectedPage.id, { title: parsed.title });
                    if (parsed.template) setTemplate(selectedPage.id, parsed.template);
                  } else {
                    const parsed = parseSmartPaste(authoringText);
                    if (parsed.blocks.length === 0) return;
                    addBlocks(parsed.blocks);
                  }
                  closeAuthoring();
                }}
              >
                {authoringOpen === "ascii" && asciiPreview ? (
                  <div className="border border-border bg-muted/20 p-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Preview determinístico · {asciiPreview.summary}
                    </div>
                    <pre className="max-h-36 overflow-auto whitespace-pre font-mono text-[10px] leading-tight text-foreground">
                      {asciiPreview.source}
                    </pre>
                  </div>
                ) : null}
                <textarea
                  className="h-64 w-full resize-y border border-border bg-input/40 p-2 font-mono text-xs"
                  value={authoringText}
                  onChange={(event) => setAuthoringText(event.target.value)}
                  autoFocus
                  placeholder={
                    authoringOpen === "ascii"
                      ? "@template narrative\n@title Uma página\n# Título\nTexto editorial.\n\n> Uma citação."
                      : "Nome\tDano\tAlcance\nEspada\t1d8\tCurto"
                  }
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="border border-border px-3 py-1 text-xs"
                    onClick={closeAuthoring}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                  >
                    Inserir
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
