import {
  cloneBlockForInsert,
  createFormBlock,
  parseAsciiLayout,
  parseSmartPaste,
} from "../src/book/authoring";

const table = parseSmartPaste("Nome\tValor\nA\t1\nB\t2");
if (table.kind !== "table" || table.blocks[0]?.type !== "table")
  throw new Error("TSV não virou tabela");
if (table.blocks[0].rows.length !== 3 || table.blocks[0].columns.length !== 2)
  throw new Error("dimensão TSV inválida");

const layout = parseAsciiLayout(
  "@template table_page\n@title Página de referência\n# Título\nTexto.\n\n> Nota.",
);
if (
  layout.template !== "table_page" ||
  layout.title !== "Página de referência" ||
  layout.blocks.length !== 3
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

console.log("authoring PASS");
