#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const projectPath = path.join(root, "projects", "kallistis-materializado-partes-i-ii-missao-01.json");
const knownMerged = [
  "usareste",
  "falarantes",
  "encontrara metade",
  "amadurecerem silêncio",
  "começara compreendê-la",
  "apagaras vidas",
  "dizere existir",
  "continuarexistindo",
  "justificara dor",
  "atuarem ambos",
  "explicara nova condição",
  "seratribuídas",
  "Kragorexperimentaram",
  "porescolha",
  "Poralguns segundos",
  "esperarera prolongara ferida",
  "conquistarambos",
  "recolherartefatos",
  "teracesso",
  "definira resposta",
  "concluira restauração",
  "serevitada",
  "existirao mesmo tempo",
  "desestabilizara passagem",
  "repetiressa frase",
  "respeitarestes pontos",
  "conversarentre si",
  "falarem nome",
  "repetira mesma violência",
];

const book = JSON.parse(await readFile(projectPath, "utf8"));
const rendered = book.pages
  .flatMap((page) => page.blocks ?? [])
  .flatMap((block) => [block.content, block.text])
  .filter((value) => typeof value === "string")
  .join("\n");
const hits = knownMerged.filter((phrase) => rendered.includes(phrase));
if (hits.length) throw new Error(`Fusões lexicais detectadas: ${hits.join(", ")}`);

const lexicalFixtures = [
  ["começar a compreender", "começar a compreender"],
  ["falar antes", "falar antes"],
  ["existir ao mesmo tempo", "existir ao mesmo tempo"],
  ["conversar entre si", "conversar entre si"],
  ["por escolha", "por escolha"],
  ["ser evitada", "ser evitada"],
  ["respeitar estes pontos", "respeitar estes pontos"],
];
for (const [source, output] of lexicalFixtures) {
  if (source.replace(/\s+/gu, " ") !== output.replace(/\s+/gu, " ")) {
    throw new Error(`Fixture lexical alterada: ${source}`);
  }
}
console.log(`TEXT_INTEGRITY=PASS knownMerged=0 fixtures=${lexicalFixtures.length}`);
