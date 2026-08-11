import { useMemo, useState, useRef } from "react";
import type { Block, BlockType } from "../../book/types";
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
import { downloadBookJson, readBookFromFile } from "../../lib/persistence/json";
import { useEditor, nextId, type Overlays, type ZoomValue } from "../state/store";
import { RecipeDialog } from "./RecipeDialog";

const OVERLAY_LABELS: { key: keyof Overlays; label: string }[] = [
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

/** Barra superior: visualização, overlays, blocos, projeto e exportação. */
export function Toolbar() {
  const {
    book,
    view,
    setView,
    zoom,
    setZoom,
    overlays,
    toggleOverlay,
    status,
    selectedPage,
    updatePage,
    setTemplate,
    addBlock,
    selectBlock,
    replaceBook,
    resetToDemo,
    preflight,
    preflightRunning,
    runPreflight,
    openPreflight,
    saveRecipe,
    createPageFromRecipe,
    deleteRecipe,
  } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [newTableColumns, setNewTableColumns] = useState("3");
  const [newTableRows, setNewTableRows] = useState("5");
  const [newTableHeader, setNewTableHeader] = useState(true);
  const [authoringOpen, setAuthoringOpen] = useState<
    "smart" | "ascii" | "form" | "sheet" | "recipes" | null
  >(null);
  const [authoringText, setAuthoringText] = useState("");
  const [formTitle, setFormTitle] = useState("Ficha de personagem");
  const [formColumns, setFormColumns] = useState<1 | 2>(1);
  const [sheetPreset, setSheetPreset] = useState("blank");
  const { errors, warnings, infos } = preflight.summary;
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

  const insert = (type: BlockType) => {
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
    const block = makeBlock(type);
    addBlock(selectedPage.id, block);
    selectBlock(block.id);
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

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-3 py-2">
        <div className="flex min-w-[220px] items-center gap-3">
          <span className="text-[13px] font-semibold tracking-[0.2em] text-foreground uppercase">
            Kallistis Book Maker
          </span>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <div className="min-w-0 leading-tight">
            <div
              className="truncate text-[11px] font-medium text-foreground"
              title={book.meta.title}
            >
              {book.meta.title}
            </div>
            {book.meta.edition ? (
              <div className="truncate text-[10px] text-muted-foreground" title={book.meta.edition}>
                {book.meta.edition}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
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
              className={`border px-2 py-1 text-[11px] ${
                view === mode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {mode === "page" ? "Página" : mode === "spread" ? "Spread" : "Mesa de luz"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
                {value === "fit" ? "Ajustar" : `${Number(value) * 100}%`}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            onClick={() => setAuthoringOpen("smart")}
            title="Importa texto, TSV, CSV ou Markdown como conteúdo editorial"
          >
            Colar inteligente
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            onClick={() => setAuthoringOpen("ascii")}
            title="Cria uma composição a partir de uma notação ASCII simples"
          >
            Layout ASCII
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            onClick={() => setAuthoringOpen("recipes")}
            title="Salvar e reaplicar receitas editoriais"
          >
            Receitas
          </button>
        </div>

        <div className="flex items-center gap-1">
          {OVERLAY_LABELS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={overlays[entry.key]}
              onClick={() => toggleOverlay(entry.key)}
              className={`border px-2 py-1 text-[11px] ${
                overlays[entry.key]
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          Inserir
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) insert(event.target.value as BlockType);
            }}
            className="border border-border bg-input/40 px-1.5 py-1 text-[11px] text-foreground"
          >
            <option value="">bloco…</option>
            {NEW_BLOCKS.map((entry) => (
              <option key={entry.type} value={entry.type}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

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
            className="text-[10px] text-muted-foreground tabular-nums hover:text-foreground"
          >
            <span className={errors > 0 ? "text-destructive" : ""}>{errors} Errors</span>
            {` ${warnings} Warnings ${infos} Info`}
          </button>
          <span
            className="text-[10px] text-muted-foreground"
            title="O autosave local continua ativo mesmo sem a nuvem."
          >
            {status === "saving"
              ? "sincronizando…"
              : status === "conflict"
                ? "conflito de versão"
                : status === "offline"
                  ? "offline · salvo localmente"
                  : status === "error"
                    ? "erro de sync · salvo localmente"
                    : "salvo localmente"}
          </span>
          <button
            type="button"
            onClick={() => downloadBookJson(book)}
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
          >
            Exportar projeto
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
          >
            Abrir projeto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                replaceBook(await readBookFromFile(file));
              } catch (error) {
                console.error(error);
                window.alert("Arquivo de projeto inválido.");
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm("Descartar o projeto local e voltar à maquete de desenvolvimento?")
              )
                resetToDemo();
            }}
            className="border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
          >
            Restaurar maquete
          </button>
          <button
            type="button"
            onClick={openPrint}
            className="border border-primary bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
          >
            Modo impressão
          </button>
        </div>
      </header>
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
