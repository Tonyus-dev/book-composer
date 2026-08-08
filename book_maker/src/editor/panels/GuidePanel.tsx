import { useCallback } from "react";
import {
  GUIDE_STATUSES,
  GUIDE_STATUS_LABEL,
  REVIEW_LABEL,
  REVIEW_STATES,
  type AssetRef,
  type GuideStatus,
  type PageGuide,
  type ReviewState,
  type TextSourceRef,
} from "../../lib/persistence/production-plan";
import { AreaField, PanelSection, SelectField, TextField } from "./fields";
import { useEditor } from "../state/store";

const STATUS_OPTIONS = GUIDE_STATUSES.map((value) => ({ value, label: GUIDE_STATUS_LABEL[value] }));

const REVIEW_OPTIONS = REVIEW_STATES.map((value) => ({ value, label: REVIEW_LABEL[value] }));

const REVIEW_AXES: { key: keyof PageGuide["review"]; label: string }[] = [
  { key: "text", label: "Texto" },
  { key: "art", label: "Arte" },
  { key: "layout", label: "Layout" },
];

/**
 * Painel GUIA — direção editorial por página.
 *
 * Estado de UI; nunca consumido por /print nem pelos templates.
 * Persistido em localStorage via EditorContext.
 */
export function GuidePanel() {
  const { selectedPage, selectedPageGuide, updatePageGuide } = useEditor();
  const pageId = selectedPage.id;

  const patchGuide = useCallback(
    (patch: Partial<PageGuide>) => {
      updatePageGuide(pageId, patch);
    },
    [pageId, updatePageGuide],
  );

  const setTextSource = (index: number, patch: Partial<TextSourceRef>) => {
    const next = selectedPageGuide.textSources.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    patchGuide({ textSources: next });
  };

  const addTextSource = () => {
    patchGuide({
      textSources: [...selectedPageGuide.textSources, { source: "", section: "", note: "" }],
    });
  };

  const removeTextSource = (index: number) => {
    patchGuide({
      textSources: selectedPageGuide.textSources.filter((_, i) => i !== index),
    });
  };

  const setAsset = (index: number, patch: Partial<AssetRef>) => {
    const next = selectedPageGuide.assets.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    patchGuide({ assets: next });
  };

  const addAsset = () => {
    patchGuide({ assets: [...selectedPageGuide.assets, { ref: "", role: "", instruction: "" }] });
  };

  const removeAsset = (index: number) => {
    patchGuide({ assets: selectedPageGuide.assets.filter((_, i) => i !== index) });
  };

  const setNote = (index: number, value: string) => {
    const next = selectedPageGuide.notes.map((note, i) => (i === index ? value : note));
    patchGuide({ notes: next });
  };

  const addNote = () => {
    patchGuide({ notes: [...selectedPageGuide.notes, ""] });
  };

  const removeNote = (index: number) => {
    patchGuide({ notes: selectedPageGuide.notes.filter((_, i) => i !== index) });
  };

  const setReviewAxis = (axis: keyof PageGuide["review"], value: ReviewState) => {
    patchGuide({ review: { ...selectedPageGuide.review, [axis]: value } });
  };

  const setStatus = (status: GuideStatus) => {
    patchGuide({ status });
  };

  const setBrief = (brief: string) => {
    patchGuide({ brief });
  };

  return (
    <div className="flex flex-col" data-testid="guide-panel">
      <PanelSection title="Identificação">
        <p className="text-[11px] text-muted-foreground">
          Página <span className="font-mono text-foreground">{pageId}</span> — direção editorial
          registrada localmente. Estes dados não entram em <span className="font-mono">/print</span> nem no PDF.
        </p>
      </PanelSection>

      <PanelSection title="Status">
        <SelectField
          label="Estado editorial"
          value={selectedPageGuide.status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
      </PanelSection>

      <PanelSection title="Brief / objetivo">
        <AreaField
          label="Direção da página"
          value={selectedPageGuide.brief}
          rows={6}
          onChange={setBrief}
        />
      </PanelSection>

      <PanelSection title="Fontes de texto">
        <ul className="space-y-3">
          {selectedPageGuide.textSources.map((entry, index) => (
            <li
              key={`text-source-${index}`}
              className="space-y-1 border border-border bg-input/30 p-2"
            >
              <TextField
                label="Fonte"
                value={entry.source}
                placeholder="ex. book.meta, work/romantizacao/...md"
                onChange={(value) => setTextSource(index, { source: value })}
              />
              <TextField
                label="Seção"
                value={entry.section}
                placeholder="ex. I, Apêndice A, página 4"
                onChange={(value) => setTextSource(index, { section: value })}
              />
              <TextField
                label="Observação"
                value={entry.note}
                onChange={(value) => setTextSource(index, { note: value })}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[10px] text-destructive hover:underline"
                  onClick={() => removeTextSource(index)}
                >
                  remover fonte
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 border border-border px-2 py-1 text-[11px] hover:bg-accent"
          onClick={addTextSource}
        >
          + adicionar fonte
        </button>
      </PanelSection>

      <PanelSection title="Assets">
        <ul className="space-y-3">
          {selectedPageGuide.assets.map((entry, index) => (
            <li
              key={`asset-${index}`}
              className="space-y-1 border border-border bg-input/30 p-2"
            >
              <TextField
                label="Ref / path"
                value={entry.ref}
                placeholder="ex. /assets/cover/capa-cristal.jpg"
                onChange={(value) => setAsset(index, { ref: value })}
              />
              <TextField
                label="Função"
                value={entry.role}
                placeholder="ex. capa full bleed, retrato, ornamento"
                onChange={(value) => setAsset(index, { role: value })}
              />
              <TextField
                label="Instrução"
                value={entry.instruction}
                onChange={(value) => setAsset(index, { instruction: value })}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[10px] text-destructive hover:underline"
                  onClick={() => removeAsset(index)}
                >
                  remover asset
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 border border-border px-2 py-1 text-[11px] hover:bg-accent"
          onClick={addAsset}
        >
          + adicionar asset
        </button>
      </PanelSection>

      <PanelSection title="Notas">
        <ul className="space-y-2">
          {selectedPageGuide.notes.map((note, index) => (
            <li key={`note-${index}`} className="space-y-1">
              <textarea
                className="w-full border border-border bg-input/40 px-2 py-1 text-xs text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring"
                rows={2}
                value={note}
                onChange={(event) => setNote(index, event.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[10px] text-destructive hover:underline"
                  onClick={() => removeNote(index)}
                >
                  remover nota
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 border border-border px-2 py-1 text-[11px] hover:bg-accent"
          onClick={addNote}
        >
          + adicionar nota
        </button>
      </PanelSection>

      <PanelSection title="Revisão">
        <ul className="space-y-2">
          {REVIEW_AXES.map((axis) => (
            <li key={axis.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">{axis.label}</span>
              <SelectField
                label=""
                value={selectedPageGuide.review[axis.key]}
                options={REVIEW_OPTIONS}
                onChange={(value) => setReviewAxis(axis.key, value)}
              />
            </li>
          ))}
        </ul>
      </PanelSection>
    </div>
  );
}
