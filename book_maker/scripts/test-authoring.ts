import {
  cloneBlockForInsert,
  createFormBlock,
  parseAsciiLayout,
  parseSmartPaste,
  serializeAsciiLayout,
} from "../src/book/authoring";

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

console.log("authoring PASS");
