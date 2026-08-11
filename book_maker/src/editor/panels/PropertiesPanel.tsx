import { useState } from "react";
import type { Block, BookTokens, ImageBlock, PageVariant, TemplateId } from "../../book/types";
import { TEMPLATES, TEMPLATE_IDS } from "../../book/templates";
import { PREFLIGHT_RULES, SEVERITY_LABEL } from "../../lib/preflight/types";
import { useEditor } from "../state/store";
import { AreaField, PanelSection, RangeField, SelectField, TextField, ToggleField } from "./fields";
import { GuidePanel } from "./GuidePanel";

const TOKEN_FIELDS: { key: keyof BookTokens; label: string }[] = [
  { key: "pageWidth", label: "Largura" },
  { key: "pageHeight", label: "Altura" },
  { key: "bleed", label: "Sangria" },
  { key: "marginInner", label: "Margem interna" },
  { key: "marginOuter", label: "Margem externa" },
  { key: "marginTop", label: "Margem superior" },
  { key: "marginBottom", label: "Margem inferior" },
  { key: "columnGap", label: "Gutter" },
  { key: "bodySize", label: "Corpo narrativo" },
  { key: "bodyLeading", label: "Entrelinha narrativa" },
  { key: "rulesSize", label: "Corpo técnico" },
  { key: "rulesLeading", label: "Entrelinha técnica" },
  { key: "tableSize", label: "Tabelas" },
  { key: "h1Size", label: "H1" },
  { key: "h2Size", label: "H2" },
  { key: "h3Size", label: "H3" },
];

function BlockProperties({ block }: { block: Block }) {
  const { selectedPage, updateBlock, removeBlock, moveBlock } = useEditor();
  const patch = (values: Record<string, unknown>) => updateBlock(selectedPage.id, block.id, values);

  return (
    <>
      <PanelSection title={`Bloco · ${block.type}`}>
        <div className="mb-3 flex gap-1">
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            onClick={() => moveBlock(selectedPage.id, block.id, -1)}
          >
            ↑ subir
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
            onClick={() => moveBlock(selectedPage.id, block.id, 1)}
          >
            ↓ descer
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-[11px] text-destructive hover:bg-accent"
            onClick={() => removeBlock(selectedPage.id, block.id)}
          >
            excluir
          </button>
        </div>

        <SelectField
          label="Span"
          value={block.span ?? "column"}
          options={[
            { value: "column", label: "Coluna" },
            { value: "full", label: "Largura total" },
          ]}
          onChange={(value) => patch({ span: value })}
        />
        <TextField
          label="Espaço antes (mm)"
          value={String(block.spaceBefore ?? "")}
          onChange={(value) => patch({ spaceBefore: value ? Number(value) : undefined })}
        />
        <TextField
          label="Espaço depois (mm)"
          value={String(block.spaceAfter ?? "")}
          onChange={(value) => patch({ spaceAfter: value ? Number(value) : undefined })}
        />
      </PanelSection>

      {block.type === "text" ? (
        <PanelSection title="Texto">
          <SelectField
            label="Tipo semântico"
            value={block.role ?? "body"}
            options={[
              { value: "body", label: "Corpo" },
              { value: "lead", label: "Lead" },
              { value: "dialogue", label: "Diálogo" },
              { value: "credits", label: "Créditos" },
              { value: "note", label: "Nota" },
            ]}
            onChange={(value) => patch({ role: value })}
          />
          <ToggleField
            label="Capitular"
            checked={Boolean(block.dropCap)}
            onChange={(checked) => patch({ dropCap: checked })}
          />
          <SelectField
            label="Alinhamento"
            value={block.align ?? "justify"}
            options={[
              { value: "justify", label: "Justificado" },
              { value: "start", label: "Esquerda" },
              { value: "center", label: "Centro" },
              { value: "end", label: "Direita" },
            ]}
            onChange={(value) => patch({ align: value })}
          />
          <TextField
            label="Largura máxima"
            value={block.width ?? ""}
            placeholder="ex. 120mm"
            onChange={(value) => patch({ width: value || undefined })}
          />
          <AreaField
            label="Conteúdo (markdown simples)"
            value={block.content}
            rows={12}
            onChange={(value) => patch({ content: value })}
          />
        </PanelSection>
      ) : null}

      {block.type === "heading" ? (
        <PanelSection title="Título">
          <SelectField
            label="Nível"
            value={String(block.level) as "1" | "2" | "3"}
            options={[
              { value: "1", label: "H1" },
              { value: "2", label: "H2" },
              { value: "3", label: "H3" },
            ]}
            onChange={(value) => patch({ level: Number(value) })}
          />
          <TextField
            label="Texto"
            value={block.text}
            onChange={(value) => patch({ text: value })}
          />
          <TextField
            label="Sobretítulo"
            value={block.eyebrow ?? ""}
            onChange={(value) => patch({ eyebrow: value || undefined })}
          />
        </PanelSection>
      ) : null}

      {block.type === "image" ? <ImageProperties block={block} /> : null}

      {block.type === "quote" ? (
        <PanelSection title="Citação">
          <AreaField
            label="Texto"
            value={block.text}
            rows={4}
            onChange={(v) => patch({ text: v })}
          />
          <TextField
            label="Atribuição"
            value={block.attribution ?? ""}
            onChange={(value) => patch({ attribution: value || undefined })}
          />
          <SelectField
            label="Tamanho"
            value={block.size ?? "md"}
            options={[
              { value: "sm", label: "Pequena" },
              { value: "md", label: "Média" },
              { value: "lg", label: "Grande" },
            ]}
            onChange={(value) => patch({ size: value })}
          />
          <SelectField
            label="Variante"
            value={block.variant ?? "plain"}
            options={[
              { value: "plain", label: "Sem filete" },
              { value: "rule", label: "Com filetes" },
            ]}
            onChange={(value) => patch({ variant: value })}
          />
        </PanelSection>
      ) : null}

      {block.type === "box" ? (
        <PanelSection title="Box">
          <SelectField
            label="Tipo"
            value={block.kind}
            options={[
              { value: "regra", label: "Regra" },
              { value: "exemplo", label: "Exemplo" },
              { value: "ambientacao", label: "Ambientação" },
              { value: "mestre", label: "Mestre" },
              { value: "atencao", label: "Atenção" },
            ]}
            onChange={(value) => patch({ kind: value })}
          />
          <TextField label="Título" value={block.title} onChange={(v) => patch({ title: v })} />
          <AreaField
            label="Conteúdo"
            value={block.content}
            rows={6}
            onChange={(v) => patch({ content: v })}
          />
        </PanelSection>
      ) : null}

      {block.type === "table" ? (
        <PanelSection title="Tabela">
          <TextField
            label="Legenda"
            value={block.caption ?? ""}
            onChange={(value) => patch({ caption: value || undefined })}
          />
          <ToggleField
            label="Compacta"
            checked={Boolean(block.compact)}
            onChange={(checked) => patch({ compact: checked })}
          />
          <AreaField
            label="Colunas (uma por linha)"
            value={block.columns.join("\n")}
            rows={4}
            onChange={(value) => patch({ columns: value.split("\n") })}
          />
          <AreaField
            label="Linhas (células separadas por |)"
            value={block.rows.map((row) => row.join(" | ")).join("\n")}
            rows={8}
            onChange={(value) =>
              patch({
                rows: value
                  .split("\n")
                  .filter((line) => line.trim().length > 0)
                  .map((line) => line.split("|").map((cell) => cell.trim())),
              })
            }
          />
        </PanelSection>
      ) : null}
    </>
  );
}

function ImageProperties({ block }: { block: ImageBlock }) {
  const { selectedPage, updateBlock } = useEditor();
  const patch = (values: Record<string, unknown>) => updateBlock(selectedPage.id, block.id, values);
  return (
    <PanelSection title="Imagem">
      <TextField label="Source" value={block.src} onChange={(value) => patch({ src: value })} />
      <TextField label="Alt text" value={block.alt} onChange={(value) => patch({ alt: value })} />
      <TextField
        label="Legenda"
        value={block.caption ?? ""}
        onChange={(value) => patch({ caption: value || undefined })}
      />
      <SelectField
        label="Posição"
        value={block.position ?? "flow"}
        options={[
          { value: "flow", label: "No fluxo" },
          { value: "left", label: "Esquerda" },
          { value: "right", label: "Direita" },
          { value: "top", label: "Topo" },
          { value: "bottom", label: "Base" },
          { value: "full", label: "Página inteira" },
        ]}
        onChange={(value) => patch({ position: value })}
      />
      <SelectField
        label="Fit"
        value={block.fit ?? "cover"}
        options={[
          { value: "cover", label: "Cover (crop)" },
          { value: "contain", label: "Contain" },
        ]}
        onChange={(value) => patch({ fit: value })}
      />
      <RangeField
        label="Crop X"
        min={0}
        max={100}
        value={block.objectX ?? 50}
        onChange={(value) => patch({ objectX: value })}
      />
      <RangeField
        label="Crop Y"
        min={0}
        max={100}
        value={block.objectY ?? 50}
        onChange={(value) => patch({ objectY: value })}
      />
      <TextField
        label="Largura"
        value={block.width ?? ""}
        placeholder="ex. 38% ou 90mm"
        onChange={(value) => patch({ width: value || undefined })}
      />
      <TextField
        label="Altura"
        value={block.height ?? ""}
        placeholder="ex. 40% ou 64mm"
        onChange={(value) => patch({ height: value || undefined })}
      />
      <ToggleField
        label="Full bleed"
        checked={Boolean(block.fullBleed)}
        onChange={(checked) => patch({ fullBleed: checked })}
      />
    </PanelSection>
  );
}

/** Painel direito: responde ao elemento selecionado (bloco → página → documento). */
export function PropertiesPanel() {
  const {
    book,
    selectedPage,
    selectedBlock,
    updatePage,
    updatePageSettings,
    setTemplate,
    setTokens,
    issuesForPage,
    focusIssue,
  } = useEditor();

  const [tab, setTab] = useState<"properties" | "guide">("properties");
  const definition = TEMPLATES[selectedPage.template];
  const issues = issuesForPage(selectedPage.id);

  const tabClass = (active: boolean) =>
    `border-b-2 px-3 py-1 text-[11px] tracking-[0.18em] uppercase ${
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <button
          type="button"
          aria-pressed={tab === "properties"}
          data-testid="tab-properties"
          className={tabClass(tab === "properties")}
          onClick={() => setTab("properties")}
        >
          Propriedades
        </button>
        <button
          type="button"
          aria-pressed={tab === "guide"}
          data-testid="tab-guide"
          className={tabClass(tab === "guide")}
          onClick={() => setTab("guide")}
        >
          Guia
        </button>
      </div>

      {tab === "guide" ? (
        <GuidePanel />
      ) : (
        <>
          {issues.length > 0 ? (
            <PanelSection title="Preflight desta página">
              <ul className="space-y-1 text-[11px]">
                {issues.map((issue, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => focusIssue(issue)}
                      className="text-left hover:underline"
                    >
                      <span
                        className={
                          issue.severity === "error"
                            ? "text-destructive"
                            : issue.severity === "warning"
                              ? "text-[#c08b2b]"
                              : "text-muted-foreground"
                        }
                      >
                        {SEVERITY_LABEL[issue.severity]}
                      </span>{" "}
                      <span className="text-foreground">{issue.description}</span>{" "}
                      <span className="text-muted-foreground">
                        ({PREFLIGHT_RULES[issue.rule].label})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </PanelSection>
          ) : null}

          {selectedBlock ? (
            <BlockProperties block={selectedBlock} />
          ) : (
            <>
              <PanelSection title="Página">
                <SelectField
                  label="Template"
                  value={selectedPage.template}
                  options={TEMPLATE_IDS.map((id) => ({
                    value: id as TemplateId,
                    label: TEMPLATES[id].label,
                  }))}
                  onChange={(value) => setTemplate(selectedPage.id, value)}
                />
                {definition.variants.length > 1 ? (
                  <SelectField
                    label="Variante"
                    value={(selectedPage.variant ?? definition.variants[0]!) as PageVariant}
                    options={definition.variants.map((variant) => ({
                      value: variant,
                      label: variant,
                    }))}
                    onChange={(value) => updatePage(selectedPage.id, { variant: value })}
                  />
                ) : null}
                <TextField
                  label="Título"
                  value={selectedPage.title ?? ""}
                  onChange={(value) => updatePage(selectedPage.id, { title: value || undefined })}
                />
                <TextField
                  label="Subtítulo"
                  value={selectedPage.subtitle ?? ""}
                  onChange={(value) =>
                    updatePage(selectedPage.id, { subtitle: value || undefined })
                  }
                />
                <TextField
                  label="Sobretítulo"
                  value={selectedPage.eyebrow ?? ""}
                  onChange={(value) => updatePage(selectedPage.id, { eyebrow: value || undefined })}
                />
                <TextField
                  label="Parte"
                  value={selectedPage.part ?? ""}
                  onChange={(value) => updatePage(selectedPage.id, { part: value || undefined })}
                />
                <TextField
                  label="Capítulo"
                  value={selectedPage.chapter ?? ""}
                  onChange={(value) => updatePage(selectedPage.id, { chapter: value || undefined })}
                />
              </PanelSection>

              <PanelSection title="Composição">
                <SelectField
                  label="Colunas"
                  value={String(selectedPage.settings.columns) as "1" | "2"}
                  options={[
                    { value: "1", label: "1 coluna (literário)" },
                    { value: "2", label: "2 colunas (referência)" },
                  ]}
                  onChange={(value) =>
                    updatePageSettings(selectedPage.id, { columns: Number(value) as 1 | 2 })
                  }
                />
                <SelectField
                  label="Fundo"
                  value={selectedPage.settings.background}
                  options={[
                    { value: "paper", label: "Paper" },
                    { value: "obsidian", label: "Obsidian" },
                  ]}
                  onChange={(value) => updatePageSettings(selectedPage.id, { background: value })}
                />
                <ToggleField
                  label="Full bleed"
                  checked={selectedPage.settings.fullBleed}
                  onChange={(checked) =>
                    updatePageSettings(selectedPage.id, { fullBleed: checked })
                  }
                />
                <ToggleField
                  label="Header"
                  checked={selectedPage.settings.header}
                  onChange={(checked) => updatePageSettings(selectedPage.id, { header: checked })}
                />
                <ToggleField
                  label="Footer"
                  checked={selectedPage.settings.footer}
                  onChange={(checked) => updatePageSettings(selectedPage.id, { footer: checked })}
                />
                <ToggleField
                  label="Número de página"
                  checked={selectedPage.settings.pageNumber}
                  onChange={(checked) =>
                    updatePageSettings(selectedPage.id, { pageNumber: checked })
                  }
                />
                <ToggleField
                  label="Quebra forçada antes"
                  checked={Boolean(selectedPage.settings.breakBefore)}
                  onChange={(checked) =>
                    updatePageSettings(selectedPage.id, { breakBefore: checked })
                  }
                />
              </PanelSection>

              <PanelSection title="Documento (tokens)">
                <div className="grid grid-cols-2 gap-x-2">
                  {TOKEN_FIELDS.map((field) => (
                    <TextField
                      key={field.key}
                      label={field.label}
                      value={book.tokens[field.key]}
                      onChange={(value) => setTokens({ [field.key]: value } as Partial<BookTokens>)}
                    />
                  ))}
                </div>
              </PanelSection>
            </>
          )}
        </>
      )}
    </div>
  );
}
