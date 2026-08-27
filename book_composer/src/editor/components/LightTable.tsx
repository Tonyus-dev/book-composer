import { useMemo, useState } from "react";
import {
  RHYTHM_CLASS_COLORS,
  RHYTHM_CLASS_LABELS,
  type PageRhythm,
  type RhythmClass,
} from "../../lib/rhythm/metrics";
import { RHYTHM_RULES, type RhythmRuleId } from "../../lib/rhythm/warnings";
import { TEMPLATE_LABELS } from "../../book/types";
import { useEditor, type ViewMode } from "../state/store";
import { PageThumbnail } from "./PageThumbnail";
import { RhythmStrip } from "./RhythmStrip";

type FilterId = "all" | RhythmClass | "warnings";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "narrative", label: "Narrativa" },
  { id: "rules", label: "Regras" },
  { id: "profile", label: "Perfis" },
  { id: "table", label: "Tabelas" },
  { id: "art", label: "Arte" },
  { id: "map", label: "Mapas" },
  { id: "warnings", label: "Avisos" },
];

/**
 * MESA DE LUZ — visão editorial global do livro.
 * Serve para ler RITMO, densidade, repetição e distribuição de arte ao longo
 * de centenas de páginas. Nada aqui recompõe o livro: só informa o editor.
 */
export function LightTable() {
  const {
    book,
    selectedPage,
    selectPage,
    setView,
    rhythm,
    rhythmWarnings,
    rhythmConfig,
    setRhythmRule,
    issuesForPage,
    showRhythmStrip,
    toggleRhythmStrip,
  } = useEditor();

  const [filter, setFilter] = useState<FilterId>("all");
  const [onlyPreflight, setOnlyPreflight] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rhythmById = useMemo(() => new Map(rhythm.map((entry) => [entry.pageId, entry])), [rhythm]);

  const warningsByPage = useMemo(() => {
    const map = new Map<string, RhythmRuleId[]>();
    for (const warning of rhythmWarnings) {
      for (const pageId of warning.pageIds) {
        map.set(pageId, [...(map.get(pageId) ?? []), warning.rule]);
      }
    }
    return map;
  }, [rhythmWarnings]);

  const matches = (pageId: string) => {
    const entry = rhythmById.get(pageId);
    if (!entry) return false;
    if (onlyPreflight && issuesForPage(pageId).length === 0) return false;
    if (filter === "all") return true;
    if (filter === "warnings") return warningsByPage.has(pageId);
    return entry.rhythmClass === filter;
  };

  /** Páginas agrupadas por nó (Partes, Capítulos, Apêndices) e depois em spreads. */
  const sections = useMemo(() => {
    const assigned = new Set<string>();
    const groups = book.nodes.map((node) => {
      const entries = node.pageIds
        .map((id) => rhythmById.get(id))
        .filter((entry): entry is PageRhythm => Boolean(entry));
      entries.forEach((entry) => assigned.add(entry.pageId));
      return { id: node.id, label: node.label, kind: node.kind, entries };
    });
    const loose = rhythm.filter((entry) => !assigned.has(entry.pageId));
    if (loose.length) {
      groups.push({ id: "loose", label: "Sem seção", kind: "front" as const, entries: loose });
    }
    return groups;
  }, [book.nodes, rhythm, rhythmById]);

  const open = (pageId: string, mode: ViewMode) => {
    selectPage(pageId);
    setView(mode);
  };

  const warnedPageIds = useMemo(() => new Set(warningsByPage.keys()), [warningsByPage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showRhythmStrip ? (
        <RhythmStrip
          rhythm={rhythm}
          selectedPageId={selectedPage.id}
          warnedPageIds={warnedPageIds}
          onSelect={(pageId) => selectPage(pageId)}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
              className={`border px-2 py-1 text-[11px] ${
                filter === entry.id
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyPreflight}
            onChange={(event) => setOnlyPreflight(event.target.checked)}
          />
          Só páginas com preflight
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={showRhythmStrip} onChange={toggleRhythmStrip} />
          Faixa de ritmo
        </label>

        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">
            {rhythmWarnings.length} avisos de ritmo{" "}
            <span className="text-[10px]">(nunca bloqueiam a exportação)</span>
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="border border-border px-2 py-1 hover:bg-accent"
          >
            {settingsOpen ? "Fechar regras" : "Regras de ritmo"}
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <div className="max-h-[34%] overflow-auto border-b border-border bg-card px-3 py-2">
          <p className="mb-2 text-[10px] text-muted-foreground">
            Avisos de ritmo são estéticos: informam o editor, não corrigem nem bloqueiam nada.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.values(RHYTHM_RULES).map((rule) => {
              const config = rhythmConfig[rule.id];
              return (
                <div key={rule.id} className="border border-border px-2 py-1.5">
                  <label className="flex items-start gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) =>
                        setRhythmRule(rule.id, { enabled: event.target.checked })
                      }
                    />
                    <span>
                      <span className="text-foreground">{rule.label}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {rule.question}
                      </span>
                    </span>
                  </label>
                  {rule.threshold ? (
                    <label className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <input
                        type="range"
                        min={rule.threshold.min}
                        max={rule.threshold.max}
                        step={rule.threshold.step}
                        value={config.threshold}
                        disabled={!config.enabled}
                        onChange={(event) =>
                          setRhythmRule(rule.id, { threshold: Number(event.target.value) })
                        }
                        className="flex-1"
                      />
                      <span className="tabular-nums">
                        {config.threshold} {rule.threshold.label}
                      </span>
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-muted/20 px-4 py-4">
        {sections.map((section) => {
          const visible = section.entries.filter((entry) => matches(entry.pageId));
          if (visible.length === 0) return null;
          /* Spreads: página par à esquerda, ímpar à direita. */
          const spreads: PageRhythm[][] = [];
          for (const entry of visible) {
            const last = spreads[spreads.length - 1];
            if (last && last.length === 1 && last[0]!.folio % 2 === 0 && entry.folio % 2 === 1) {
              last.push(entry);
            } else {
              spreads.push([entry]);
            }
          }

          return (
            <section key={section.id} className="mb-6">
              <header className="mb-2 flex items-baseline gap-2 border-b border-border pb-1">
                <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {section.kind === "part"
                    ? "Parte"
                    : section.kind === "chapter"
                      ? "Capítulo"
                      : section.kind === "appendix"
                        ? "Apêndice"
                        : "Pré-textual"}
                </span>
                <h2 className="text-[13px] text-foreground">{section.label}</h2>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {visible.length} pág
                </span>
              </header>

              <div className="flex flex-wrap gap-x-5 gap-y-4">
                {spreads.map((spread) => (
                  <div
                    key={spread[0]!.pageId}
                    className="flex items-start gap-[2px] border border-transparent"
                  >
                    {spread[0]!.folio % 2 === 1 && spread.length === 1 ? (
                      <div className="w-[92px]" aria-hidden="true" />
                    ) : null}
                    {spread.map((entry) => (
                      <LightTableCard
                        key={entry.pageId}
                        entry={entry}
                        active={entry.pageId === selectedPage.id}
                        warnings={warningsByPage.get(entry.pageId) ?? []}
                        preflight={issuesForPage(entry.pageId).length}
                        onOpen={open}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LightTableCard({
  entry,
  active,
  warnings,
  preflight,
  onOpen,
}: {
  entry: PageRhythm;
  active: boolean;
  warnings: RhythmRuleId[];
  preflight: number;
  onOpen: (pageId: string, mode: ViewMode) => void;
}) {
  const { book } = useEditor();
  const page = book.pages[entry.index]!;
  const hasWarning = warnings.length > 0 || preflight > 0;

  return (
    <div className="w-[92px]">
      <button
        type="button"
        onClick={() => onOpen(entry.pageId, "page")}
        onDoubleClick={() => onOpen(entry.pageId, "spread")}
        title={warnings.map((rule) => RHYTHM_RULES[rule].label).join(" · ") || undefined}
        className={`relative block w-full border ${
          active ? "border-primary" : "border-border hover:border-foreground/40"
        }`}
      >
        <PageThumbnail book={book} page={page} index={entry.index} width={90} />
        {hasWarning ? (
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full"
            style={{
              background: preflight ? "var(--k-rhythm-preflight)" : "var(--k-rhythm-warning)",
            }}
            aria-label="Página com aviso"
          />
        ) : null}
        <span
          className="absolute inset-x-0 bottom-0 h-[3px]"
          style={{ background: RHYTHM_CLASS_COLORS[entry.rhythmClass] }}
        />
      </button>
      <div className="mt-1 leading-tight">
        <div className="flex items-baseline justify-between text-[9px] text-muted-foreground">
          <span className="tabular-nums">{entry.folio}</span>
          <span className="tracking-[0.1em] uppercase">{TEMPLATE_LABELS[entry.template]}</span>
        </div>
        <div className="truncate text-[9px] text-muted-foreground/80">
          {page.chapter ?? page.part ?? RHYTHM_CLASS_LABELS[entry.rhythmClass]}
        </div>
        <div className="text-[9px] text-muted-foreground/70 tabular-nums">
          txt {Math.round(entry.textDensity * 100)}% · art {entry.artCoverage}%
          {entry.images ? ` · ${entry.images}img` : ""}
          {entry.tables ? ` · ${entry.tables}tab` : ""}
          {entry.boxes ? ` · ${entry.boxes}box` : ""}
          {entry.quotes ? ` · ${entry.quotes}cit` : ""}
        </div>
      </div>
    </div>
  );
}
