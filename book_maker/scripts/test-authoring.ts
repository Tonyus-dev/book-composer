import {
  cloneBlockForInsert,
  createFormBlock,
  materializeRecipe,
  normalizeRecipe,
  parseAsciiLayout,
  parseSmartPaste,
  semanticRecipeFromPage,
  serializeAsciiLayout,
} from "../src/book/authoring";
import type { Page } from "../src/book/types";

const table = parseSmartPaste("Nome\tValor\nA\t1\nB\t2");
if (table.kind !== "table" || table.blocks[0]?.type !== "table")
  throw new Error("TSV não virou tabela");
if (table.blocks[0].rows.length !== 3 || table.blocks[0].columns.length !== 2)
  throw new Error("dimensão TSV inválida");

const markdownLayout = parseAsciiLayout(
  "@template table_page\n@title Página de referência\n# Título\nTexto.\n\n> Nota.",
);
if (
  markdownLayout.template !== "table_page" ||
  markdownLayout.title !== "Página de referência" ||
  markdownLayout.blocks.length !== 3
) {
  throw new Error("layout ASCII inválido");
}

const form = createFormBlock(
  "form-test",
  "Ficha",
  "Nome::text\nNotas::multiline\nAtivo::checkbox",
  2,
);
if (form.type !== "form" || form.fields.length !== 3 || form.columns !== 2)
  throw new Error("ficha inválida");

const copied = cloneBlockForInsert(form, 1);
if (
  copied.type !== "form" ||
  copied.id === form.id ||
  copied.fields[0]?.id === form.fields[0]?.id
) {
  throw new Error("clone de ficha não preservou IDs independentes");
}

const boxSource = `┌───────────────────────────────────────┐
│              # TÍTULO                 │
├───────────────────┬───────────────────┤
│                   │                   │
│     @PORTRAIT     │      @TEXT        │
│                   │                   │
│                   │                   │
├───────────────────┴───────────────────┤
│              @QUOTE                   │
└───────────────────────────────────────┘`;
const boxed = parseAsciiLayout(boxSource);
const layout = boxed.blocks[0];
if (layout?.type !== "layout") throw new Error("caixa ASCII não virou layout");
if (layout.columns !== 2 || layout.rows !== 3 || layout.areas.length !== 4) {
  throw new Error("geometria ASCII inválida");
}
const [titleArea, portraitArea, textArea, quoteArea] = layout.areas;
if (
  titleArea?.colSpan !== 2 ||
  portraitArea?.block.type !== "image" ||
  textArea?.marker !== "TEXT" ||
  quoteArea?.colSpan !== 2
) {
  throw new Error("áreas ASCII não preservaram semântica");
}
if (serializeAsciiLayout(layout) !== boxSource) throw new Error("round-trip ASCII não é estável");

const recipePage: Page = {
  id: "recipe-source",
  template: "profile",
  variant: "portrait-left",
  settings: {
    header: true,
    footer: false,
    pageNumber: true,
    columns: 1,
    background: "paper",
    fullBleed: false,
  },
  blocks: [
    { id: "title-source", type: "heading", level: 1, text: "Povo original" },
    {
      id: "portrait-source",
      type: "image",
      src: "/portrait.jpg",
      alt: "Retrato original",
      position: "left",
    },
    {
      id: "body-source",
      type: "text",
      content: "Conteúdo específico que não deve vazar.",
      role: "body",
    },
    { id: "divider-source", type: "divider", ornament: true },
  ],
};
const semanticRecipe = semanticRecipeFromPage(recipePage, "Perfil semântico", "Modelo de teste", [
  { blockId: "title-source", mode: "slot", kind: "title", required: true },
  { blockId: "portrait-source", mode: "slot", kind: "portrait", required: true },
  { blockId: "body-source", mode: "slot", kind: "body", required: true },
  { blockId: "divider-source", mode: "fixed" },
]);
if (semanticRecipe.scope !== "page" || semanticRecipe.slots.length !== 3) {
  throw new Error("recipe semântica não classificou slots");
}
const materialized = materializeRecipe(semanticRecipe);
if (materialized.length !== 4 || materialized.some((block) => block.id.endsWith("source"))) {
  throw new Error("instanciação não gerou IDs independentes");
}
const materializedHeading = materialized.find((block) => block.type === "heading");
const materializedImage = materialized.find((block) => block.type === "image");
const materializedDivider = materialized.find((block) => block.type === "divider");
if (
  materializedHeading?.type !== "heading" ||
  materializedHeading.text ||
  materializedImage?.type !== "image" ||
  materializedImage.src ||
  materializedDivider?.type !== "divider" ||
  !materializedDivider.ornament
) {
  throw new Error("recipe não separou slots vazios de elementos fixos");
}
const legacy = normalizeRecipe({
  id: "legacy",
  name: "Receita antiga",
  template: "narrative",
  blocks: [{ id: "old", type: "text", content: "não copiar" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
if (
  materializeRecipe(legacy)[0]?.type !== "text" ||
  (materializeRecipe(legacy)[0] as { content?: string }).content
) {
  throw new Error("migração de recipe antiga preservou conteúdo indevidamente");
}

console.log("authoring PASS");
