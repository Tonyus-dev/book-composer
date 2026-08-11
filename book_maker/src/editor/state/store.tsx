import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Block,
  Book,
  BookAsset,
  BookTokens,
  Page,
  PageSettings,
  TemplateId,
} from "../../book/types";
import { TEMPLATES } from "../../book/templates";
import { demoBook } from "../../data/demo-book";
import { canonicalBook } from "../../data/canonical-book";
import { loadLocalBook, saveLocalBook } from "../../lib/persistence/local";
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
import { buildReport, fingerprint } from "../../lib/preflight/report";
import type { PreflightIssue, PreflightReport } from "../../lib/preflight/types";
import { folioFor } from "../../book/renderer/PageRenderer";
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
export type ZoomValue = 0.5 | 0.75 | 1 | "fit";

export interface Overlays {
  margins: boolean;
  bleed: boolean;
  safe: boolean;
  columns: boolean;
  baseline: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved";

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
  toggleOverlay: (key: keyof Overlays) => void;
  selectPage: (pageId: string) => void;
  selectBlock: (blockId: string | null) => void;
  reportOverflow: (pageId: string, overflowing: boolean) => void;
  updatePage: (pageId: string, patch: Partial<Omit<Page, "id">>) => void;
  updatePageSettings: (pageId: string, patch: Partial<PageSettings>) => void;
  setTemplate: (pageId: string, template: TemplateId) => void;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
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
  updateAsset: (assetId: string, patch: Partial<Omit<BookAsset, "id">>) => void;
  removeAsset: (assetId: string) => void;
  assetUsage: (assetId: string) => number;
  openPreflight: () => void;
  closePreflight: () => void;
  runPreflight: () => void;
  completePreflight: (issues: PreflightIssue[]) => void;
  issuesForPage: (pageId: string) => PreflightIssue[];
  focusIssue: (issue: PreflightIssue) => void;
  replaceBook: (book: Book) => void;
  resetToDemo: () => void;
  /* PRODUCTION PLAN — direção editorial por página, nunca entra no print. */
  productionPlan: ProductionPlan;
  selectedPageGuide: PageGuide;
  updatePageGuide: (pageId: string, patch: Partial<PageGuide>) => void;
  resetProductionPlan: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

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
  const [book, setBook] = useState<Book>(canonicalBook);
  const [hydrated, setHydrated] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>(canonicalBook.pages[0]!.id);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("page");
  const [zoom, setZoom] = useState<ZoomValue>("fit");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [overflowPages, setOverflowPages] = useState<Record<string, boolean>>({});
  const [measured, setMeasured] = useState<MeasuredSnapshot | null>(null);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [rhythmConfig, setRhythmConfig] = useState<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const [showRhythmStrip, setShowRhythmStrip] = useState(true);
  const [overlays, setOverlays] = useState<Overlays>({
    margins: true,
    bleed: false,
    safe: false,
    columns: false,
    baseline: false,
  });
  const [productionPlan, setProductionPlanState] = useState<ProductionPlan>(() => ({
    version: 1,
    bookId: productionPlanForBookId(canonicalBook),
    pages: {},
  }));

  /* Estado inicial: projeto editorial versionado; se existir projeto local, ele tem precedência.
     O production plan segue a mesma hierarquia: localStorage primeiro, depois
     sidecar versionável em /projects/kallistis-production-plan.json (fetch
     assíncrono, sem bloquear a hidratação do livro). */
  useEffect(() => {
    const local = loadLocalBook();
    const nextBook = local && local.pages.length > 0 ? local : canonicalBook;
    if (local && local.pages.length > 0) {
      setBook(local);
      setSelectedPageId(local.pages[0]!.id);
    }
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
    setHydrated(true);
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
      saveLocalBook(book);
      setStatus("saved");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [book, hydrated]);

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
      productionPlan,
      selectedPageGuide,
      setRhythmRule,
      toggleRhythmStrip: () => setShowRhythmStrip((prev) => !prev),
      setView,
      setZoom,
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
      setTemplate: (pageId, template) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => {
            const definition = TEMPLATES[template];
            const variant = definition.variants.includes(page.variant ?? "default")
              ? page.variant
              : definition.variants[0];
            /* Conteúdo nunca é apagado ao trocar template. */
            return { ...page, template, variant };
          }),
        ),
      updateBlock: (pageId, blockId, patch) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === blockId ? ({ ...block, ...patch } as Block) : block,
            ),
          })),
        ),
      addBlock: (pageId, block) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({ ...page, blocks: [...page.blocks, block] })),
        ),
      removeBlock: (pageId, blockId) =>
        setBook((prev) =>
          withPage(prev, pageId, (page) => ({
            ...page,
            blocks: page.blocks.filter((block) => block.id !== blockId),
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
      addPage: (afterPageId, template = "narrative") =>
        setBook((prev) => {
          const index = prev.pages.findIndex((page) => page.id === afterPageId);
          const reference = prev.pages[index];
          const page: Page = {
            id: nextId("page"),
            template,
            variant: TEMPLATES[template].variants[0],
            part: reference?.part,
            chapter: reference?.chapter,
            title: "Nova página",
            settings: {
              header: true,
              footer: false,
              pageNumber: true,
              columns: TEMPLATES[template].defaultColumns,
              background: "paper",
              fullBleed: false,
            },
            blocks: [],
          };
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
        }),
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
      updateAsset: (assetId, patch) =>
        setBook((prev) => ({
          ...prev,
          assets: (prev.assets ?? []).map((asset) =>
            asset.id === assetId ? { ...asset, ...patch } : asset,
          ),
        })),
      /* Remover asset não apaga blocos: o aviso editorial sinaliza o id órfão. */
      removeAsset: (assetId) =>
        setBook((prev) => ({
          ...prev,
          assets: (prev.assets ?? []).filter((asset) => asset.id !== assetId),
        })),
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
        setBook(next);
        setSelectedPageId(next.pages[0]!.id);
        setSelectedBlockId(null);
      },
      resetToDemo: () => {
        setBook(demoBook);
        setSelectedPageId(demoBook.pages[0]!.id);
        setSelectedBlockId(null);
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
    selectedPageGuide,
    selectedPageIndex,
    status,
    view,
    zoom,
    productionPlan,
  ]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor deve ser usado dentro de EditorProvider");
  return context;
}

export { nextId };
