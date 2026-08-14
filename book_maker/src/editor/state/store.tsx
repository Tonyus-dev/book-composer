import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  Block,
  Book,
  BookAsset,
  BookFont,
  BookRecipe,
  BookTokens,
  Page,
  PageSettings,
  SheetDocument,
  SheetInstance,
  SheetTemplate,
  TableStyle,
  TemplateId,
} from "../../book/types";
import { TEMPLATES } from "../../book/templates";
import { createEmptyPage } from "../../book/page-factory";
import { demoBook } from "../../data/demo-book";
import { canonicalBook } from "../../data/canonical-book";
import {
  getActiveLocalProjectId,
  loadLocalBook,
  migrateLegacyAssets,
  saveLocalBook,
  setActiveLocalProjectId,
} from "../../lib/persistence/local";
import { normalizeBook } from "../../lib/persistence/local";
import { cloudProjectId, loadCloudProject, saveCloudSnapshot } from "../../lib/persistence/cloud";
import {
  emptyPageGuide,
  ensurePageEntry,
  loadLocalProductionPlan,
  normalizeProductionPlan,
  productionPlanForBookId,
  saveLocalProductionPlan,
  type PageGuide,
  type ProductionPlan,
} from "../../lib/persistence/production-plan";
import { assetRef, registerBookAssets } from "../../lib/assets/registry";
import { deleteAssetBlob } from "../../lib/assets/local-store";
import { syncLocalAssets } from "../../lib/assets/cloud-upload";
import { buildReport, fingerprint } from "../../lib/preflight/report";
import type { PreflightIssue, PreflightReport } from "../../lib/preflight/types";
import { folioFor } from "../../book/renderer/PageRenderer";
import { normalizeTableBlock, splitTable as splitTableBlock } from "../../book/tableModel";
import {
  cloneBlockForInsert,
  materializeRecipe,
  materializeRecipeBlueprint,
  normalizeRecipe,
} from "../../book/authoring";
import type { TableBlockV2 } from "../../book/types";
import { bookRhythm, type PageRhythm } from "../../lib/rhythm/metrics";
import {
  DEFAULT_RHYTHM_CONFIG,
  rhythmWarnings as computeRhythmWarnings,
  type RhythmConfig,
  type RhythmRuleConfig,
  type RhythmRuleId,
  type RhythmWarning,
} from "../../lib/rhythm/warnings";

export type ViewMode = "page" | "spread" | "light";

const RHYTHM_CONFIG_KEY = "kallistis.rhythm-config.v1";
export type ZoomValue = number | "fit";

export interface Overlays {
  rulers: boolean;
  margins: boolean;
  bleed: boolean;
  safe: boolean;
  columns: boolean;
  baseline: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

interface MeasuredSnapshot {
  fingerprint: string;
  issues: PreflightIssue[];
}

interface EditorContextValue {
  book: Book;
  selectedPageId: string;
  selectedBlockId: string | null;
  view: ViewMode;
  zoom: ZoomValue;
  frameToolActive: boolean;
  overlays: Overlays;
  status: SaveStatus;
  overflowPages: Record<string, boolean>;
  selectedPage: Page;
  selectedPageIndex: number;
  selectedBlock: Block | null;
  /** relatório atual: regras estáticas sempre; medições quando já executadas */
  preflight: PreflightReport;
  preflightRunning: boolean;
  preflightOpen: boolean;
  /** true quando o livro mudou depois da última medição de layout */
  preflightStale: boolean;
  /** métricas de ritmo por página (diagnóstico, nunca recompõe o livro) */
  rhythm: PageRhythm[];
  rhythmWarnings: RhythmWarning[];
  rhythmConfig: RhythmConfig;
  showRhythmStrip: boolean;
  setRhythmRule: (rule: RhythmRuleId, patch: Partial<RhythmRuleConfig>) => void;
  toggleRhythmStrip: () => void;
  setView: (view: ViewMode) => void;
  setZoom: (zoom: ZoomValue) => void;
  setFrameToolActive: (active: boolean) => void;
  toggleOverlay: (key: keyof Overlays) => void;
  selectPage: (pageId: string) => void;
  selectBlock: (blockId: string | null) => void;
  reportOverflow: (pageId: string, overflowing: boolean) => void;
  updatePage: (pageId: string, patch: Partial<Omit<Page, "id">>) => void;
  updatePageSettings: (pageId: string, patch: Partial<PageSettings>) => void;
  clearPage: (pageId: string) => void;
  togglePageFixed: (pageId: string) => void;
  setTemplate: (pageId: string, template: TemplateId) => void;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  updateTable: (
    pageId: string,
    blockId: string,
    transform: (table: TableBlockV2) => TableBlockV2,
  ) => void;
  splitTable: (pageId: string, blockId: string, afterRowIndex: number) => void;
  duplicateTable: (pageId: string, blockId: string) => void;
  duplicateBlock: (pageId: string, blockId: string) => void;
  saveTablePreset: (name: string, style: TableStyle) => void;
  addBlock: (pageId: string, block: Block) => void;
  removeBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, blockId: string, direction: -1 | 1) => void;
  addPage: (afterPageId: string, template?: TemplateId) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, toIndex: number) => void;
  setTokens: (patch: Partial<BookTokens>) => void;
  setMeta: (patch: Partial<Book["meta"]>) => void;
  addAssets: (assets: BookAsset[]) => void;
  addFont: (font: BookFont) => void;
  removeFont: (fontId: string) => void;
  updateAsset: (assetId: string, patch: Partial<Omit<BookAsset, "id">>) => void;
  removeAsset: (assetId: string) => void;
  assetUsage: (assetId: string) => number;
  toggleBlockHidden: (pageId: string, blockId: string) => void;
  toggleBlockLocked: (pageId: string, blockId: string) => void;
  moveBlockToIndex: (pageId: string, blockId: string, index: number) => void;
  openPreflight: () => void;
  closePreflight: () => void;
  runPreflight: () => void;
  completePreflight: (issues: PreflightIssue[]) => void;
  issuesForPage: (pageId: string) => PreflightIssue[];
  focusIssue: (issue: PreflightIssue) => void;
  replaceBook: (book: Book) => void;
  projectId: string;
  switchLocalProject: (projectId: string, book: Book) => void;
  insertPage: (page: Page) => void;
  resetToDemo: () => void;
  saveNow: () => Promise<boolean>;
  saveRecipe: (recipe: BookRecipe) => void;
  createPageFromRecipe: (afterPageId: string, recipe: BookRecipe) => void;
  deleteRecipe: (recipeId: string) => void;
  insertRecipe: (pageId: string, recipe: BookRecipe) => void;
  saveSheetTemplate: (sheet: SheetDocument) => void;
  createSheetInstance: (templateId: string, values?: SheetInstance["values"]) => void;
  /* PRODUCTION PLAN — direção editorial por página, nunca entra no print. */
  productionPlan: ProductionPlan;
  selectedPageGuide: PageGuide;
  updatePageGuide: (pageId: string, patch: Partial<PageGuide>) => void;
  resetProductionPlan: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  snapGrid: boolean;
  toggleSnapGrid: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;
const INITIAL_BOOK = normalizeBook(canonicalBook);

function withPage(book: Book, pageId: string, transform: (page: Page) => Page): Book {
  return {
    ...book,
    pages: book.pages.map((page) => (page.id === pageId ? transform(page) : page)),
  };
}

function replacePageIdInNodes(book: Book, oldId: string, newIds: string[]): Book["nodes"] {
  return book.nodes.map((node) => ({
    ...node,
    pageIds: node.pageIds.flatMap((id) => (id === oldId ? newIds : [id])),
  }));
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [, refreshAssets] = useState(0);
  const [book, setBookState] = useState<Book>(INITIAL_BOOK);
  const [projectId, setProjectId] = useState(() => getActiveLocalProjectId());
  const initialProjectIdRef = useRef(projectId);
  const historyRef = useRef<{ past: Book[]; future: Book[] }>({ past: [], future: [] });
  const setBook = useCallback((updater: SetStateAction<Book>) => {
    setBookState((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      if (next !== previous) {
        historyRef.current.past = [...historyRef.current.past, previous].slice(-50);
        historyRef.current.future = [];
      }
      return next;
    });
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>(INITIAL_BOOK.pages[0]!.id);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("page");
  const [zoom, setZoom] = useState<ZoomValue>("fit");
  const [frameToolActive, setFrameToolActive] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [overflowPages, setOverflowPages] = useState<Record<string, boolean>>({});
  const [measured, setMeasured] = useState<MeasuredSnapshot | null>(null);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [rhythmConfig, setRhythmConfig] = useState<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const [showRhythmStrip, setShowRhythmStrip] = useState(true);
  const [snapGrid, setSnapGrid] = useState(false);
  const [overlays, setOverlays] = useState<Overlays>({
    rulers: true,
    margins: true,
    bleed: false,
    safe: false,
    columns: false,
    baseline: false,
  });
  const [productionPlan, setProductionPlanState] = useState<ProductionPlan>(() => ({
    version: 1,
    bookId: productionPlanForBookId(INITIAL_BOOK),
    pages: {},
  }));
  const [cloudReady, setCloudReady] = useState(false);
  const cloudProjectIdRef = useRef(cloudProjectId(INITIAL_BOOK));
  const cloudRevisionRef = useRef<number | null>(null);
  const cloudReadyRef = useRef(false);
  const skipCloudSaveRef = useRef(false);

  const saveNow = useCallback(async () => {
    setStatus("saving");
    const localSaved = saveLocalBook(book, projectId);
    if (!localSaved) {
      setStatus("error");
      return false;
    }
    if (!cloudReady || skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      setStatus("saved");
      return true;
    }
    const cloudBook = await syncLocalAssets(book, cloudProjectIdRef.current);
    if (!cloudBook) {
      setStatus("offline");
      return true;
    }
    const result = await saveCloudSnapshot(
      cloudProjectIdRef.current,
      book.meta.title,
      cloudBook,
      cloudRevisionRef.current,
    );
    if (result.kind === "ok") {
      cloudRevisionRef.current = result.revision;
      if (cloudBook !== book) setBookState(cloudBook);
      setStatus("saved");
      return true;
    }
    if (result.kind === "conflict") setStatus("conflict");
    else if (result.kind === "unauthorized" || result.kind === "unavailable") setStatus("offline");
    else setStatus("error");
    return true;
  }, [book, cloudReady, projectId]);

  useEffect(() => {
    const refresh = () => refreshAssets((value) => value + 1);
    window.addEventListener("kallistis-asset-ready", refresh);
    return () => window.removeEventListener("kallistis-asset-ready", refresh);
  }, []);

  /* Estado inicial: projeto editorial versionado; se existir projeto local, ele tem precedência.
     O production plan segue a mesma hierarquia: localStorage primeiro, depois
     sidecar versionável em /projects/kallistis-production-plan.json (fetch
     assíncrono, sem bloquear a hidratação do livro). */
  useEffect(() => {
    const local = loadLocalBook(initialProjectIdRef.current);
    const nextBook = local && local.pages.length > 0 ? local : INITIAL_BOOK;
    void migrateLegacyAssets(nextBook, initialProjectIdRef.current).then((migrated) => {
      if (migrated !== nextBook || (local && local.pages.length > 0)) {
        setBook(migrated);
        setSelectedPageId(migrated.pages[0]!.id);
      }
      setHydrated(true);
    });
    const planLocal = loadLocalProductionPlan(productionPlanForBookId(nextBook));
    const seedBookId = productionPlanForBookId(nextBook);
    if (planLocal) {
      setProductionPlanState(planLocal);
    } else {
      fetch("/projects/kallistis-production-plan.json", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((raw) => {
          if (!raw || typeof raw !== "object") return;
          const seeded = normalizeProductionPlan(raw, seedBookId);
          setProductionPlanState(seeded);
        })
        .catch(() => {
          /* sem sidecar disponível: mantém defaults vazios */
        });
    }
    void loadCloudProject(cloudProjectIdRef.current).then((remote) => {
      if (remote.kind === "ok") {
        cloudRevisionRef.current = remote.revision;
        if (!local && remote.snapshot) {
          try {
            const normalized = normalizeBook(remote.snapshot);
            void migrateLegacyAssets(normalized, initialProjectIdRef.current).then((migrated) => {
              skipCloudSaveRef.current = true;
              setBook(migrated);
              setSelectedPageId(migrated.pages[0]!.id);
            });
          } catch {
            /* uma revisão remota inválida não substitui o fallback local */
          }
        }
      }
      cloudReadyRef.current = true;
      setCloudReady(true);
    });
  }, [setBook]);

  /* A hidratação inicial não deve ocupar o histórico editorial. */
  useEffect(() => {
    if (cloudReady) historyRef.current = { past: [], future: [] };
  }, [cloudReady]);

  const undo = useCallback(() => {
    setBookState((current) => {
      const previous = historyRef.current.past.pop();
      if (!previous) return current;
      historyRef.current.future.unshift(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setBookState((current) => {
      const next = historyRef.current.future.shift();
      if (!next) return current;
      historyRef.current.past.push(current);
      return next;
    });
  }, []);

  /* Preferências de avisos de ritmo: locais, do editor, não do livro. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RHYTHM_CONFIG_KEY);
      if (raw) setRhythmConfig({ ...DEFAULT_RHYTHM_CONFIG, ...JSON.parse(raw) });
    } catch {
      /* configuração inválida: mantém os padrões */
    }
  }, []);

  const setRhythmRule = useCallback((rule: RhythmRuleId, patch: Partial<RhythmRuleConfig>) => {
    setRhythmConfig((prev) => {
      const next = { ...prev, [rule]: { ...prev[rule], ...patch } };
      try {
        window.localStorage.setItem(RHYTHM_CONFIG_KEY, JSON.stringify(next));
      } catch {
        /* sem persistência disponível */
      }
      return next;
    });
  }, []);

  /* Autosave local discreto. */
  useEffect(() => {
    if (!hydrated) return;
    setStatus("saving");
    const timer = window.setTimeout(() => {
      setStatus(saveLocalBook(book, projectId) ? "saved" : "error");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [book, hydrated, projectId]);

  /* Cloud autosave: debounce longo, independente do autosave local. O servidor
     rejeita revisões concorrentes; nunca sobrescrevemos outra máquina às cegas. */
  useEffect(() => {
    if (!hydrated || !cloudReady) return;
    if (skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setStatus("saving");
        const cloudBook = await syncLocalAssets(book, cloudProjectIdRef.current);
        if (!cloudBook) {
          setStatus("offline");
          return;
        }
        const result = await saveCloudSnapshot(
          cloudProjectIdRef.current,
          book.meta.title,
          cloudBook,
          cloudRevisionRef.current,
        );
        if (result.kind === "ok") {
          cloudRevisionRef.current = result.revision;
          if (cloudBook !== book) setBookState(cloudBook);
          setStatus("saved");
        } else if (result.kind === "conflict") {
          setStatus("conflict");
        } else if (result.kind === "unauthorized" || result.kind === "unavailable") {
          setStatus("offline");
        } else {
          setStatus("error");
        }
      })();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [book, cloudReady, hydrated]);

  /* Autosave do production plan, mesmo padrão discreto de 400 ms. */
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveLocalProductionPlan(productionPlan);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [productionPlan, hydrated]);

  /* Mapeamento id → bytes disponível para o renderizador antes de pintar. */
  registerBookAssets(book.assets);

  const selectedPageIndex = Math.max(
    0,
    book.pages.findIndex((page) => page.id === selectedPageId),
  );
  const selectedPage = book.pages[selectedPageIndex] ?? book.pages[0]!;
  const selectedBlock = selectedPage.blocks.find((b) => b.id === selectedBlockId) ?? null;
  const selectedPageGuide: PageGuide = productionPlan.pages[selectedPage.id] ?? emptyPageGuide();

  const selectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedBlockId(null);
  }, []);

  const bookFingerprint = useMemo(() => fingerprint(book), [book]);
  const measuredValid = measured?.fingerprint === bookFingerprint;

  /* Métricas determinísticas: dependem só do JSON do livro. */
  const rhythm = useMemo(() => bookRhythm(book, (index) => folioFor(book, index)), [book]);
  const rhythmWarningList = useMemo(
    () => computeRhythmWarnings(book, rhythm, rhythmConfig),
    [book, rhythm, rhythmConfig],
  );

  /**
   * Relatório vivo: as regras estáticas acompanham a edição em tempo real;
   * as medições de layout só valem para o livro exato em que foram tiradas.
   */
  const preflight = useMemo(
    () =>
      buildReport(book, measuredValid ? measured!.issues : [], {
        measured: Boolean(measuredValid),
      }),
    [book, measured, measuredValid],
  );

  const focusIssue = useCallback((issue: PreflightIssue) => {
    if (issue.pageId) setSelectedPageId(issue.pageId);
    setSelectedBlockId(issue.blockId ?? null);
  }, []);

  const value = useMemo<EditorContextValue>(() => {
    return {
      book,
      selectedPageId: selectedPage.id,
      selectedBlockId,
      view,
      zoom,
      frameToolActive,
      overlays,
      status,
      overflowPages,
      selectedPage,
      selectedPageIndex,
      selectedBlock,
      preflight,
      preflightRunning,
      preflightOpen,
      preflightStale: !measuredValid,
      rhythm,
      rhythmWarnings: rhythmWarningList,
      rhythmConfig,
      showRhythmStrip,
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
      undo,
      redo,
      snapGrid,
      toggleSnapGrid: () => setSnapGrid((current) => !current),
      productionPlan,
      selectedPageGuide,
      setRhythmRule,
      toggleRhythmStrip: () => setShowRhythmStrip((prev) => !prev),
      setView,
      setZoom,
      setFrameToolActive,
      toggleOverlay: (key) => setOverlays((prev) => ({ ...prev, [key]: !prev[key] })),
      selectPage,
      selectBlock: setSelectedBlockId,
      reportOverflow: (pageId, overflowing) =>
        setOverflowPages((prev) =>
          prev[pageId] === overflowing ? prev : { ...prev, [pageId]: overflowing },
        ),
      updatePage: (pageId, patch) =>
        setBook((prev) => withPage(prev, pageId, (page) => ({ ...page, ...patch }))),
      updatePageSettings: (pageId, patch) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            settings: { ...page.settings, ...patch },
          })),
        ),
      clearPage: (pageId) =>
        (() => {
          setBook((prev) =>
            withPage(prev, pageId, (page) => ({
              ...page,
              blocks: [],
              title: undefined,
              subtitle: undefined,
              eyebrow: undefined,
              settings: { ...page.settings, header: false, footer: false, pageNumber: false },
            })),
          );
          if (pageId === selectedPageId) setSelectedBlockId(null);
        })(),
      togglePageFixed: (pageId) =>
        setBook((prev) => withPage(prev, pageId, (page) => ({ ...page, fixed: !page.fixed }))),
      setTemplate: (pageId, template) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => {
            const definition = TEMPLATES[template];
            const variant = definition.variants.includes(page.variant ?? "default")
              ? page.variant
              : definition.variants[0];
            /* Conteúdo nunca é apagado ao trocar template. */
            return {
              ...page,
              template,
              variant,
              ...(template === "cover" && page.template !== "cover" && !page.coverMode
                ? { coverMode: "overlay" as const }
                : {}),
            };
          }),
        ),
      updateBlock: (pageId, blockId, patch) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === blockId && !block.locked ? ({ ...block, ...patch } as Block) : block,
            ),
          })),
        ),
      updateTable: (pageId, blockId, transform) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === blockId && block.type === "table"
                ? transform(normalizeTableBlock(block))
                : block,
            ),
          })),
        ),
      splitTable: (pageId, blockId, afterRowIndex) => {
        const continuationPageId = nextId("page");
        setBook((prev) => {
          const pageIndex = prev.pages.findIndex((page) => page.id === pageId);
          const source = prev.pages[pageIndex];
          const sourceBlock = source?.blocks.find((block) => block.id === blockId);
          if (!source || !sourceBlock || sourceBlock.type !== "table") return prev;
          const { first, continuation } = splitTableBlock(
            normalizeTableBlock(sourceBlock),
            afterRowIndex,
          );
          const continuationPage: Page = {
            ...source,
            id: continuationPageId,
            title: source.title ? `${source.title} — continuação` : "Continuação de tabela",
            blocks: [continuation],
          };
          const pages = prev.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  blocks: page.blocks.map((block) => (block.id === blockId ? first : block)),
                }
              : page,
          );
          pages.splice(pageIndex + 1, 0, continuationPage);
          const nodes = prev.nodes.map((node) =>
            node.pageIds.includes(pageId)
              ? {
                  ...node,
                  pageIds: node.pageIds.flatMap((id) =>
                    id === pageId ? [id, continuationPageId] : [id],
                  ),
                }
              : node,
          );
          return { ...prev, pages, nodes };
        });
        setSelectedPageId(continuationPageId);
        setSelectedBlockId(null);
      },
      duplicateTable: (pageId, blockId) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => {
            const index = page.blocks.findIndex((block) => block.id === blockId);
            const source = page.blocks[index];
            if (!source || source.type !== "table") return page;
            const cloneId = nextId("table");
            const sourceTable = normalizeTableBlock(source);
            const clone = {
              ...sourceTable,
              id: cloneId,
              columns: sourceTable.columns.map((column, columnIndex) => ({
                ...column,
                id: `${cloneId}-col-${columnIndex + 1}`,
              })),
              rows: sourceTable.rows.map((row, rowIndex) => ({
                ...row,
                id: `${cloneId}-row-${rowIndex + 1}`,
                cells: row.cells.map((cell, cellIndex) => ({
                  ...cell,
                  id: `${cloneId}-cell-${rowIndex + 1}-${cellIndex + 1}`,
                })),
              })),
            };
            const blocks = [...page.blocks];
            blocks.splice(index + 1, 0, clone);
            return { ...page, blocks };
          }),
        ),
      duplicateBlock: (pageId, blockId) => {
        const page = book.pages.find((item) => item.id === pageId);
        const index = page?.blocks.findIndex((block) => block.id === blockId) ?? -1;
        const source = index >= 0 ? page?.blocks[index] : undefined;
        if (!page || !source) return;
        const clone = cloneBlockForInsert(source, index + 1);
        setBook((prev) =>
          withPage(prev, pageId, (current) => {
            const blocks = [...current.blocks];
            blocks.splice(index + 1, 0, clone);
            return { ...current, blocks };
          }),
        );
        setSelectedPageId(pageId);
        setSelectedBlockId(clone.id);
      },
      saveTablePreset: (name, style) =>
        setBook((prev) => ({
          ...prev,
          tableStyles: [
            ...(prev.tableStyles ?? []).filter((preset) => preset.name !== name),
            { id: `custom-${Date.now().toString(36)}`, name, style },
          ],
        })),
      addBlock: (pageId, block) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({ ...page, blocks: [...page.blocks, block] })),
        ),
      removeBlock: (pageId, blockId) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.filter((block) => block.id !== blockId || block.locked),
          })),
        ),
      moveBlock: (pageId, blockId, direction) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => {
            const index = page.blocks.findIndex((b) => b.id === blockId);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= page.blocks.length) return page;
            const blocks = [...page.blocks];
            const [moved] = blocks.splice(index, 1);
            blocks.splice(target, 0, moved!);
            return { ...page, blocks };
          }),
        ),
      moveBlockToIndex: (pageId, blockId, index) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => {
            const from = page.blocks.findIndex((block) => block.id === blockId);
            if (from < 0) return page;
            const blocks = [...page.blocks];
            const [block] = blocks.splice(from, 1);
            blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, block!);
            return { ...page, blocks };
          }),
        ),
      toggleBlockHidden: (pageId, blockId) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === blockId ? { ...block, hidden: !block.hidden } : block,
            ),
          })),
        ),
      toggleBlockLocked: (pageId, blockId) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === blockId ? { ...block, locked: !block.locked } : block,
            ),
          })),
        ),
      addPage: (afterPageId, template = "narrative") =>
        (() => {
          const reference = book.pages[book.pages.findIndex((page) => page.id === afterPageId)];
          const page = createEmptyPage(template, reference);
          setBook((prev) => {
            const index = prev.pages.findIndex((page) => page.id === afterPageId);
            const pages = [...prev.pages];
            pages.splice(index + 1, 0, page);
            const nodes = prev.nodes.map((node) =>
              node.pageIds.includes(afterPageId)
                ? {
                    ...node,
                    pageIds: node.pageIds.flatMap((id) =>
                      id === afterPageId ? [id, page.id] : [id],
                    ),
                  }
                : node,
            );
            return { ...prev, pages, nodes };
          });
          setSelectedPageId(page.id);
        })(),
      duplicatePage: (pageId) =>
        setBook((prev) => {
          const index = prev.pages.findIndex((page) => page.id === pageId);
          const source = prev.pages[index];
          if (!source) return prev;
          const clone: Page = {
            ...source,
            id: nextId("page"),
            blocks: source.blocks.map((block) => ({ ...block, id: nextId("b") })),
          };
          const pages = [...prev.pages];
          pages.splice(index + 1, 0, clone);
          return { ...prev, pages, nodes: replacePageIdInNodes(prev, pageId, [pageId, clone.id]) };
        }),
      deletePage: (pageId) =>
        setBook((prev) => {
          if (prev.pages.length <= 1) return prev;
          return {
            ...prev,
            pages: prev.pages.filter((page) => page.id !== pageId),
            nodes: prev.nodes.map((node) => ({
              ...node,
              pageIds: node.pageIds.filter((id) => id !== pageId),
            })),
          };
        }),
      movePage: (pageId, toIndex) =>
        setBook((prev) => {
          const from = prev.pages.findIndex((page) => page.id === pageId);
          if (from < 0 || toIndex < 0 || toIndex >= prev.pages.length) return prev;
          const pages = [...prev.pages];
          const [moved] = pages.splice(from, 1);
          pages.splice(toIndex, 0, moved!);
          return { ...prev, pages };
        }),
      setTokens: (patch) => setBook((prev) => ({ ...prev, tokens: { ...prev.tokens, ...patch } })),
      setMeta: (patch) => setBook((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } })),
      addAssets: (assets) =>
        setBook((prev) => ({ ...prev, assets: [...(prev.assets ?? []), ...assets] })),
      addFont: (font) =>
        setBook((prev) => ({
          ...prev,
          fonts: [...(prev.fonts ?? []).filter((item) => item.id !== font.id), font],
        })),
      removeFont: (fontId) =>
        setBook((prev) => ({
          ...prev,
          fonts: (prev.fonts ?? []).filter((font) => font.id !== fontId),
        })),
      updateAsset: (assetId, patch) =>
        setBook((prev) => ({
          ...prev,
          assets: (prev.assets ?? []).map((asset) =>
            asset.id === assetId ? { ...asset, ...patch } : asset,
          ),
        })),
      /* Remover asset não apaga blocos: o aviso editorial sinaliza o id órfão. */
      removeAsset: (assetId) => {
        const asset = book.assets?.find((item) => item.id === assetId);
        const localKey =
          asset?.storage?.kind === "local"
            ? asset.storage.key
            : asset?.storage?.kind === "r2"
              ? asset.storage.localKey
              : undefined;
        if (localKey) void deleteAssetBlob(localKey).catch(() => undefined);
        setBook((prev) => ({
          ...prev,
          assets: (prev.assets ?? []).filter((item) => item.id !== assetId),
        }));
      },
      assetUsage: (assetId) => {
        const ref = assetRef(assetId);
        return book.pages.reduce(
          (total, page) =>
            total +
            page.blocks.filter(
              (block) => (block.type === "image" || block.type === "lockup") && block.src === ref,
            ).length,
          0,
        );
      },
      openPreflight: () => setPreflightOpen(true),
      closePreflight: () => setPreflightOpen(false),
      runPreflight: () => {
        setPreflightOpen(true);
        setPreflightRunning(true);
      },
      completePreflight: (issues) => {
        setMeasured({ fingerprint: bookFingerprint, issues });
        setPreflightRunning(false);
      },
      issuesForPage: (pageId) => preflight.issues.filter((issue) => issue.pageId === pageId),
      focusIssue,
      updatePageGuide: (pageId, patch) => {
        setProductionPlanState((prev) => {
          const current = prev.pages[pageId] ?? emptyPageGuide();
          const merged: PageGuide = {
            ...current,
            ...patch,
            review: patch.review ? { ...current.review, ...patch.review } : current.review,
          };
          return { ...prev, pages: { ...prev.pages, [pageId]: merged } };
        });
      },
      resetProductionPlan: () => {
        setProductionPlanState({
          version: 1,
          bookId: productionPlanForBookId(book),
          pages: {},
        });
      },
      replaceBook: (next) => {
        const normalized = normalizeBook(next);
        setBook(normalized);
        setSelectedPageId(normalized.pages[0]!.id);
        setSelectedBlockId(null);
      },
      projectId,
      switchLocalProject: (nextProjectId, nextBook) => {
        const normalized = normalizeBook(nextBook);
        setActiveLocalProjectId(nextProjectId);
        setProjectId(nextProjectId);
        setBook(normalized);
        setSelectedPageId(normalized.pages[0]!.id);
        setSelectedBlockId(null);
        historyRef.current = { past: [], future: [] };
      },
      insertPage: (sourcePage) => {
        const clone: Page = {
          ...sourcePage,
          id: nextId("page"),
          blocks: sourcePage.blocks.map((block, index) => cloneBlockForInsert(block, index)),
        };
        setBook((prev) => {
          const index = prev.pages.findIndex((page) => page.id === selectedPageId);
          const insertAt = index < 0 ? prev.pages.length : index + 1;
          const pages = [...prev.pages];
          pages.splice(insertAt, 0, clone);
          return { ...prev, pages };
        });
        setSelectedPageId(clone.id);
        setSelectedBlockId(null);
      },
      resetToDemo: () => {
        const normalized = normalizeBook(demoBook);
        setBook(normalized);
        setSelectedPageId(normalized.pages[0]!.id);
        setSelectedBlockId(null);
      },
      saveNow,
      saveRecipe: (recipe) =>
        setBook((prev) => ({
          ...prev,
          recipes: [
            ...(prev.recipes ?? []).filter((item) => item.name !== recipe.name),
            normalizeRecipe(recipe),
          ],
        })),
      createPageFromRecipe: (afterPageId, recipe) => {
        const normalized = normalizeRecipe(recipe);
        let createdPageIds: string[] = [];
        setBook((prev) => {
          const index = prev.pages.findIndex((page) => page.id === afterPageId);
          const reference = prev.pages[index] ?? prev.pages[prev.pages.length - 1];
          if (!reference) return prev;
          const spreadInstanceId =
            normalized.scope === "spread" ? nextId("spread-instance") : undefined;
          const blueprints =
            normalized.scope === "spread" && normalized.spread
              ? [normalized.spread.left, normalized.spread.right]
              : [
                  {
                    ...(normalized.template ? { template: normalized.template } : {}),
                    ...(normalized.variant ? { variant: normalized.variant } : {}),
                    ...(normalized.pageSettings ? { pageSettings: normalized.pageSettings } : {}),
                    structure: normalized.structure,
                    slots: normalized.slots,
                  },
                ];
          const pages = blueprints.map((blueprint, blueprintIndex) => {
            const template = blueprint.template ?? reference.template;
            const settings: PageSettings = {
              ...reference.settings,
              ...(blueprint.pageSettings ?? {}),
            };
            return {
              id: nextId("page"),
              template,
              ...(blueprint.variant ? { variant: blueprint.variant } : {}),
              part: reference.part,
              chapter: reference.chapter,
              title: blueprintIndex === 0 ? "Nova página" : "Nova página — direita",
              settings,
              blocks: materializeRecipeBlueprint(blueprint),
              recipeInstance: {
                recipeId: normalized.id,
                recipeVersion: normalized.version,
                ...(spreadInstanceId ? { spreadInstanceId } : {}),
              },
            } satisfies Page;
          });
          createdPageIds = pages.map((page) => page.id);
          const nextPages = [...prev.pages];
          nextPages.splice(index + 1, 0, ...pages);
          return {
            ...prev,
            pages: nextPages,
            nodes: replacePageIdInNodes(prev, afterPageId, [afterPageId, ...createdPageIds]),
          };
        });
        if (createdPageIds[0]) setSelectedPageId(createdPageIds[0]);
        setSelectedBlockId(null);
      },
      deleteRecipe: (recipeId) =>
        setBook((prev) => ({
          ...prev,
          recipes: (prev.recipes ?? []).filter((recipe) => recipe.id !== recipeId),
        })),
      insertRecipe: (pageId, recipe) => {
        const cloned = materializeRecipe(recipe);
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            template: recipe.template ?? page.template,
            blocks: [...page.blocks, ...cloned],
          })),
        );
        setSelectedPageId(pageId);
        setSelectedBlockId(cloned[0]?.id ?? null);
      },
      saveSheetTemplate: (sheet) => {
        const now = new Date().toISOString();
        const template: SheetTemplate = {
          id: sheet.templateId ?? `sheet-template-${Date.now().toString(36)}`,
          name: sheet.name,
          sheet: JSON.parse(
            JSON.stringify({ ...sheet, mode: "design", values: {} }),
          ) as SheetDocument,
          createdAt: now,
          updatedAt: now,
        };
        setBook((prev) => ({
          ...prev,
          sheetTemplates: [
            ...(prev.sheetTemplates ?? []).filter(
              (item) => item.id !== template.id && item.name !== template.name,
            ),
            template,
          ],
        }));
      },
      createSheetInstance: (templateId, values = {}) => {
        const instance: SheetInstance = {
          id: `sheet-instance-${Date.now().toString(36)}`,
          templateId,
          values: { ...values },
          createdAt: new Date().toISOString(),
        };
        setBook((prev) => ({
          ...prev,
          sheetInstances: [...(prev.sheetInstances ?? []), instance],
        }));
      },
    };
  }, [
    book,
    bookFingerprint,
    focusIssue,
    measuredValid,
    overflowPages,
    overlays,
    preflight,
    preflightOpen,
    preflightRunning,
    rhythm,
    rhythmConfig,
    rhythmWarningList,
    setRhythmRule,
    showRhythmStrip,
    selectPage,
    selectedBlock,
    selectedBlockId,
    selectedPage,
    selectedPageId,
    selectedPageGuide,
    selectedPageIndex,
    setBook,
    status,
    snapGrid,
    undo,
    redo,
    view,
    zoom,
    productionPlan,
    projectId,
    frameToolActive,
  ]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor deve ser usado dentro de EditorProvider");
  return context;
}

export { nextId };
