import {
  RHYTHM_CLASS_COLORS,
  RHYTHM_CLASS_LABELS,
  type PageRhythm,
} from "../../lib/rhythm/metrics";

/**
 * BOOK RHYTHM STRIP — o livro inteiro em uma faixa.
 * Cada segmento é uma página e codifica APENAS o tipo de composição,
 * para que padrões (TEXTO TEXTO TEXTO … ou TEXTO PERFIL ARTE TABELA)
 * sejam reconhecíveis em segundos. É instrumento de análise, não ornamento.
 */
export function RhythmStrip({
  rhythm,
  selectedPageId,
  warnedPageIds,
  onSelect,
}: {
  rhythm: PageRhythm[];
  selectedPageId: string;
  warnedPageIds: Set<string>;
  onSelect: (pageId: string) => void;
}) {
  const classes = Array.from(new Set(rhythm.map((page) => page.rhythmClass)));

  return (
    <div className="border-b border-border bg-card/60 px-3 py-2">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Faixa de ritmo · {rhythm.length} páginas
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {classes.map((key) => (
            <span key={key} className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span
                className="inline-block h-2 w-2"
                style={{ background: RHYTHM_CLASS_COLORS[key] }}
              />
              {RHYTHM_CLASS_LABELS[key]}
            </span>
          ))}
        </span>
      </div>
      <div className="flex h-6 w-full items-stretch gap-[1px]">
        {rhythm.map((page) => (
          <button
            key={page.pageId}
            type="button"
            onClick={() => onSelect(page.pageId)}
            title={`Fólio ${page.folio} · ${RHYTHM_CLASS_LABELS[page.rhythmClass]} · texto ${Math.round(
              page.textDensity * 100,
            )}% · arte ${page.artCoverage}%`}
            aria-label={`Fólio ${page.folio}, ${RHYTHM_CLASS_LABELS[page.rhythmClass]}`}
            className="relative min-w-[3px] flex-1"
            style={{
              background: RHYTHM_CLASS_COLORS[page.rhythmClass],
              opacity: page.pageId === selectedPageId ? 1 : 0.72,
              outline: page.pageId === selectedPageId ? "1px solid var(--foreground)" : "none",
            }}
          >
            {warnedPageIds.has(page.pageId) ? (
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--k-rhythm-warning)]" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
