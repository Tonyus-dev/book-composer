import { useState } from "react";
import type {
  Block,
  BookTokens,
  ImageBlock,
  FormBlock,
  FormFieldType,
  PageVariant,
  ShapeBlock,
  ShapeKind,
  TableBlock,
  TableBorderMode,
  TemplateId,
} from "../../book/types";
import { TEMPLATES, TEMPLATE_IDS } from "../../book/templates";
import { normalizeTableBlock } from "../../book/tableModel";
import { PREFLIGHT_RULES, SEVERITY_LABEL } from "../../lib/preflight/types";
import { useEditor } from "../state/store";
import {
  AreaField,
  ColorField,
  PanelSection,
  RangeField,
  SelectField,
  TextField,
  ToggleField,
} from "./fields";
import { GuidePanel } from "./GuidePanel";
import { fileToBookFont, ACCEPTED_FONT_EXTENSIONS } from "../../lib/assets/upload";
import { nextId } from "../state/store";

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

function fontOptions(book: { fonts?: { family: string }[] }) {
  return [
    { value: '"EB Garamond", "Garamond", "Times New Roman", serif', label: "EB Garamond / serif" },
    { value: '"Liberation Sans", Arial, Helvetica, sans-serif', label: "Liberation Sans / sans" },
    ...(book.fonts ?? []).map((font) => ({ value: font.family, label: font.family })),
  ];
}

function BlockProperties({ block }: { block: Block }) {
  const { book, selectedPage, updateBlock, removeBlock, moveBlock } = useEditor();
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

      <PanelSection title="Moldura / composição direta">
        <div className="grid grid-cols-2 gap-x-2">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <TextField
              key={key}
              label={`${key.toUpperCase()} (mm)`}
              value={block.frame ? String(block.frame[key]) : ""}
              placeholder={
                key === "width" || key === "height" ? "arraste no canvas" : "arraste no canvas"
              }
              onChange={(value) => {
                const number = Number(value);
                if (!Number.isFinite(number)) return;
                patch({
                  frame: {
                    ...(block.frame ?? { x: 18, y: 28, width: 80, height: 30 }),
                    [key]: number,
                  },
                });
              }}
            />
          ))}
        </div>
        {block.frame ? (
          <button
            type="button"
            className="mt-1 border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
            onClick={() => patch({ frame: undefined })}
          >
            Voltar ao fluxo editorial
          </button>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Selecione e arraste o bloco para criar uma moldura física.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Tipografia local">
        <SelectField
          label="Fonte deste bloco"
          value={block.fontFamily ?? ""}
          options={[
            { value: "", label: "Herdar documento" },
            { value: "EB Garamond", label: "EB Garamond" },
            { value: "Liberation Sans", label: "Liberation Sans" },
            ...(book.fonts ?? []).map((font) => ({ value: font.family, label: font.family })),
          ]}
          onChange={(value) => patch({ fontFamily: value || undefined })}
        />
        <p className="text-[10px] text-muted-foreground">
          Aplica somente a este bloco; a fonte precisa estar inserida no projeto para o PDF ser
          reproduzível.
        </p>
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
      {block.type === "shape" ? <ShapeProperties block={block} /> : null}

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

      {block.type === "table" ? <TableProperties block={block} /> : null}
      {block.type === "form" ? <FormProperties block={block} /> : null}
    </>
  );
}

function ShapeProperties({ block }: { block: ShapeBlock }) {
  const { selectedPage, updateBlock } = useEditor();
  const patch = (values: Record<string, unknown>) => updateBlock(selectedPage.id, block.id, values);
  return (
    <PanelSection title="Elemento gráfico">
      <SelectField
        label="Tipo"
        value={block.shape}
        options={[
          { value: "frame", label: "Moldura" },
          { value: "window", label: "Janela / caixa" },
          { value: "line", label: "Linha / filete" },
          { value: "fill", label: "Área de cor" },
        ]}
        onChange={(value) => patch({ shape: value as ShapeKind })}
      />
      <TextField
        label="Rótulo"
        value={block.label ?? ""}
        onChange={(value) => patch({ label: value || undefined })}
      />
      <ColorField
        label="Traço"
        value={block.stroke ?? "#542869"}
        onChange={(value) => patch({ stroke: value })}
      />
      <ColorField
        label="Preenchimento"
        value={block.fill ?? "#ffffff"}
        onChange={(value) => patch({ fill: value })}
      />
      <TextField
        label="Espessura"
        value={block.strokeWidth ?? "0.35mm"}
        onChange={(value) => patch({ strokeWidth: value || undefined })}
      />
    </PanelSection>
  );
}

function FormProperties({ block }: { block: FormBlock }) {
  const { selectedPage, updateBlock } = useEditor();
  const patch = (values: Record<string, unknown>) => updateBlock(selectedPage.id, block.id, values);
  const fieldsText = block.fields.map((field) => `${field.label}::${field.type}`).join("\n");
  return (
    <PanelSection title="Ficha / formulário">
      <TextField label="Título" value={block.title} onChange={(value) => patch({ title: value })} />
      <AreaField
        label="Introdução"
        value={block.intro ?? ""}
        rows={3}
        onChange={(value) => patch({ intro: value || undefined })}
      />
      <SelectField
        label="Colunas"
        value={String(block.columns ?? 1) as "1" | "2"}
        options={[
          { value: "1", label: "Uma coluna" },
          { value: "2", label: "Duas colunas" },
        ]}
        onChange={(value) => patch({ columns: Number(value) as 1 | 2 })}
      />
      <AreaField
        label="Campos (label::tipo)"
        value={fieldsText}
        rows={8}
        onChange={(value) => {
          const fields = value
            .split(/\r?\n/)
            .map((line, index) => {
              const [label, rawType] = line.split("::").map((part) => part.trim());
              const allowed: FormFieldType[] = ["text", "multiline", "number", "checkbox", "line"];
              const type = allowed.includes(rawType as FormFieldType)
                ? (rawType as FormFieldType)
                : "text";
              return {
                id: block.fields[index]?.id ?? `${block.id}-field-${index + 1}`,
                label: label || "Campo",
                type,
              };
            })
            .filter((field) => field.label);
          patch({ fields });
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        Tipos: text, multiline, number, checkbox, line.
      </p>
    </PanelSection>
  );
}

function TableProperties({ block }: { block: TableBlock }) {
  const { selectedPage, updateTable } = useEditor();
  const table = normalizeTableBlock(block);
  const patch = (transform: (current: typeof table) => typeof table) =>
    updateTable(selectedPage.id, table.id, transform);
  return (
    <PanelSection title="Tabela estrutural">
      <TextField
        label="Legenda"
        value={table.caption ?? ""}
        onChange={(value) =>
          patch((current) => {
            const next = { ...current };
            if (value) next.caption = value;
            else delete next.caption;
            return next;
          })
        }
      />
      <div className="mb-2 text-[10px] text-muted-foreground">
        {table.columns.length} colunas · {table.rows.length} linhas · edição visual ativa no canvas
      </div>
      <ToggleField
        label="Compacta"
        checked={Boolean(table.compact)}
        onChange={(checked) => patch((current) => ({ ...current, compact: checked }))}
      />
      <ToggleField
        label="Repetir cabeçalho"
        checked={table.repeatHeader !== false}
        onChange={(checked) => patch((current) => ({ ...current, repeatHeader: checked }))}
      />
      <ToggleField
        label="Permitir quebra"
        checked={Boolean(table.allowPageBreak)}
        onChange={(checked) => patch((current) => ({ ...current, allowPageBreak: checked }))}
      />
      <SelectField
        label="Bordas"
        value={table.style?.borderMode ?? "horizontal"}
        options={[
          { value: "none", label: "Nenhuma" },
          { value: "horizontal", label: "Horizontais" },
          { value: "grid", label: "Grade" },
          { value: "custom", label: "Personalizadas" },
        ]}
        onChange={(value) =>
          patch((current) => ({
            ...current,
            style: { ...current.style, borderMode: value as TableBorderMode },
          }))
        }
      />
      <TextField
        label="Padding horizontal"
        value={table.style?.cellPaddingX ?? "2mm"}
        onChange={(value) =>
          patch((current) => ({ ...current, style: { ...current.style, cellPaddingX: value } }))
        }
      />
      <TextField
        label="Padding vertical"
        value={table.style?.cellPaddingY ?? "1.4mm"}
        onChange={(value) =>
          patch((current) => ({ ...current, style: { ...current.style, cellPaddingY: value } }))
        }
      />
      <ToggleField
        label="Zebra"
        checked={Boolean(table.style?.zebra)}
        onChange={(checked) =>
          patch((current) => ({ ...current, style: { ...current.style, zebra: checked } }))
        }
      />
      <ToggleField
        label="Primeira coluna forte"
        checked={Boolean(table.style?.firstColumnStrong)}
        onChange={(checked) =>
          patch((current) => ({
            ...current,
            style: { ...current.style, firstColumnStrong: checked },
          }))
        }
      />
    </PanelSection>
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
    addFont,
    removeFont,
    issuesForPage,
    focusIssue,
    togglePageFixed,
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
                <button
                  type="button"
                  className={`mb-3 w-full border px-2 py-1.5 text-left text-[11px] ${selectedPage.fixed ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-accent"}`}
                  aria-pressed={Boolean(selectedPage.fixed)}
                  onClick={() => togglePageFixed(selectedPage.id)}
                >
                  {selectedPage.fixed ? "🔒 Composição fixada" : "○ Fixar composição"}
                </button>
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
                <ColorField
                  label="Cor da página"
                  value={
                    selectedPage.settings.pageColor ??
                    (selectedPage.settings.background === "obsidian" ? "#171821" : "#fffdf8")
                  }
                  onChange={(value) => updatePageSettings(selectedPage.id, { pageColor: value })}
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

              <PanelSection title="Tipografia do documento">
                <SelectField
                  label="Títulos e display"
                  value={book.tokens.fontDisplay}
                  options={fontOptions(book)}
                  onChange={(value) => setTokens({ fontDisplay: value })}
                />
                <SelectField
                  label="Texto corrido"
                  value={book.tokens.fontBody}
                  options={fontOptions(book)}
                  onChange={(value) => setTokens({ fontBody: value })}
                />
                <SelectField
                  label="Interface e tabelas"
                  value={book.tokens.fontFunctional}
                  options={fontOptions(book)}
                  onChange={(value) => setTokens({ fontFunctional: value })}
                />
                <label className="mt-2 block border border-dashed border-border px-2 py-2 text-[10px] text-muted-foreground hover:bg-accent">
                  <span className="mb-1 block font-medium text-foreground">Inserir fonte</span>
                  <span className="mb-2 block">
                    .woff2, .woff, .ttf ou .otf · fica dentro do projeto
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_FONT_EXTENSIONS.join(",")}
                    className="block w-full text-[10px]"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const fallback = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
                      const family = window.prompt("Nome da família tipográfica", fallback)?.trim();
                      if (family) {
                        try {
                          addFont(await fileToBookFont(file, { id: nextId("font"), family }));
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : "Fonte inválida.");
                        }
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
                {(book.fonts ?? []).length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {(book.fonts ?? []).map((font) => (
                      <div
                        key={font.id}
                        className="flex items-center justify-between gap-2 text-[10px]"
                      >
                        <span className="truncate" title={font.fileName}>
                          {font.family}
                        </span>
                        <button
                          type="button"
                          className="text-destructive hover:underline"
                          onClick={() => removeFont(font.id)}
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </PanelSection>
            </>
          )}
        </>
      )}
    </div>
  );
}
