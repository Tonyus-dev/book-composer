/**
 * RHYTHM WARNINGS — avisos editoriais de ritmo.
 *
 * São estéticos por natureza: informam o editor e NUNCA bloqueiam a exportação.
 * Cada regra é configurável (ligar/desligar + limite).
 */
import type { Book, SectionNode } from "../../book/types";
import type { PageRhythm } from "./metrics";

export type RhythmRuleId =
  | "text-heavy-run"
  | "template-repetition"
  | "unusually-dense"
  | "nearly-empty"
  | "section-without-art"
  | "adjacent-full-art"
  | "profile-without-portrait"
  | "facing-imbalance";

export interface RhythmRuleMeta {
  id: RhythmRuleId;
  label: string;
  question: string;
  /** limite configurável; quando ausente a regra é apenas liga/desliga */
  threshold?: { label: string; min: number; max: number; step: number };
}

export const RHYTHM_RULES: Record<RhythmRuleId, RhythmRuleMeta> = {
  "text-heavy-run": {
    id: "text-heavy-run",
    label: "Sequência de páginas densas de texto",
    question: "Onde a leitura fica cansativa?",
    threshold: { label: "páginas seguidas", min: 3, max: 16, step: 1 },
  },
  "template-repetition": {
    id: "template-repetition",
    label: "Mesmo template repetido",
    question: "Há repetição excessiva de composição?",
    threshold: { label: "páginas seguidas", min: 3, max: 20, step: 1 },
  },
  "unusually-dense": {
    id: "unusually-dense",
    label: "Página excepcionalmente densa",
    question: "Alguma página está sobrecarregada?",
    threshold: { label: "% de ocupação de texto", min: 80, max: 160, step: 5 },
  },
  "nearly-empty": {
    id: "nearly-empty",
    label: "Página quase vazia sem ser abertura",
    question: "As aberturas realmente funcionam?",
    threshold: { label: "% de espaço branco", min: 60, max: 98, step: 2 },
  },
  "section-without-art": {
    id: "section-without-art",
    label: "Trecho longo sem interrupção visual",
    question: "Existe arte suficiente?",
    threshold: { label: "páginas sem arte", min: 4, max: 30, step: 1 },
  },
  "adjacent-full-art": {
    id: "adjacent-full-art",
    label: "Muitas páginas de arte cheia adjacentes",
    question: "A arte está concentrada demais?",
    threshold: { label: "páginas seguidas", min: 2, max: 8, step: 1 },
  },
  "profile-without-portrait": {
    id: "profile-without-portrait",
    label: "Seção de perfis sem retratos",
    question: "Povos e Ofícios recebem presença visual?",
  },
  "facing-imbalance": {
    id: "facing-imbalance",
    label: "Desequilíbrio extremo entre páginas de um spread",
    question: "O spread se lê como uma unidade?",
    threshold: { label: "diferença em pontos", min: 40, max: 100, step: 5 },
  },
};

export interface RhythmRuleConfig {
  enabled: boolean;
  threshold: number;
}

export type RhythmConfig = Record<RhythmRuleId, RhythmRuleConfig>;

export const DEFAULT_RHYTHM_CONFIG: RhythmConfig = {
  "text-heavy-run": { enabled: true, threshold: 6 },
  "template-repetition": { enabled: true, threshold: 5 },
  "unusually-dense": { enabled: true, threshold: 110 },
  "nearly-empty": { enabled: true, threshold: 82 },
  "section-without-art": { enabled: true, threshold: 10 },
  "adjacent-full-art": { enabled: true, threshold: 3 },
  "profile-without-portrait": { enabled: true, threshold: 0 },
  "facing-imbalance": { enabled: true, threshold: 65 },
};

export interface RhythmWarning {
  rule: RhythmRuleId;
  label: string;
  /** primeira página do trecho — usada para navegar */
  pageId: string;
  folio: number;
  /** todas as páginas envolvidas, para destacar na mesa de luz */
  pageIds: string[];
  description: string;
  suggestion: string;
}

const TEXT_CLASSES = new Set(["narrative", "rules", "table", "front"]);

function isTextHeavy(page: PageRhythm) {
  return TEXT_CLASSES.has(page.rhythmClass) && page.artCoverage < 12 && page.textDensity > 0.55;
}

/** Agrupa índices consecutivos que satisfazem um teste. */
function runs(pages: PageRhythm[], test: (page: PageRhythm) => boolean): PageRhythm[][] {
  const found: PageRhythm[][] = [];
  let current: PageRhythm[] = [];
  for (const page of pages) {
    if (test(page)) current.push(page);
    else {
      if (current.length) found.push(current);
      current = [];
    }
  }
  if (current.length) found.push(current);
  return found;
}

function warn(
  rule: RhythmRuleId,
  pages: PageRhythm[],
  description: string,
  suggestion: string,
): RhythmWarning {
  const first = pages[0]!;
  return {
    rule,
    label: RHYTHM_RULES[rule].label,
    pageId: first.pageId,
    folio: first.folio,
    pageIds: pages.map((page) => page.pageId),
    description,
    suggestion,
  };
}

function range(pages: PageRhythm[]) {
  const first = pages[0]!.folio;
  const last = pages[pages.length - 1]!.folio;
  return first === last ? `fólio ${first}` : `fólios ${first}–${last}`;
}

export function rhythmWarnings(
  book: Book,
  rhythm: PageRhythm[],
  config: RhythmConfig,
): RhythmWarning[] {
  const out: RhythmWarning[] = [];
  const byId = new Map(rhythm.map((page) => [page.pageId, page]));
  const on = (rule: RhythmRuleId) => config[rule]?.enabled ?? false;
  const limit = (rule: RhythmRuleId) =>
    config[rule]?.threshold ?? DEFAULT_RHYTHM_CONFIG[rule].threshold;

  if (on("text-heavy-run")) {
    for (const run of runs(rhythm, isTextHeavy)) {
      if (run.length >= limit("text-heavy-run")) {
        out.push(
          warn(
            "text-heavy-run",
            run,
            `${run.length} páginas seguidas de texto sem interrupção visual (${range(run)}).`,
            "Considere uma citação de página, uma ilustração ou um box de ambientação no meio do trecho.",
          ),
        );
      }
    }
  }

  if (on("template-repetition")) {
    let start = 0;
    for (let i = 1; i <= rhythm.length; i += 1) {
      const same = i < rhythm.length && rhythm[i]!.template === rhythm[start]!.template;
      if (!same) {
        const run = rhythm.slice(start, i);
        if (run.length >= limit("template-repetition")) {
          out.push(
            warn(
              "template-repetition",
              run,
              `Template "${run[0]!.template}" repetido em ${run.length} páginas seguidas (${range(run)}).`,
              "Alterne variantes de composição ou intercale outro template.",
            ),
          );
        }
        start = i;
      }
    }
  }

  if (on("unusually-dense")) {
    const threshold = limit("unusually-dense") / 100;
    for (const page of rhythm) {
      if (page.textDensity >= threshold) {
        out.push(
          warn(
            "unusually-dense",
            [page],
            `Ocupação de texto estimada em ${Math.round(page.textDensity * 100)}% da caixa útil.`,
            "Redistribua conteúdo ou verifique overflow no preflight.",
          ),
        );
      }
    }
  }

  if (on("nearly-empty")) {
    for (const page of rhythm) {
      if (page.blankSpace >= limit("nearly-empty") && !page.intentionalOpening) {
        out.push(
          warn(
            "nearly-empty",
            [page],
            `Cerca de ${page.blankSpace}% de espaço branco em página que não é abertura.`,
            "Complete a página, transforme em abertura ou remova-a da sequência.",
          ),
        );
      }
    }
  }

  if (on("section-without-art")) {
    for (const node of book.nodes) {
      const pages = node.pageIds
        .map((id) => byId.get(id))
        .filter((page): page is PageRhythm => Boolean(page));
      for (const run of runs(pages, (page) => page.artCoverage < 8 && page.images === 0)) {
        if (run.length >= limit("section-without-art")) {
          out.push(
            warn(
              "section-without-art",
              run,
              `"${node.label}": ${run.length} páginas sem qualquer arte (${range(run)}).`,
              "Distribua uma ilustração ou mapa dentro do trecho.",
            ),
          );
        }
      }
    }
  }

  if (on("adjacent-full-art")) {
    for (const run of runs(rhythm, (page) => page.fullArt)) {
      if (run.length >= limit("adjacent-full-art")) {
        out.push(
          warn(
            "adjacent-full-art",
            run,
            `${run.length} páginas de arte cheia adjacentes (${range(run)}).`,
            "Espalhe a arte pelo capítulo para sustentar o ritmo.",
          ),
        );
      }
    }
  }

  if (on("profile-without-portrait")) {
    for (const node of book.nodes) {
      const pages = node.pageIds
        .map((id) => byId.get(id))
        .filter((page): page is PageRhythm => Boolean(page));
      const profiles = pages.filter((page) => page.rhythmClass === "profile");
      const withoutPortrait = profiles.filter((page) => page.images === 0);
      if (profiles.length > 0 && withoutPortrait.length > 0) {
        out.push(
          warn(
            "profile-without-portrait",
            withoutPortrait,
            `"${node.label}": ${withoutPortrait.length} de ${profiles.length} perfis sem retrato.`,
            "Perfis de Povos e Ofícios pedem presença visual — insira o retrato.",
          ),
        );
      }
    }
  }

  if (on("facing-imbalance")) {
    const threshold = limit("facing-imbalance");
    for (const page of rhythm) {
      if (page.folio % 2 !== 0) continue;
      const recto = rhythm.find((candidate) => candidate.folio === page.folio + 1);
      if (!recto) continue;
      if (page.intentionalOpening || recto.intentionalOpening) continue;
      const weight = (entry: PageRhythm) =>
        Math.min(100, entry.textDensity * 100) * 0.6 + entry.artCoverage * 0.4;
      const delta = Math.abs(weight(page) - weight(recto));
      if (delta >= threshold) {
        out.push(
          warn(
            "facing-imbalance",
            [page, recto],
            `Spread ${page.folio}–${recto.folio} com diferença de ${Math.round(delta)} pontos de carga visual.`,
            "Equilibre texto e arte entre as duas páginas do spread.",
          ),
        );
      }
    }
  }

  return out;
}
