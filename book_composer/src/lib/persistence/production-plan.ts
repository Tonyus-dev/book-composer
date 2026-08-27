import type { Book, ProductionPlanAssignment } from "../../book/types";

/**
 * PRODUCTION PLAN — direção editorial por página.
 *
 * Estado de UI, separado do Book. Nunca é consumido pelo renderer imprimível
 * (ver routes/print.tsx) nem pelos templates. Existe apenas para guiar a
 * fabricação página a página.
 */

export const GUIDE_STATUSES = ["draft", "production", "review", "approved"] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

export const REVIEW_STATES = ["pending", "warning", "approved"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export interface TextSourceRef {
  source: string;
  section: string;
  note: string;
}

export interface AssetRef {
  ref: string;
  role: string;
  instruction: string;
}

export interface PageGuide {
  status: GuideStatus;
  brief: string;
  textSources: TextSourceRef[];
  assets: AssetRef[];
  notes: string[];
  review: {
    text: ReviewState;
    art: ReviewState;
    layout: ReviewState;
  };
}

export interface ProductionPlan {
  version: 1;
  bookId: string;
  pages: Record<string, PageGuide>;
  profile?: "PUBLIC_BOOK" | "BOOKMAKER_CONTRACT" | "INTERNAL_PRODUCTION";
  targetBookPages?: number | null;
  generatedAt?: string;
  manifestPath?: string;
  assignments?: ProductionPlanAssignment[];
  unusedApprovedAssets?: Array<{ src: string; sha256?: string | null; label: string }>;
  pendingAssets?: Array<{
    src: string | null;
    sha256?: string | null;
    label: string;
    status: string;
  }>;
}

export const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: "Rascunho",
  production: "Em produção",
  review: "Em revisão",
  approved: "Aprovado",
};

export const REVIEW_LABEL: Record<ReviewState, string> = {
  pending: "⚪ Pendente",
  warning: "🟡 Revisar",
  approved: "🟢 Aprovado",
};

export const REVIEW_SHORT_LABEL: Record<ReviewState, string> = {
  pending: "⚪",
  warning: "🟡",
  approved: "🟢",
};

export function emptyReview() {
  return { text: "pending", art: "pending", layout: "pending" } as PageGuide["review"];
}

export function emptyPageGuide(): PageGuide {
  return {
    status: "draft",
    brief: "",
    textSources: [],
    assets: [],
    notes: [],
    review: emptyReview(),
  };
}

export function isGuideStatus(value: unknown): value is GuideStatus {
  return typeof value === "string" && (GUIDE_STATUSES as readonly string[]).includes(value);
}

export function isReviewState(value: unknown): value is ReviewState {
  return typeof value === "string" && (REVIEW_STATES as readonly string[]).includes(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => item !== null);
}

function normalizeTextSources(value: unknown): TextSourceRef[] {
  if (!Array.isArray(value)) return [];
  const out: TextSourceRef[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      const ref = item as Partial<TextSourceRef>;
      out.push({
        source: typeof ref.source === "string" ? ref.source : "",
        section: typeof ref.section === "string" ? ref.section : "",
        note: typeof ref.note === "string" ? ref.note : "",
      });
    }
  }
  return out;
}

function normalizeAssetRefs(value: unknown): AssetRef[] {
  if (!Array.isArray(value)) return [];
  const out: AssetRef[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      const ref = item as Partial<AssetRef>;
      out.push({
        ref: typeof ref.ref === "string" ? ref.ref : "",
        role: typeof ref.role === "string" ? ref.role : "",
        instruction: typeof ref.instruction === "string" ? ref.instruction : "",
      });
    }
  }
  return out;
}

function normalizeReview(value: unknown): PageGuide["review"] {
  const fallback = emptyReview();
  if (!value || typeof value !== "object") return fallback;
  const r = value as Partial<PageGuide["review"]>;
  return {
    text: isReviewState(r.text) ? r.text : fallback.text,
    art: isReviewState(r.art) ? r.art : fallback.art,
    layout: isReviewState(r.layout) ? r.layout : fallback.layout,
  };
}

function normalizePageGuide(value: unknown): PageGuide {
  const fallback = emptyPageGuide();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<PageGuide>;
  return {
    status: isGuideStatus(raw.status) ? raw.status : fallback.status,
    brief: typeof raw.brief === "string" ? raw.brief : "",
    textSources: normalizeTextSources(raw.textSources),
    assets: normalizeAssetRefs(raw.assets),
    notes: normalizeStringArray(raw.notes),
    review: normalizeReview(raw.review),
  };
}

export function normalizeProductionPlan(input: unknown, fallbackBookId: string): ProductionPlan {
  const fallback: ProductionPlan = { version: 1, bookId: fallbackBookId, pages: {} };
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<ProductionPlan>;
  const bookId = typeof raw.bookId === "string" && raw.bookId ? raw.bookId : fallbackBookId;
  const pages: Record<string, PageGuide> = {};
  if (raw.pages && typeof raw.pages === "object") {
    for (const [pageId, entry] of Object.entries(raw.pages)) {
      pages[pageId] = normalizePageGuide(entry);
    }
  }
  const profile =
    raw.profile === "PUBLIC_BOOK" ||
    raw.profile === "BOOKMAKER_CONTRACT" ||
    raw.profile === "INTERNAL_PRODUCTION"
      ? raw.profile
      : undefined;
  return {
    version: 1,
    bookId,
    pages,
    ...(profile ? { profile } : {}),
    ...(typeof raw.targetBookPages === "number" || raw.targetBookPages === null
      ? { targetBookPages: raw.targetBookPages }
      : {}),
    ...(typeof raw.generatedAt === "string" ? { generatedAt: raw.generatedAt } : {}),
    ...(typeof raw.manifestPath === "string" ? { manifestPath: raw.manifestPath } : {}),
    ...(Array.isArray(raw.assignments) ? { assignments: raw.assignments } : {}),
    ...(Array.isArray(raw.unusedApprovedAssets)
      ? { unusedApprovedAssets: raw.unusedApprovedAssets }
      : {}),
    ...(Array.isArray(raw.pendingAssets) ? { pendingAssets: raw.pendingAssets } : {}),
  };
}

const STORAGE_KEY = "kallistis.book-builder.production-plan.v1";

export function loadLocalProductionPlan(fallbackBookId: string): ProductionPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeProductionPlan(JSON.parse(raw), fallbackBookId);
  } catch (error) {
    console.warn("[kallistis] production plan local inválido, ignorando", error);
    return null;
  }
}

export function saveLocalProductionPlan(plan: ProductionPlan) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function clearLocalProductionPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function ensurePageEntry(plan: ProductionPlan, pageId: string): ProductionPlan {
  if (plan.pages[pageId]) return plan;
  return { ...plan, pages: { ...plan.pages, [pageId]: emptyPageGuide() } };
}

export function productionPlanForBookId(book: Book | { meta: { title?: string } }): string {
  const meta = book?.meta;
  if (meta && typeof meta === "object" && typeof meta.title === "string") {
    return meta.title;
  }
  return "kallistis-livro-basico";
}
