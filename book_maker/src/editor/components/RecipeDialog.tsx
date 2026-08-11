import { useMemo, useState } from "react";
import type { Block, BookRecipe, Page, RecipeBlockMode, RecipeSlotKind } from "../../book/types";
import {
  normalizeRecipe,
  semanticRecipeFromPage,
  semanticRecipeFromSpread,
  suggestedRecipeKind,
  type RecipeBlockClassification,
} from "../../book/authoring";

const SLOT_KINDS: RecipeSlotKind[] = [
  "title",
  "subtitle",
  "eyebrow",
  "lead",
  "body",
  "portrait",
  "image",
  "hero-image",
  "map",
  "symbol",
  "table",
  "quote",
  "box",
  "caption",
];

const KIND_LABELS: Record<RecipeSlotKind, string> = {
  title: "Título",
  subtitle: "Subtítulo",
  eyebrow: "Antetítulo",
  lead: "Lead",
  body: "Texto principal",
  portrait: "Retrato",
  image: "Imagem",
  "hero-image": "Imagem hero",
  map: "Mapa",
  symbol: "Símbolo",
  table: "Tabela",
  quote: "Citação",
  box: "Box",
  caption: "Legenda",
};

type ClassificationState = Omit<RecipeBlockClassification, "kind" | "label"> & {
  label: string;
  kind: RecipeSlotKind | "";
};

function initialClassification(block: Block): ClassificationState {
  const suggested = suggestedRecipeKind(block);
  return {
    blockId: block.id,
    mode: block.type === "divider" || block.type === "lockup" ? "fixed" : "slot",
    kind: suggested ?? "",
    label: suggested
      ? KIND_LABELS[suggested]
      : block.type === "divider"
        ? "Divisor fixo"
        : block.type,
    required: Boolean(
      suggested && ["title", "lead", "body", "portrait", "table"].includes(suggested),
    ),
  };
}

function describeBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return block.text || "Título vazio";
    case "text":
      return block.content.split("\n")[0] || "Texto vazio";
    case "image":
      return block.alt || "Imagem sem descrição";
    case "quote":
      return block.text || "Citação vazia";
    case "table":
      return block.caption || "Tabela";
    case "box":
      return block.title || "Box";
    case "caption":
      return block.text || "Legenda vazia";
    case "divider":
      return "Divisor editorial";
    case "lockup":
      return block.alt || "Marca fixa";
    case "form":
      return block.title || "Ficha";
    case "toc":
      return "Sumário";
    case "layout":
      return "Layout estrutural ASCII";
  }
}

function RecipeThumbnail({ recipe }: { recipe: BookRecipe }) {
  const nodes = recipe.structure.slice(0, 8);
  return (
    <div
      className="grid h-12 w-16 shrink-0 grid-cols-3 grid-rows-3 gap-px border border-border bg-border p-px"
      aria-label={`Preview do modelo ${recipe.name}`}
    >
      {nodes.map((node) => (
        <span
          key={node.recipeBlockId}
          className={`min-h-0 overflow-hidden px-0.5 text-[6px] leading-tight ${
            node.mode === "fixed" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
          }`}
        >
          {node.slotKey ?? "fixo"}
        </span>
      ))}
    </div>
  );
}

interface RecipeDialogProps {
  page: Page;
  recipes: BookRecipe[];
  onSave: (recipe: BookRecipe) => void;
  onCreatePage: (recipe: BookRecipe) => void;
  onDelete: (recipeId: string) => void;
  pairedPage?: Page | undefined;
}

export function RecipeDialog({
  page,
  recipes,
  onSave,
  onCreatePage,
  onDelete,
  pairedPage,
}: RecipeDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classifications, setClassifications] = useState<ClassificationState[]>(() =>
    page.blocks.map(initialClassification),
  );
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const slotCount = useMemo(
    () => classifications.filter((item) => item.mode === "slot" && item.kind).length,
    [classifications],
  );

  const updateClassification = (blockId: string, patch: Partial<ClassificationState>) =>
    setClassifications((current) =>
      current.map((item) => (item.blockId === blockId ? { ...item, ...patch } : item)),
    );

  const save = (scope: "page" | "spread" = "page") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const leftClassifications = classifications.map(({ label, kind, ...item }) => ({
      ...item,
      ...(kind ? { kind } : {}),
      ...(label.trim() ? { label: label.trim() } : {}),
    }));
    const recipe =
      scope === "spread" && pairedPage
        ? semanticRecipeFromSpread(
            page,
            pairedPage,
            trimmed,
            description.trim(),
            leftClassifications,
          )
        : semanticRecipeFromPage(page, trimmed, description.trim(), leftClassifications);
    onSave(recipe);
    setName("");
    setDescription("");
    setMessage(`Modelo “${recipe.name}” salvo com ${recipe.slots.length} slot(s).`);
  };

  const exportRecipe = (recipe: BookRecipe) => {
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "recipe"}.recipe.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importRecipe = async (file: File) => {
    setImporting(true);
    try {
      const parsed = normalizeRecipe(JSON.parse(await file.text()));
      onSave({
        ...parsed,
        id: `recipe-${Date.now().toString(36)}`,
        updatedAt: new Date().toISOString(),
      });
      setMessage(`Modelo “${parsed.name}” importado.`);
    } catch {
      setMessage("Arquivo de modelo inválido; o projeto não foi alterado.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
        O modelo guarda geometria, estilo e papéis editoriais. Slots de conteúdo nascem vazios;
        elementos marcados como fixos permanecem.
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2">
        <input
          aria-label="Nome do modelo"
          className="border border-border bg-input/40 px-2 py-1 text-xs"
          placeholder="Nome do modelo"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          aria-label="Descrição do modelo"
          className="border border-border bg-input/40 px-2 py-1 text-xs"
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button
          type="button"
          className="border border-primary bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
          disabled={!name.trim() || page.blocks.length === 0}
          onClick={() => save()}
        >
          Salvar composição
        </button>
        {pairedPage ? (
          <button
            type="button"
            className="border border-border px-2 py-1 text-xs disabled:opacity-50"
            disabled={!name.trim() || page.blocks.length === 0 || pairedPage.blocks.length === 0}
            onClick={() => save("spread")}
          >
            Salvar spread
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Classifique os blocos da página atual · {slotCount} slot(s) sugerido(s)</span>
        <label className="cursor-pointer border border-border px-2 py-1 hover:bg-accent">
          {importing ? "Importando…" : "Importar modelo"}
          <input
            className="hidden"
            type="file"
            accept="application/json,.json"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importRecipe(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto border-y border-border py-2">
        {page.blocks.map((block) => {
          const item =
            classifications.find((entry) => entry.blockId === block.id) ??
            initialClassification(block);
          return (
            <div
              key={block.id}
              className="grid grid-cols-[minmax(0,1fr)_92px_118px] items-center gap-2 border-b border-border/60 py-1 last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate text-xs">{describeBlock(block)}</div>
                <div className="text-[10px] text-muted-foreground">{block.type}</div>
              </div>
              <select
                aria-label={`Modo de ${describeBlock(block)}`}
                className="border border-border bg-input/40 px-1 py-1 text-[10px]"
                value={item.mode}
                onChange={(event) =>
                  updateClassification(block.id, { mode: event.target.value as RecipeBlockMode })
                }
              >
                <option value="slot">Slot</option>
                <option value="fixed">Fixo</option>
                <option value="ignore">Ignorar</option>
              </select>
              <select
                aria-label={`Papel de ${describeBlock(block)}`}
                className="border border-border bg-input/40 px-1 py-1 text-[10px] disabled:opacity-50"
                value={item.kind}
                disabled={item.mode !== "slot"}
                onChange={(event) =>
                  updateClassification(block.id, { kind: event.target.value as RecipeSlotKind })
                }
              >
                <option value="">Escolher papel…</option>
                {SLOT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {message ? <p className="text-[11px] text-primary">{message}</p> : null}
      <div className="border-t border-border pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Biblioteca de modelos
        </div>
        {recipes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum modelo salvo ainda.</p>
        ) : (
          recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0"
            >
              <RecipeThumbnail recipe={recipe} />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{recipe.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {recipe.scope} · {recipe.slots.length} slot(s) · {recipe.structure.length}{" "}
                  bloco(s)
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="border border-primary px-2 py-1 text-[11px] hover:bg-accent"
                  onClick={() => onCreatePage(recipe)}
                >
                  Nova página
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
                  onClick={() => {
                    const nextName = window.prompt("Novo nome do modelo", recipe.name)?.trim();
                    if (nextName) {
                      onSave({ ...recipe, name: nextName, updatedAt: new Date().toISOString() });
                    }
                  }}
                >
                  Renomear
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
                  onClick={() =>
                    onSave({
                      ...recipe,
                      id: `recipe-${Date.now().toString(36)}`,
                      name: `${recipe.name} — cópia`,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1 text-[11px] hover:bg-accent"
                  onClick={() => exportRecipe(recipe)}
                >
                  Exportar
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1 text-[11px] text-destructive hover:bg-accent"
                  onClick={() => onDelete(recipe.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
