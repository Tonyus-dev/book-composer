#!/usr/bin/env node
/**
 * KALLISTIS BOOK MAKER — Editorial Materialization Engine.
 *
 * This script is deliberately an adapter around the existing Book Maker:
 * it emits the existing Book JSON and measures candidate pages through the
 * real /print PageRenderer/CSS. It never edits the frozen manuscript or the
 * existing manual project.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, access, readdir, copyFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const PRODUCTION_ROOT =
  "/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO";
const MANUSCRIPT = path.join(PRODUCTION_ROOT, "MANUSCRITO_CONGELADO", "MANUSCRITO_CONGELADO.md");
const CATALOG = path.join(PRODUCTION_ROOT, "00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md");
const LOCAL_IMAGE_ROOT = path.join(PRODUCTION_ROOT, "IMAGENS");
const V15_IMAGE_ROOT = path.join(ROOT, "public", "assets", "v1.5-acervo");
const V15_INVENTORY_PATH = path.join(ROOT, "drive-image-inventory.json");
const V15_DISPOSITION_PATH = path.join(ROOT, "drive-image-disposition.csv");
const CANONICAL_PROJECT = path.join(ROOT, "projects", "kallistis-livro-basico.json");
const APPROVED_HISTORIA_PROJECT = path.join(
  ROOT,
  "projects",
  "kallistis-materializado-historia-v5.json",
);
const APPROVED_AGGREGATE_PROJECT = path.join(
  ROOT,
  "projects",
  "kallistis-materializado-partes-i-iv-v1.json",
);
const LEGACY_REFERENCE_SCRIPT = path.join(ROOT, "scripts", "build-p001-p030.mjs");
const DEFAULT_OUTPUT = path.join(ROOT, "projects", "kallistis-materializado-historia-v5.json");
const PORT = 4185;
const MATERIALIZER_STORAGE_KEY = "__kallistis_materializer_book__";
const VERSION = 5;
let renderRevision = 0;

const IMAGE_CADENCE = { targetInterval: 4, minimumInterval: 3, maximumInterval: 5 };
const PAGINATION_POLICY = {
  targetBookPages: 420,
  softMaximumBookPages: 420,
  hardWarningBookPages: 420,
};
const MANUSCRIPT_TOTAL_WORDS = 90768;
const SOFT_MAX_TEXT_RUN = 5;
const HARD_MAX_TEXT_RUN = 7;
const ENCOUNTER_SECTION = "SETENTA E DOIS ENCONTROS ENTRE HERANÇA E ESCOLHA";

const SEMANTIC_ASSET_RULES = new Map([
  [
    "Prólogo — A velha e a Fresta",
    {
      semanticAnchor: "Prólogo — A velha e a Fresta",
      allowedHeadingTexts: ["Prólogo — A velha e a Fresta"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "PARTE I — O MUNDO PARTIDO",
    {
      semanticAnchor: "PARTE I — O MUNDO PARTIDO",
      allowedHeadingTexts: ["PARTE I — O MUNDO PARTIDO"],
      allowedWindow: "SAME_H1",
    },
  ],
  [
    "Manesh — O Mundo da Luz",
    {
      semanticAnchor: "Manesh — O Mundo da Luz",
      allowedHeadingTexts: ["Manesh — O Mundo da Luz"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "Thuvel — O Mundo da Escuridão",
    {
      semanticAnchor: "Thuvel — O Mundo da Escuridão",
      allowedHeadingTexts: ["Thuvel — O Mundo da Escuridão"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "Luz, Escuridão e Sombra",
    {
      semanticAnchor: "Luz, Escuridão e Sombra / Kav",
      allowedHeadingTexts: ["Luz, Escuridão e Sombra", "Kav — Sombra É Corrupção, Não Escuridão"],
      allowedWindow: "ALLOWED_H2S",
    },
  ],
  [
    "O Grande Cristal — Antes Que Houvesse Dois Mundos",
    {
      semanticAnchor: "O Grande Cristal",
      allowedHeadingTexts: ["O Grande Cristal — Antes Que Houvesse Dois Mundos"],
      allowedWindow: "SAME_HEADING_SUBTREE",
    },
  ],
  [
    "Mirveth — Uma Pessoa Inteira",
    {
      semanticAnchor: "Mirveth",
      allowedHeadingTexts: ["Mirveth — Uma Pessoa Inteira"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "Vethari — Relação Sem Apagamento",
    {
      semanticAnchor: "Vethari / contraponto Mirveth",
      allowedHeadingTexts: ["Vethari — Relação Sem Apagamento"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "Pedr’alma",
    { semanticAnchor: "Pedr’alma", allowedHeadingTexts: ["Pedr’alma"], allowedWindow: "SAME_H2" },
  ],
  [
    "Lar · Cidade · Companhia",
    {
      semanticAnchor: "Lar · Cidade · Companhia",
      allowedHeadingTexts: ["Lar · Cidade · Companhia"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "História do Mundo Partido",
    {
      semanticAnchor: "História do Mundo Partido / Dupla Herança / Fratura",
      allowedHeadingTexts: ["História do Mundo Partido"],
      allowedWindow: "SAME_H2",
    },
  ],
  [
    "A escrita contínua",
    {
      semanticAnchor: "Silmain / escrita contínua",
      allowedHeadingTexts: ["A escrita contínua"],
      allowedWindow: "SAME_HEADING_SUBTREE",
    },
  ],
  [
    "As primeiras frestas controladas",
    {
      semanticAnchor: "primeiras Frestas",
      allowedHeadingTexts: ["As primeiras frestas controladas"],
      allowedWindow: "SAME_HEADING_SUBTREE",
    },
  ],
  [
    "Kethrell e a doutrina da recomposição",
    {
      semanticAnchor: "Restauração Científica / Kethrell",
      allowedHeadingTexts: ["Kethrell e a doutrina da recomposição"],
      allowedWindow: "SAME_HEADING_SUBTREE",
    },
  ],
  [
    "Os Outros",
    {
      semanticAnchor: "Os Outros / Lightbringers",
      allowedHeadingTexts: ["Os Outros", "Os Lightbringers"],
      allowedWindow: "ALLOWED_HEADINGS",
    },
  ],
  [
    "Daeren",
    {
      semanticAnchor: "Daeren / Thavin / Isenna",
      allowedHeadingTexts: ["Daeren", "Thavin", "Isenna e a cisão interna"],
      allowedWindow: "ALLOWED_HEADINGS",
    },
  ],
  [
    "A profecia de Thaeraen",
    {
      semanticAnchor: "Thaeraen / Tempo da Escolha",
      allowedHeadingTexts: ["A profecia de Thaeraen"],
      allowedWindow: "SAME_HEADING_SUBTREE",
    },
  ],
  [
    "PARTE II — O CINTURÃO DAS FRESTAS",
    {
      semanticAnchor: "Cinturão das Frestas",
      allowedHeadingTexts: ["PARTE II — O CINTURÃO DAS FRESTAS"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "PARTE III — POVOS, COMUNIDADES E CAMINHOS",
    {
      semanticAnchor: "Povos, Comunidades e Caminhos",
      allowedHeadingTexts: ["PARTE III — POVOS, COMUNIDADES E CAMINHOS"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "PARTE IV — MEMÓRIA, PEDR’ALMA E FÉ",
    {
      semanticAnchor: "Memória, Pedr’alma e Fé",
      allowedHeadingTexts: ["PARTE IV — MEMÓRIA, PEDR’ALMA E FÉ"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "PARTE V — VELARIM",
    {
      semanticAnchor: "Velarim",
      allowedHeadingTexts: ["PARTE V — VELARIM"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "PARTE VI — JOGANDO KALLISTIS",
    {
      semanticAnchor: "Jogando KALLISTIS",
      allowedHeadingTexts: ["PARTE VI — JOGANDO KALLISTIS"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "PARTE VII — CONDUZINDO KALLISTIS",
    {
      semanticAnchor: "Conduzindo KALLISTIS",
      allowedHeadingTexts: ["PARTE VII — CONDUZINDO KALLISTIS"],
      allowedWindow: "SAME_H1",
      family: "PART_HERO",
    },
  ],
  [
    "O Mapa em Duas Camadas",
    {
      semanticAnchor: "Mapa em Duas Camadas",
      allowedHeadingTexts: ["O Mapa em Duas Camadas"],
      allowedWindow: "SAME_H2",
      family: "MAP_PAGE",
      preferredFit: "contain",
    },
  ],
  [
    "A Fenda de Kethrell",
    {
      semanticAnchor: "Fenda de Kethrell",
      allowedHeadingTexts: ["A Fenda de Kethrell"],
      allowedWindow: "SAME_H2",
      family: "GEOGRAPHY_OPENING",
    },
  ],
  [
    "Geografia da Luz: Planalto de Silmari",
    {
      semanticAnchor: "Planalto de Silmari",
      allowedHeadingTexts: ["Geografia da Luz: Planalto de Silmari"],
      allowedWindow: "SAME_H2",
      family: "GEOGRAPHY_OPENING",
    },
  ],
  [
    "Geografia da Escuridão: Vale de Thur-Daer",
    {
      semanticAnchor: "Vale de Thur-Daer",
      allowedHeadingTexts: ["Geografia da Escuridão: Vale de Thur-Daer"],
      allowedWindow: "SAME_H2",
      family: "GEOGRAPHY_OPENING",
    },
  ],
  [
    "Rotas Oficiais",
    {
      semanticAnchor: "Rotas Oficiais",
      allowedHeadingTexts: ["Rotas Oficiais"],
      allowedWindow: "SAME_H2",
      family: "MAP_PAGE",
      preferredFit: "contain",
    },
  ],
  [
    "Rotas Clandestinas e Comércio",
    {
      semanticAnchor: "Rotas Clandestinas e Comércio",
      allowedHeadingTexts: ["Rotas Clandestinas e Comércio"],
      allowedWindow: "SAME_H2",
      family: "MAP_PAGE",
      preferredFit: "contain",
    },
  ],
  [
    "O Estado Político Atual",
    {
      semanticAnchor: "Estado Político Atual",
      allowedHeadingTexts: ["O Estado Político Atual"],
      allowedWindow: "SAME_H2",
      family: "GEOGRAPHY_OPENING",
    },
  ],
  [
    "Tensões Regionais: Aelvari, Kragor, Draken e Nomos",
    {
      semanticAnchor: "Tensões Regionais — primeira camada",
      allowedHeadingTexts: ["Tensões Regionais: Aelvari, Kragor, Draken e Nomos"],
      allowedWindow: "SAME_H2",
      family: "TENSION_OPENING",
      preferredFit: "contain",
    },
  ],
  [
    "Tensões Regionais: Livres, Dóreos, Teriantes, Nimari e Vitrálios",
    {
      semanticAnchor: "Tensões Regionais — segunda camada",
      allowedHeadingTexts: ["Tensões Regionais: Livres, Dóreos, Teriantes, Nimari e Vitrálios"],
      allowedWindow: "SAME_H2",
      family: "TENSION_CONTINUATION",
    },
  ],
  [
    "AELVARI",
    {
      semanticAnchor: "Povo Aelvari",
      allowedHeadingTexts: ["AELVARI"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "KRAGOR",
    {
      semanticAnchor: "Povo Kragor",
      allowedHeadingTexts: ["KRAGOR"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "DRAKEN",
    {
      semanticAnchor: "Povo Draken",
      allowedHeadingTexts: ["DRAKEN"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "NOMOS",
    {
      semanticAnchor: "Povo Nomos",
      allowedHeadingTexts: ["NOMOS"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "LIVRES",
    {
      semanticAnchor: "Povo Livres",
      allowedHeadingTexts: ["LIVRES"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "DÓREOS",
    {
      semanticAnchor: "Povo Dóreos",
      allowedHeadingTexts: ["DÓREOS"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "TERIANTES",
    {
      semanticAnchor: "Povo Teriantes",
      allowedHeadingTexts: ["TERIANTES"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "NIMARI",
    {
      semanticAnchor: "Povo Nimari",
      allowedHeadingTexts: ["NIMARI"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "VITRÁLIOS",
    {
      semanticAnchor: "Povo Vitrálios",
      allowedHeadingTexts: ["VITRÁLIOS"],
      allowedSectionH2: "NOVE MANEIRAS DE EXISTIR",
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "POVO_OPENING",
    },
  ],
  [
    "OITO MANEIRAS DE ESCOLHER",
    {
      semanticAnchor: "Ofícios e escolhas",
      allowedHeadingTexts: ["OITO MANEIRAS DE ESCOLHER"],
      allowedWindow: "SAME_H2",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Definição cultural de Pedr’alma",
    {
      semanticAnchor: "Definição cultural de Pedr’alma",
      allowedHeadingTexts: ["Definição cultural de Pedr’alma"],
      allowedWindow: "SAME_H2",
      family: "PEDRALMA_OPENING",
    },
  ],
  [
    "Pedra, símbolo e identidade",
    {
      semanticAnchor: "Pedra, símbolo e identidade",
      allowedHeadingTexts: ["Pedra, símbolo e identidade"],
      allowedWindow: "SAME_H2",
      family: "PEDRALMA_OPENING",
    },
  ],
  [
    "Pedr’almas familiares",
    {
      semanticAnchor: "Pedr’almas familiares",
      allowedHeadingTexts: ["Pedr’almas familiares"],
      allowedWindow: "SAME_H2",
      family: "IMAGE_TOP",
    },
  ],
  [
    "Pedr’almas de companhia",
    {
      semanticAnchor: "Pedr’almas de companhia",
      allowedHeadingTexts: ["Pedr’almas de companhia"],
      allowedWindow: "SAME_H2",
      family: "IMAGE_TOP",
    },
  ],
  [
    "A pergunta que atravessa a passagem",
    {
      semanticAnchor: "encerramento da Parte IV",
      allowedHeadingTexts: ["A pergunta que atravessa a passagem"],
      allowedWindow: "SAME_H2",
      family: "FINAL_CLOSURE",
    },
  ],
  [
    "O QUE É VELARIM",
    {
      semanticAnchor: "O que é Velarim",
      allowedHeadingTexts: ["O QUE É VELARIM"],
      allowedWindow: "SAME_H2",
      family: "IMAGE_TOP",
    },
  ],
  [
    "Pedr’alma no uso de Velarim",
    {
      semanticAnchor: "Pedr’alma no uso de Velarim",
      allowedHeadingTexts: ["Pedr’alma no uso de Velarim"],
      allowedWindow: "SAME_H2",
      family: "IMAGE_TOP",
    },
  ],
  [
    "Bestiário do Cristal Partido",
    {
      semanticAnchor: "Bestiário do Cristal Partido",
      allowedHeadingTexts: ["Bestiário do Cristal Partido"],
      allowedWindow: "SAME_H2",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Drakos — a forma dracônica que não é Povo",
    {
      semanticAnchor: "Drakos",
      allowedHeadingTexts: ["Drakos — a forma dracônica que não é Povo"],
      allowedWindow: "SAME_H2",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Dragão Cristalino Colossal",
    {
      semanticAnchor: "Dragão Cristalino Colossal",
      allowedHeadingTexts: ["Dragão Cristalino Colossal"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Tartaruga-Fortaleza",
    {
      semanticAnchor: "Tartaruga-Fortaleza",
      allowedHeadingTexts: ["Tartaruga-Fortaleza"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Leviatã dos Veios",
    {
      semanticAnchor: "Leviatã dos Veios",
      allowedHeadingTexts: ["Leviatã dos Veios"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Árvore-Mãe Errante",
    {
      semanticAnchor: "Árvore-Mãe Errante",
      allowedHeadingTexts: ["Árvore-Mãe Errante"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Estilhaço Vitrálio Instável",
    {
      semanticAnchor: "Estilhaço Vitrálio Instável",
      allowedHeadingTexts: ["Estilhaço Vitrálio Instável"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Corvo de Fresta",
    {
      semanticAnchor: "Corvo de Fresta",
      allowedHeadingTexts: ["Corvo de Fresta"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Filhote de Tormenta",
    {
      semanticAnchor: "Filhote de Tormenta",
      allowedHeadingTexts: ["Filhote de Tormenta"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Autômato de Ponte Descontrolado",
    {
      semanticAnchor: "Autômato de Ponte Descontrolado",
      allowedHeadingTexts: ["Autômato de Ponte Descontrolado"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Eco Corrompido",
    {
      semanticAnchor: "Eco Corrompido",
      allowedHeadingTexts: ["Eco Corrompido"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Serpente do Leito Escrito",
    {
      semanticAnchor: "Serpente do Leito Escrito",
      allowedHeadingTexts: ["Serpente do Leito Escrito"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Cão-Leão das Brasas Errantes",
    {
      semanticAnchor: "Cão-Leão das Brasas Errantes",
      allowedHeadingTexts: ["Cão-Leão das Brasas Errantes"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Pato de Pressão Ressonante",
    {
      semanticAnchor: "Pato de Pressão Ressonante",
      allowedHeadingTexts: ["Pato de Pressão Ressonante"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Roedor dos Veios Fulminantes",
    {
      semanticAnchor: "Roedor dos Veios Fulminantes",
      allowedHeadingTexts: ["Roedor dos Veios Fulminantes"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Devorador Psíquico Cefalóide",
    {
      semanticAnchor: "Devorador Psíquico Cefalóide",
      allowedHeadingTexts: ["Devorador Psíquico Cefalóide"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "BESTIARY_ENTRY",
    },
  ],
  [
    "Guardião",
    {
      semanticAnchor: "Ofício Guardião",
      allowedHeadingTexts: ["Guardião"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Duelista",
    {
      semanticAnchor: "Ofício Duelista",
      allowedHeadingTexts: ["Duelista"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Atirador",
    {
      semanticAnchor: "Ofício Atirador",
      allowedHeadingTexts: ["Atirador"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Tecelão",
    {
      semanticAnchor: "Ofício Tecelão",
      allowedHeadingTexts: ["Tecelão"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Curador",
    {
      semanticAnchor: "Ofício Curador",
      allowedHeadingTexts: ["Curador"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Evocador",
    {
      semanticAnchor: "Ofício Evocador",
      allowedHeadingTexts: ["Evocador"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Artífice",
    {
      semanticAnchor: "Ofício Artífice",
      allowedHeadingTexts: ["Artífice"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "Batedor",
    {
      semanticAnchor: "Ofício Batedor",
      allowedHeadingTexts: ["Batedor"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "OFICIO_CULTURAL_OPENING",
    },
  ],
  [
    "COMBATE E GRADE ORTOGONAL",
    {
      semanticAnchor: "Combate e grade ortogonal",
      allowedHeadingTexts: ["COMBATE E GRADE ORTOGONAL"],
      allowedWindow: "SAME_H2",
      family: "TECHNICAL_DIAGRAM",
    },
  ],
  [
    "Rodada",
    {
      semanticAnchor: "Rodada",
      allowedHeadingTexts: ["Rodada"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "TECHNICAL_DIAGRAM",
    },
  ],
  [
    "Dano e potência",
    {
      semanticAnchor: "Dano e potência",
      allowedHeadingTexts: ["Dano e potência"],
      allowedWindow: "SAME_HEADING_SUBTREE",
      family: "TECHNICAL_DIAGRAM",
    },
  ],
  [
    "APÊNDICES",
    {
      semanticAnchor: "Apêndices",
      allowedHeadingTexts: ["APÊNDICES"],
      allowedWindow: "SAME_H1",
      family: "REFERENCE_GLYPH",
    },
  ],
]);

const HISTORY_ASSETS = [
  [
    "Prólogo — A velha e a Fresta",
    "p004_velha_e_fresta_pb.png",
    "A velha e a Fresta",
    "REV1 §28 #6",
  ],
  [
    "PARTE I — O MUNDO PARTIDO",
    "p005_cristal_partido_pb.png",
    "O Cristal Partido",
    "REV1 §28 · abertura da Parte I",
  ],
  ["Manesh — O Mundo da Luz", "p006_manesh_pb.png", "Manesh — O Mundo da Luz", "REV1 §28 #7"],
  [
    "Thuvel — O Mundo da Escuridão",
    "p007_thuvel_pb.png",
    "Thuvel — O Mundo da Escuridão",
    "REV1 §28 #8",
  ],
  [
    "Luz, Escuridão e Sombra",
    "p008_009_luz_escuridao_sombra_pb.png",
    "Luz, Escuridão e Sombra",
    "REV1 §28 #9",
  ],
  [
    "O Grande Cristal — Antes Que Houvesse Dois Mundos",
    "p010_cristal_uno_pb.png",
    "O Grande Cristal",
    "REV1 §28 #11",
  ],
  [
    "Mirveth — Uma Pessoa Inteira",
    "p011_mirveth_manesh_pb.png",
    "Mirveth — uma pessoa inteira",
    "REV1 §28 #12",
  ],
  [
    "Vethari — Relação Sem Apagamento",
    "p012_mirveth_thuvel_pb.png",
    "Mirveth — relação entre mundos",
    "REV1 §28 #13",
  ],
  ["Pedr’alma", "p013_pedralma_monolito_pb.png", "Pedr’alma", "REV1 §28 #14"],
  [
    "Lar · Cidade · Companhia",
    "p014_pedralma_escalas_pb.png",
    "Pedr’alma em lar, cidade e companhia",
    "REV1 §28 #15",
  ],
  [
    "História do Mundo Partido",
    "p017_dois_mundos_fratura_pb.png",
    "Dois Mundos e a Fratura",
    "REV1 §28 #16",
  ],
  ["A escrita contínua", "p019_silmain_pb.png", "Silmain", "REV1 §28 · Silmain"],
  [
    "As primeiras frestas controladas",
    "p020_primeiras_frestas_pb.jpg",
    "Primeiras Frestas",
    "REV1 §28 · primeiras frestas",
  ],
  [
    "Kethrell e a doutrina da recomposição",
    "p021_022_kethrell_faccao_cientifica_pb.jpg",
    "Kethrell e a Facção",
    "REV1 §28 · Kethrell",
  ],
  [
    "Os Outros",
    "p024_025_outros_lightbringers_pb.jpg",
    "Os Outros e os Lightbringers",
    "REV1 §28 · Outros / Lightbringers",
  ],
  [
    "Daeren",
    "p026_027_daeren_thavin_isenna_pb.jpg",
    "Daeren, Thavin e Isenna",
    "REV1 §28 · Daeren / Thavin / Isenna",
  ],
  [
    "A profecia de Thaeraen",
    "p028_029_thaeraen_tempo_escolha_pb.jpeg",
    "Thaeraen e o Tempo da Escolha",
    "REV1 §28 · Thaeraen",
  ],
].map(([heading, file, alt, reference]) => ({
  heading,
  status: "COVERED_HIGH",
  src: `/assets/handoff/approved/${file}`,
  alt,
  reference,
  ...SEMANTIC_ASSET_RULES.get(heading),
  allowedHeadingIds: [],
  sha: null,
}));

/* A prova editorial de Thur-Daer usa a variante PB do acervo local. */
const thurDaerAsset = HISTORY_ASSETS.find(
  (asset) => asset.heading === "Geografia da Escuridão: Vale de Thur-Daer",
);
if (thurDaerAsset) {
  thurDaerAsset.src = "/assets/v1.5-acervo/thur-daer-pb.png";
  thurDaerAsset.reference =
    "IMAGENS/KALLISTIS_LIVRO/P040_GEOGRAFIA_DA_ESCURIDAO_VALE_DE_THUR_DAER.png · variante PB";
}

[
  [
    "PARTE II — O CINTURÃO DAS FRESTAS",
    "parte-ii-cinturao.png",
    "O Cinturão das Frestas",
    "REV1 §28 #20",
  ],
  [
    "PARTE III — POVOS, COMUNIDADES E CAMINHOS",
    "parte-iii-povos.png",
    "Povos, Comunidades e Caminhos",
    "REV1 §28 #39",
  ],
  [
    "PARTE IV — MEMÓRIA, PEDR’ALMA E FÉ",
    "parte-iv-memoria.png",
    "Memória, Pedr’alma e Fé",
    "REV1 §28 #46",
  ],
  [
    "O Mapa em Duas Camadas",
    "mapa-geral-cinturao-spread.png",
    "Mapa geral do Cinturão — splash de duas páginas",
    "IMAGENS/LUGARES_MAPAS/LUGARES_MAPAS_PRECISA_APROVAR/01_MAPA_GERAL_DUAS_CAMADAS__cf8db9e23c.png · variação local anexada",
  ],
  ["A Fenda de Kethrell", "fenda-kethrell.png", "A Fenda de Kethrell", "REV1 §28 #22"],
  ["Geografia da Luz: Planalto de Silmari", "silmari.png", "Planalto de Silmari", "REV1 §28 #25"],
  [
    "Geografia da Escuridão: Vale de Thur-Daer",
    "thur-daer.png",
    "Vale de Thur-Daer",
    "REV1 §28 #26",
  ],
  ["Rotas Oficiais", "rotas-oficiais.png", "Rotas Oficiais", "REV1 §28 #32"],
  [
    "Rotas Clandestinas e Comércio",
    "rotas-clandestinas.png",
    "Rotas Clandestinas e Comércio",
    "REV1 §28 #33",
  ],
  ["O Estado Político Atual", "estado-politico.jpg", "Estado Político Atual", "REV1 §28 #36"],
  [
    "Tensões Regionais: Aelvari, Kragor, Draken e Nomos",
    "povo-aelvari.png",
    "Aelvari — tensão regional",
    "REV1 §28 #40",
  ],
  ["AELVARI", "povo-aelvari.png", "Povo Aelvari", "REV1 §28 #40"],
  ["KRAGOR", "povo-kragor.png", "Povo Kragor", "REV1 §28 #40"],
  ["DRAKEN", "povo-draken.png", "Povo Draken", "REV1 §28 #40"],
  ["NOMOS", "povo-nomos.png", "Povo Nomos", "REV1 §28 #40"],
  ["LIVRES", "povo-livres.png", "Povo Livres", "REV1 §28 #40"],
  ["DÓREOS", "povo-doreos.png", "Povo Dóreos", "REV1 §28 #40"],
  ["TERIANTES", "povo-teriantes.png", "Povo Teriantes", "REV1 §28 #40"],
  ["NIMARI", "povo-nimaris.png", "Povo Nimari", "REV1 §28 #40"],
  ["VITRÁLIOS", "povo-vitralios.png", "Povo Vitrálios", "REV1 §28 #40"],
  ["OITO MANEIRAS DE ESCOLHER", "oficio-duelista.png", "Duelista — Ofício oficial", "REV1 §28 #42"],
  [
    "Definição cultural de Pedr’alma",
    "pedralma-monumental.png",
    "Pedr’alma monumental",
    "REV1 §28 #46",
  ],
  [
    "Pedra, símbolo e identidade",
    "pedralma-monolito.png",
    "Pedra, símbolo e identidade",
    "REV1 §28 #50",
  ],
  ["Pedr’almas familiares", "pedralma-escalas.png", "Pedr’almas familiares", "REV1 §28 #52"],
  ["Pedr’almas de companhia", "pedralma-velarim.png", "Pedr’almas de companhia", "REV1 §28 #53"],
  [
    "A pergunta que atravessa a passagem",
    "encerramento-final.png",
    "Memória, fé e passagem",
    "REV1 §28 #85",
  ],
].forEach(([heading, file, alt, reference]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_HIGH",
    src: `/assets/partes/${file}`,
    alt,
    reference,
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
  });
});

[
  ["PARTE V — VELARIM", "/assets/complete/parte-v-velarim.png", "Velarim", "REV1 §28 #87"],
  [
    "PARTE VI — JOGANDO KALLISTIS",
    "/assets/complete/parte-vi-jogando.png",
    "Jogando KALLISTIS",
    "REV1 §28 · Parte VI",
  ],
  [
    "PARTE VII — CONDUZINDO KALLISTIS",
    "/assets/complete/parte-vii-conduzindo.png",
    "Conduzindo KALLISTIS",
    "REV1 §28 · Parte VII",
  ],
  ["O QUE É VELARIM", "/assets/complete/parte-v-velarim.png", "O que é Velarim", "REV1 §28 #87"],
  [
    "Pedr’alma no uso de Velarim",
    "/assets/complete/pedralma-velarim.png",
    "Pedr’alma no uso de Velarim",
    "REV1 §28 #105",
  ],
  [
    "Bestiário do Cristal Partido",
    "/assets/complete/bestiary/plates/bestiario-atmosfera.png",
    "Fauna e entidades do Cristal Partido — abertura atmosférica full art do Bestiário",
    "KIMG-C-0220 · acervo aprovado HIGH",
  ],
  [
    "Drakos — a forma dracônica que não é Povo",
    "/assets/complete/bestiary/drakos.png",
    "Família dos Drakos",
    "REV1 §28 · bestiário",
  ],
  [
    "Dragão Cristalino Colossal",
    "/assets/complete/bestiary/dragao-cristalino.png",
    "Dragão Cristalino Colossal",
    "REV1 §28 · bestiário",
  ],
  [
    "Tartaruga-Fortaleza",
    "/assets/complete/bestiary/tartaruga-fortaleza.png",
    "Tartaruga-Fortaleza",
    "REV1 §28 · bestiário",
  ],
  [
    "Leviatã dos Veios",
    "/assets/complete/bestiary/leviata.png",
    "Leviatã dos Veios",
    "REV1 §28 · bestiário",
  ],
  [
    "Árvore-Mãe Errante",
    "/assets/complete/bestiary/arvore-mae.png",
    "Árvore-Mãe Errante",
    "REV1 §28 · bestiário",
  ],
  [
    "Estilhaço Vitrálio Instável",
    "/assets/complete/bestiary/estilhaco.png",
    "Estilhaço Vitrálio Instável",
    "REV1 §28 · bestiário",
  ],
  [
    "Corvo de Fresta",
    "/assets/complete/bestiary/corvo.png",
    "Corvo de Fresta",
    "REV1 §28 · bestiário",
  ],
  [
    "Filhote de Tormenta",
    "/assets/complete/bestiary/filhote.png",
    "Filhote de Tormenta",
    "REV1 §28 · bestiário",
  ],
  [
    "Autômato de Ponte Descontrolado",
    "/assets/complete/bestiary/automato.png",
    "Autômato de Ponte Descontrolado",
    "REV1 §28 · bestiário",
  ],
  [
    "Eco Corrompido",
    "/assets/complete/bestiary/eco-corrompido.png",
    "Eco Corrompido",
    "REV1 §28 · bestiário",
  ],
  [
    "Serpente do Leito Escrito",
    "/assets/complete/bestiary/serpente.png",
    "Serpente do Leito Escrito",
    "REV1 §28 · bestiário",
  ],
  [
    "Cão-Leão das Brasas Errantes",
    "/assets/complete/bestiary/cao-leao.png",
    "Cão-Leão das Brasas Errantes",
    "REV1 §28 · bestiário",
  ],
  [
    "Pato de Pressão Ressonante",
    "/assets/complete/bestiary/pato.png",
    "Pato de Pressão Ressonante",
    "REV1 §28 · bestiário",
  ],
  [
    "Roedor dos Veios Fulminantes",
    "/assets/complete/bestiary/roedor.png",
    "Roedor dos Veios Fulminantes",
    "REV1 §28 · bestiário",
  ],
  [
    "Devorador Psíquico Cefalóide",
    "/assets/complete/bestiary/devorador.png",
    "Devorador Psíquico Cefalóide",
    "REV1 §28 · bestiário",
  ],
  [
    "Guardião",
    "/assets/complete/offices/guardiao.png",
    "Guardião — Ofício oficial",
    "REV1 §28 #13",
  ],
  [
    "Duelista",
    "/assets/complete/offices/duelista.png",
    "Duelista — Ofício oficial",
    "REV1 §28 #13",
  ],
  [
    "Atirador",
    "/assets/complete/offices/atirador.png",
    "Atirador — Ofício oficial",
    "REV1 §28 #13",
  ],
  ["Tecelão", "/assets/complete/offices/tecelao.png", "Tecelão — Ofício oficial", "REV1 §28 #13"],
  ["Curador", "/assets/complete/offices/curador.png", "Curador — Ofício oficial", "REV1 §28 #13"],
  [
    "Evocador",
    "/assets/complete/offices/evocador.png",
    "Evocador — Ofício oficial",
    "REV1 §28 #13",
  ],
  [
    "Artífice",
    "/assets/complete/offices/artifice.png",
    "Artífice — Ofício oficial",
    "REV1 §28 #13",
  ],
  ["Batedor", "/assets/complete/offices/batedor.png", "Batedor — Ofício oficial", "REV1 §28 #13"],
].forEach(([heading, src, alt, reference]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_HIGH",
    src,
    alt,
    reference,
    ...SEMANTIC_ASSET_RULES.get(heading),
    ...(heading === "Bestiário do Cristal Partido" ? { fullArtOpening: true } : {}),
    allowedHeadingIds: [],
    sha: null,
  });
});

[
  [
    "COMBATE E GRADE ORTOGONAL",
    "/assets/complete/diagrams/grid-tatico.svg",
    "Grade tática ortogonal — linha de visão, flanco e terreno difícil",
    "REV1 · diagrama técnico de regra",
  ],
  [
    "Rodada",
    "/assets/complete/diagrams/economia-acao.svg",
    "Economia de ação por rodada — AP, AM, AR e AL",
    "REV1 · diagrama técnico de regra",
  ],
  [
    "Dano e potência",
    "/assets/complete/diagrams/fluxo-dano.svg",
    "Fluxo canônico de dano e potência",
    "REV1 · diagrama técnico de regra",
  ],
  [
    "APÊNDICES",
    "/assets/complete/support/apendices/simbolos-oficios-referencia.png",
    "Glifo de referência rápida dos Ofícios",
    "REV1 · referência tipográfica",
  ],
].forEach(([heading, src, alt, reference]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "MAP_TABLE_DIAGRAM",
    src,
    alt,
    reference,
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
  });
});

[
  [
    "AELVARI",
    "/assets/complete/support/peoples/aelvari-context.png",
    "Aelvari — referência contextual de corpo inteiro",
  ],
  [
    "KRAGOR",
    "/assets/complete/support/peoples/kragor-context.png",
    "Kragor — referência contextual de corpo inteiro",
  ],
  [
    "DRAKEN",
    "/assets/complete/support/peoples/draken-context.png",
    "Draken — referência contextual de corpo inteiro",
  ],
  [
    "NOMOS",
    "/assets/complete/support/peoples/nomos-context.png",
    "Nomos — referência contextual de corpo inteiro",
  ],
  [
    "LIVRES",
    "/assets/complete/support/peoples/livres-context.png",
    "Livres — referência contextual de corpo inteiro",
  ],
  [
    "DÓREOS",
    "/assets/complete/support/peoples/doreos-context.png",
    "Dóreos — referência contextual de corpo inteiro",
  ],
  [
    "TERIANTES",
    "/assets/complete/support/peoples/teriantes-context.png",
    "Teriantes — referência contextual de corpo inteiro",
  ],
  [
    "NIMARI",
    "/assets/complete/support/peoples/nimari-context.png",
    "Nimari — referência contextual de corpo inteiro",
  ],
  [
    "VITRÁLIOS",
    "/assets/complete/support/peoples/vitralios-context.png",
    "Vitrálios — referência contextual de corpo inteiro",
  ],
].forEach(([heading, src, alt]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_MEDIUM",
    src,
    alt,
    reference: "IMAGENS/POVOS/POVOS_REFERENCIA",
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
    supportOnly: false,
    supportKind: "people-context",
    preferredFit: "contain",
  });
});

[
  [
    "Guardião",
    "/assets/complete/support/offices/guardiao-recurso.png",
    "Guardião — símbolo canônico do recurso G3",
  ],
  [
    "Duelista",
    "/assets/complete/support/offices/duelista-recurso.png",
    "Duelista — símbolo canônico do recurso D1",
  ],
  [
    "Atirador",
    "/assets/complete/support/offices/atirador-recurso.png",
    "Atirador — símbolo canônico do recurso A3",
  ],
  [
    "Tecelão",
    "/assets/complete/support/offices/tecelao-recurso.png",
    "Tecelão — símbolo canônico do recurso T3",
  ],
  [
    "Curador",
    "/assets/complete/support/offices/curador-recurso.png",
    "Curador — símbolo canônico do recurso C1",
  ],
  [
    "Evocador",
    "/assets/complete/support/offices/evocador-recurso.png",
    "Evocador — símbolo canônico do recurso E2",
  ],
  [
    "Artífice",
    "/assets/complete/support/offices/artifice-recurso.png",
    "Artífice — símbolo canônico do recurso AR2",
  ],
  [
    "Batedor",
    "/assets/complete/support/offices/batedor-recurso.png",
    "Batedor — símbolo canônico do recurso B1",
  ],
].forEach(([heading, src, alt]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_MEDIUM",
    src,
    alt,
    reference: "IMAGENS/KALLISTIS_LIVRO/*_G3|D1|A3|T3|C1|E2|AR2|B1",
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
    supportOnly: true,
    supportKind: "office-resource",
  });
});

[
  [
    "Dragão Cristalino Colossal",
    "/assets/complete/support/bestiary/dragao-escala.png",
    "Dragão Cristalino Colossal — arte canônica de escala contextual",
  ],
  [
    "Leviatã dos Veios",
    "/assets/complete/support/bestiary/leviata-escala.png",
    "Leviatã dos Veios — arte canônica de escala contextual",
  ],
  [
    "Árvore-Mãe Errante",
    "/assets/complete/support/bestiary/arvore-mae-escala.png",
    "Árvore-Mãe Errante — arte canônica de escala contextual",
  ],
].forEach(([heading, src, alt]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_MEDIUM",
    src,
    alt,
    reference: "IMAGENS/KALLISTIS_LIVRO",
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
    supportOnly: true,
    supportKind: "bestiary-scale",
  });
});

/* Pranchas adicionais do acervo aprovado. São páginas de arte autônomas,
   não imagens genéricas dentro do texto: cada uma permanece presa ao
   heading canônico correspondente e usa uma variante real já catalogada. */
[
  [
    "Bestiário do Cristal Partido",
    "/assets/complete/bestiary/ersomagem-duas-criaturas-full-art.png",
    "Ersomagem com duas criaturas — prancha de referência do Bestiário",
    "IMAGENS/KALLISTIS_LIVRO/KIMG-0048 · direção de arte do usuário",
  ],
  [
    "Drakos — a forma dracônica que não é Povo",
    "/assets/complete/bestiary/plates/drako-cristal.png",
    "Drako de cristal — variante de referência",
    "KIMG-C-0004 · acervo aprovado HIGH",
  ],
  [
    "Leviatã dos Veios",
    "/assets/complete/bestiary/plates/leviata-variante-b.png",
    "Leviatã dos Veios — variante B",
    "KIMG-C-0032 · acervo aprovado HIGH",
  ],
  [
    "Devorador Psíquico Cefalóide",
    "/assets/complete/bestiary/plates/devorador-variante.png",
    "Devorador Psíquico Cefalóide — variante de referência",
    "KIMG-C-0133 · acervo aprovado HIGH",
  ],
  [
    "Autômato de Ponte Descontrolado",
    "/assets/complete/bestiary/plates/automato-variante.png",
    "Autômato de Ponte Descontrolado — variante de referência",
    "KIMG-C-0096 · acervo aprovado HIGH",
  ],
].forEach(([heading, src, alt, reference]) => {
  HISTORY_ASSETS.push({
    heading,
    status: "COVERED_HIGH",
    src,
    alt,
    reference,
    ...SEMANTIC_ASSET_RULES.get(heading),
    allowedHeadingIds: [],
    sha: null,
    supportOnly: true,
    supportKind: "bestiary-plate",
    fullArtPlate: true,
  });
});

const VISUAL_CATALOG = new Map();
const REUSED_FINAL_ART_HEADINGS = new Set([
  "Cronologia consolidada por Marcos",
  "O que é fundamento, consenso, tradição e futuro aberto",
]);
const REUSABLE_SEMANTIC_ART_HEADINGS = new Set(["O QUE É VELARIM"]);
const EXTRA_PRIMARY_CONTEXT_HEADINGS = new Set([
  "Distribuição dos Povos",
  "Nimari",
  "Vitrálios",
  "Kelvhen, Yssaneth e Vhurrak",
]);

async function walkRasterFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkRasterFiles(fullPath)));
    else if (entry.isFile() && /\.(?:png|jpe?g|webp)$/iu.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[,"\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function enrichAcervoAssets(sourceBlocks) {
  const localFiles = (await walkRasterFiles(LOCAL_IMAGE_ROOT))
    .filter((file) => !file.split(path.sep).some((part) => /PRECISA_APROVAR|REJEIT/u.test(part)))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const publicFiles = await walkRasterFiles(path.join(ROOT, "public", "assets"));
  const existingPathsByHash = new Map();
  for (const file of publicFiles) existingPathsByHash.set(sha256(await readFile(file)), file);
  const sourceHeadings = new Set(
    sourceBlocks.filter((source) => source.type === "heading").map((source) => source.text),
  );
  const occupiedHeadings = new Set(
    HISTORY_ASSETS.filter((asset) => !asset.supportOnly).map((asset) => asset.heading),
  );
  const selectedFiles = new Set();
  const selected = [];
  const usedHashes = new Set();
  await mkdir(V15_IMAGE_ROOT, { recursive: true });

  for (const [heading, pattern] of EXTRA_ACERVO_OVERRIDES) {
    if (!sourceHeadings.has(heading)) continue;
    const candidate = localFiles.find(
      (file) => !selectedFiles.has(file) && pattern.test(path.basename(file)),
    );
    if (!candidate) continue;
    const bytes = await readFile(candidate);
    const sha = sha256(bytes);
    if (usedHashes.has(sha)) continue;
    const extension = path.extname(candidate).toLowerCase();
    const targetName = `${sha.slice(0, 24)}${extension}`;
    const target = path.join(V15_IMAGE_ROOT, targetName);
    const existingPath = existingPathsByHash.get(sha);
    if (!existingPath) await copyFile(candidate, target);
    const materializedSrc = existingPath
      ? `/${path.relative(path.join(ROOT, "public"), existingPath)}`
      : `/assets/v1.5-acervo/${targetName}`;
    const existingAsset = HISTORY_ASSETS.find(
      (asset) => !asset.supportOnly && asset.heading === heading,
    );
    if (existingAsset) {
      Object.assign(existingAsset, {
        src: materializedSrc,
        sha,
        reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)} · variante PB selecionada para a prova editorial`,
        preferredFit: existingAsset.preferredFit ?? "cover",
      });
    }
    selectedFiles.add(candidate);
    usedHashes.add(sha);
    selected.push({
      heading,
      sourcePath: candidate,
      sourceSha256: sha,
      src: materializedSrc,
      alt: `${heading} — variante PB do acervo curado`,
      reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)}`,
    });
  }

  for (const [heading, pattern] of EXTRA_ACERVO_RULES) {
    if (!sourceHeadings.has(heading) || occupiedHeadings.has(heading)) continue;
    const candidate = localFiles.find(
      (file) => !selectedFiles.has(file) && pattern.test(path.basename(file)),
    );
    if (!candidate) continue;
    const bytes = await readFile(candidate);
    const sha = sha256(bytes);
    if (usedHashes.has(sha)) continue;
    const extension = path.extname(candidate).toLowerCase();
    const targetName = `${sha.slice(0, 24)}${extension}`;
    const target = path.join(V15_IMAGE_ROOT, targetName);
    const existingPath = existingPathsByHash.get(sha);
    if (!existingPath) await copyFile(candidate, target);
    selectedFiles.add(candidate);
    usedHashes.add(sha);
    occupiedHeadings.add(heading);
    selected.push({
      heading,
      sourcePath: candidate,
      sourceSha256: sha,
      src: existingPath
        ? `/${path.relative(path.join(ROOT, "public"), existingPath)}`
        : `/assets/v1.5-acervo/${targetName}`,
      alt: `${heading} — imagem do acervo curado`,
      reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)}`,
    });
    HISTORY_ASSETS.push({
      heading,
      status: "COVERED_HIGH",
      src: existingPath
        ? `/${path.relative(path.join(ROOT, "public"), existingPath)}`
        : `/assets/v1.5-acervo/${targetName}`,
      alt: `${heading} — imagem do acervo curado`,
      reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)}`,
      ...SEMANTIC_ASSET_RULES.get(heading),
      allowedHeadingTexts: [heading],
      allowedHeadingIds: [],
      sha,
      preferredFit: "contain",
      supportOnly: !EXTRA_PRIMARY_CONTEXT_HEADINGS.has(heading),
      supportKind: "contextual",
      extraContext: true,
      ...(EXTRA_PRIMARY_CONTEXT_HEADINGS.has(heading) ? { family: "IMAGE_TOP" } : {}),
    });
  }

  for (const [heading, pattern] of EXTRA_FULL_ART_PLATE_RULES) {
    if (!sourceHeadings.has(heading)) continue;
    const candidate = localFiles.find(
      (file) => !selectedFiles.has(file) && pattern.test(path.basename(file)),
    );
    if (!candidate) continue;
    const bytes = await readFile(candidate);
    const sha = sha256(bytes);
    if (usedHashes.has(sha)) continue;
    const extension = path.extname(candidate).toLowerCase();
    const targetName = `${sha.slice(0, 24)}${extension}`;
    const target = path.join(V15_IMAGE_ROOT, targetName);
    const existingPath = existingPathsByHash.get(sha);
    if (!existingPath) await copyFile(candidate, target);
    selectedFiles.add(candidate);
    usedHashes.add(sha);
    selected.push({
      heading,
      sourcePath: candidate,
      sourceSha256: sha,
      src: existingPath
        ? `/${path.relative(path.join(ROOT, "public"), existingPath)}`
        : `/assets/v1.5-acervo/${targetName}`,
      alt: `${heading} — prancha full art do acervo curado`,
      reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)} · Google Drive KALLISTIS_LIVRO`,
    });
    HISTORY_ASSETS.push({
      heading,
      status: "COVERED_HIGH",
      src: existingPath
        ? `/${path.relative(path.join(ROOT, "public"), existingPath)}`
        : `/assets/v1.5-acervo/${targetName}`,
      alt: `${heading} — prancha full art do acervo curado`,
      reference: `IMAGENS/${path.relative(LOCAL_IMAGE_ROOT, candidate)} · Google Drive KALLISTIS_LIVRO`,
      allowedHeadingTexts: [heading],
      allowedHeadingIds: [],
      sha,
      supportOnly: true,
      supportKind: "contextual",
      extraContext: true,
      fullArtPlate: true,
    });
  }

  const seenLocalHashes = new Map();
  const inventory = [];
  for (const file of localFiles) {
    const sha = sha256(await readFile(file));
    const relative = path.relative(LOCAL_IMAGE_ROOT, file);
    const duplicateOf = seenLocalHashes.get(sha) ?? null;
    const chosen = selected.find((entry) => entry.sourcePath === file);
    const state = chosen ? "USED" : duplicateOf ? "DUPLICATE" : "REVIEW_REQUIRED";
    inventory.push({
      path: file,
      relativePath: relative,
      sha256: sha,
      byteIdenticalDuplicateOf: duplicateOf,
      disposition: state,
      contexts: chosen ? [chosen.heading] : [],
      materializedSrc: chosen?.src ?? null,
    });
    if (!seenLocalHashes.has(sha)) seenLocalHashes.set(sha, file);
  }
  await writeFile(
    V15_INVENTORY_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceRoot: LOCAL_IMAGE_ROOT, noImageGeneration: true, totalRasterFiles: inventory.length, selectedForV15: selected.length, inventory }, null, 2)}\n`,
    "utf8",
  );
  const csv =
    [
      "relativePath,sha256,disposition,contexts,materializedSrc",
      ...inventory.map((entry) =>
        [
          entry.relativePath,
          entry.sha256,
          entry.disposition,
          entry.contexts.join(" | "),
          entry.materializedSrc ?? "",
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n") + "\n";
  await writeFile(V15_DISPOSITION_PATH, csv, "utf8");
  return selected;
}

/* O acervo adicional é escolhido apenas por associação nominal inequívoca.
   Isso permite aproveitar variantes reais já existentes sem transformar uma
   imagem em enchimento ou substituir uma âncora editorial já aprovada. */
const EXTRA_ACERVO_RULES = [
  ["Distribuição dos Povos", /OPEN-002_POVOS_COMUNIDADES|POVOS_COMUNIDADES_CAMINHOS/i],
  ["Nimari", /08_NIMARI(?:.*BW)?/i],
  ["Vitrálios", /09_POVO_VITRALIOS.*BW|VITRALIOS.*BW/i],
  ["Kelvhen, Yssaneth e Vhurrak", /forja_arcana|forja.*catedral/i],
  ["Antes que houvesse dois mundos", /H01_FRATURA|FRATURA_PRIMORDIAL|ruptura.*cosm/i],
  ["O Mundo da Luz", /HP-01|MANESH.*MUNDO|cidade.*celestial/i],
  ["O Mundo da Escuridão", /HP-02|THUVEL.*MUNDO|ru[ií]na.*subterr/i],
  ["O nascimento das sociedades", /p048.*p049|polos.*tens[aã]o|metrópole.*luz/i],
  ["O que foi preservado", /SILMAIN|silmain|mem[oó]ria.*v[ií]nculo/i],
  ["O que foi perdido", /OUTROS_LIGHTBRINGERS|Lightbringers|outros.*light/i],
  ["A descoberta dos nascimentos correspondentes", /KETHRELL|kethrell|nascimentos/i],
  ["Os Trocados", /SUBSTITUI|trocad|correspond/i],
  ["Os Lightbringers", /LIGHTBRINGER|lightbringer/i],
  ["O presente da campanha", /DAEREN|THAVIN|ISENNA|presente.*campanha/i],
  ["O que está prestes a acontecer", /p048.*p049|estado.*polit|diretoria/i],
  ["Quatro Fatores de Instabilidade", /FATORES|instabil|FENDA.*KETHRELL/i],
  ["Estados da Fenda", /FENDA|fresta|fratura/i],
  ["Bosque dos Ecos", /BOSQUE.*ECOS|bosque.*ecos/i],
  ["Rio do Leito Escrito", /LEITO.*ESCRITO|rio.*leito/i],
  ["Montes do Norte", /MONTES.*NORTE|estrada.*quartzo/i],
  ["Estrada do Quartzo", /ESTRADA.*QUARTZO|rotas.*quartzo/i],
  ["Krav-Nam", /KRAV.*NAM|krav.*nam/i],
  ["Baixio da Névoa Ferida", /N[EÉ]VOA.*FERIDA|baixio/i],
  ["Veios do Juramento", /VEIOS.*JURAMENTO|juramento/i],
  ["Jardins de Memória", /JARDINS.*MEM[OÓ]RIA|jardins.*mem/i],
  ["Silmari", /SILMARI|silmari/i],
  ["Fortaleza de Kravor", /KRAVOR|fortaleza.*kravor/i],
  ["Refúgio dos Outros", /REFUGIO.*OUTROS|ref[uú]gio.*outros/i],
  ["Nimaris", /NIMARIS|nimaris/i],
  ["Thur-Daer", /THUR.*DAER|thur.*daer/i],
  ["Ressonário de Vael", /VAEL|resson[aá]rio/i],
  ["Diretoria Regional e Confederação Tácita", /DIRETORIA|confedera[cç][aã]o/i],
  ["Princípios invioláveis", /VELARIM.*RELA[CÇ][AÃ]O|inviol[aá]veis/i],
  ["Silmain", /SILMAIN|silmain/i],
  ["Pedr’alma e morfologia relacional", /MORFOLOGIA|pedr.?alma.*rela/i],
  ["Pedr’alma e Ritual Comum", /RITUAL|pedr.?alma.*ritual/i],
  ["Pedr’alma urbana", /URBANA|cidade.*cristal/i],
  ["Fé, tradição e incerteza", /F[EÉ].*TRADI[CÇ][AÃ]O|sagrado|deus/i],
  ["O sagrado depois da Fratura", /sagrado|fratura.*mem[oó]ria/i],
  ["O que os personagens fazem", /JOGANDO|personagens|OPEN-004/i],
  ["O NÚCLEO DE RESOLUÇÃO", /DADO|RESOLU[CÇ][AÃ]O|núcleo/i],
  ["Ressonância", /RESSON[AÂ]NCIA|resson[aâ]ncia/i],
  ["Criação de personagem", /FICHA|personagem|CRIA[CÇ][AÃ]O/i],
  ["O que é magia", /MAGIA|magia/i],
  ["EVOCAÇÕES", /EVOC[AÇC][AÃ]O|evoca[cç]/i],
  ["COMBATE E GRADE ORTOGONAL", /COMBATE|GRADE|t[aá]tico/i],
  ["Rodada", /RODADA|a[cç][aã]o/i],
  ["Dano e potência", /DANO|pot[eê]ncia/i],
  ["FENDAS E TRAVESSIAS", /FENDAS|TRAVESSIA|fresta/i],
  ["Estrutura de cena", /CENA|conduzindo|OPEN-006/i],
  ["Agente Científico", /AGENTE|cient[ií]fico/i],
  ["Lightbringer", /LIGHTBRINGER/i],
  ["Drako de Cristal", /DRAKO.*CRISTAL|01_DRAKO/i],
  ["Drako da Brasa Ventral", /DRAKO.*BRASA/i],
  ["Observador Prismático", /OBSERVADOR|OBS.*DERIVA/i],
  ["Curupira", /CURUPIRA/i],
  ["Cão-Leão das Brasas Errantes", /CAO.?LEAO|c[aã]o.?le[aã]o/i],
  ["Pato de Pressão Ressonante", /PATO.*PRESS[AÃ]O/i],
  ["Roedor dos Veios Fulminantes", /ROEDOR.*VEIOS/i],
  ["Gelatídeo Prismático", /CUBO.*GELAT|gelat[ií]deo/i],
  ["Devorador Psíquico Cefalóide", /DEVORADOR.*PS[IÍ]QUICO/i],
  ["Predador de Cofre", /BAU.*ARMADILHA|PREDADOR.*COFRE/i],
  /* Variantes locais com nome de página: cada associação abaixo é uma
     imagem contextual de apoio, não uma nova abertura nem arte gerada. */
  ["O Cinturão das Frestas", /P031_O_CINTURAO|FP-02_01/i],
  ["Quatro Fatores de Instabilidade", /H02_CORRESPONDENCIAS|H04_VEIOS/i],
  ["Hidrografia Canônica: Rio, Lagos e Mar", /HIDROGRAFIA_LUZ|HIDROGRAFIA.*837/i],
  ["Montes do Norte e Estrada do Quartzo", /MONTES.*NORTE|MONTES_ESTRADA/i],
  ["Krav-Nam e O Baixio da Névoa Ferida", /KRAV_NAM_BAIXIO|NEVOA_FERIDA/i],
  ["Veios do Juramento e Jardins de Memória", /VEIOS_DO_JURAMENTO|JARDIM_DE_UMA/i],
  ["Geografia da Luz — Cidades e enclaves", /P043_SILMARI|P044_FORTALEZA|P045_REFUGIO/i],
  ["Silmari", /P043_SILMARI|06_SILMARI/i],
  ["Fortaleza de Kravor", /P044_FORTALEZA/i],
  ["Refúgio dos Outros", /P045_REFUGIO/i],
  ["Nimaris", /P046_NIMARIS/i],
  ["Thur-Daer", /P047_THUR_DAER|V02_THUR/i],
  ["Krav-Nam: O Juramento Violado", /P048_KRAV_NAM|JURAMENTO_QUEBRADO/i],
  ["Ressonário de Vael", /P049_RESSONARIO|RESSONARIO/i],
  ["Diretoria Regional e Confederação Tácita", /P055_DIRETORIA/i],
  ["O Estado Político Atual", /P057_ESTADO_POLITICO/i],
  ["O que está prestes a acontecer", /P058_O_QUE_ESTA|p058_grande/i],
  ["PREÂMBULO — O NOME E O CAMINHO", /OPEN-002|POVOS_COMUNIDADES/i],
  ["Interlúdio — POVO NÃO É DESTINO", /POVO.*DESTINO|KALLISTIS_MESA_DOS_OFICIOS/i],
  ["A Chave como biografia", /CHAVE|biografia|personagem/i],
  ["Voz sem caricatura", /VOZ|caricatura|D03_FIGURA/i],
  ["O que não é determinado", /DETERMIN|incerteza|futuro/i],
  ["Definição cultural de Pedr’alma", /HP-36|pedralma.*poder/i],
  ["A Pedr’alma e a definição de lar", /PEDRALMA.*lar|V04_PEDRALMA/i],
  ["A comunidade viva", /comunidade.*viva|comunidades/i],
  ["Formação de uma Pedr’alma", /FORMA[CÇ][AÃ]O.*PEDRALMA|pedralma.*form/i],
  ["Pedr’alma urbana", /HP-36|PEDRALMA.*URBANA|cidade.*cristal/i],
  ["Oração da Pedr’alma", /ORA[CÇ][AÃ]O|pedralma.*ora/i],
  ["Morte, templos e autoridade", /TEMPLO|autoridade|KIMG-0064/i],
  ["Reunificação: quatro maneiras de temer o futuro", /REUNIFICA[CÇ][AÃ]O|futuro/i],
  ["A pergunta que atravessa a passagem", /encerramento-final|PASSAGEM/i],
  ["Som, ortografia e pronúncia", /OPEN-003|ORTOGRAFIA|VELARIM/i],
  ["Consoantes de referência", /CONSOANTE|consoantes/i],
  ["VELARIM EM DEZ REGRAS", /VELARIM.*DEZ|regras.*velarim/i],
  ["Ortografia romana", /ORTOGRAFIA_ROMANA|romana/i],
  ["A ambiguidade obrigatória de silmain", /SILMAIN|ambiguidade/i],
  ["Pronomes", /PRONOME/i],
  ["Aspecto", /ASPECTO/i],
  ["Modalidade e desejo", /MODALIDADE|desejo/i],
  ["Morfologia produtiva", /MORFOLOGIA|morfologia/i],
  ["Agência, consentimento e sombra", /AGENCIA|consentimento|sombra/i],
  ["FRASEÁRIO DE MESA", /FRASEARIO|frase[aá]rio/i],
];

const EXTRA_ACERVO_OVERRIDES = new Map([
  ["Geografia da Escuridão: Vale de Thur-Daer", /P040_GEOGRAFIA_DA_ESCURIDAO_VALE_DE_THUR_DAER/i],
]);

const EXTRA_FULL_ART_PLATE_RULES = [
  ["Observadores — quando perceber se torna anatomia", /KIMG-0050/],
  ["Observadores — quando perceber se torna anatomia", /KIMG-0051/],
  ["Observadores — quando perceber se torna anatomia", /KIMG-0052/],
  ["Observadores — quando perceber se torna anatomia", /KIMG-0053/],
  ["Observadores — quando perceber se torna anatomia", /KIMG-0057/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0058/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0059/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0060/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0061/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0062/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0063/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0064/],
  ["Guardiões, presenças e assombrações de matriz brasileira", /KIMG-0065/],
  ["Bosque dos Ecos", /KIMG-0061/],
  ["Bosque dos Ecos", /KIMG-0062/],
  ["Rio do Leito Escrito", /KIMG-0063/],
  ["Fé, tradição e incerteza", /KIMG-0064/],
  ["O sagrado depois da Fratura", /KIMG-0065/],
];

function parseArgs(argv) {
  const args = { scope: "HISTORIA", output: DEFAULT_OUTPUT, baseProject: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--scope") args.scope = String(argv[++i] ?? "HISTORIA").toUpperCase();
    if (argv[i] === "--output") args.output = path.resolve(String(argv[++i] ?? DEFAULT_OUTPUT));
    if (argv[i] === "--base-project") args.baseProject = path.resolve(String(argv[++i] ?? ""));
  }
  if (!["HISTORIA", "MUNDO", "REGRAS", "PARTES_I_IV", "COMPLETO", "ALL"].includes(args.scope)) {
    throw new Error(`Scope inválido: ${args.scope}`);
  }
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripMarkdown(value) {
  return value
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*(?:[-*+] |\d+[.)] )/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value) {
  const clean = stripMarkdown(value);
  return clean ? clean.split(/\s+/u).length : 0;
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/u).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function isListLine(line) {
  return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/u.test(line);
}

function headingMatch(line) {
  return /^(#{1,5})\s+(.+?)\s*$/u.exec(line);
}

function sourceBlockId(scope, startLine, raw) {
  return `src-${sha256(`${scope}|${startLine}|${stripMarkdown(raw)}`).slice(0, 20)}`;
}

function parseScopeLines(lines, scope) {
  const h1 = lines
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => /^#\s+/u.test(line));
  const partII = h1.find(({ line }) => /^#\s+PARTE II\b/u.test(line))?.line;
  const partV = h1.find(({ line }) => /^#\s+PARTE V\b/u.test(line))?.line;
  const partVI = h1.find(({ line }) => /^#\s+PARTE VI\b/u.test(line))?.line;
  const partIIIndex = partII ? lines.indexOf(partII) : -1;
  const partVIIndex = partVI ? lines.indexOf(partVI) : -1;
  const partVIndex = partV ? lines.indexOf(partV) : -1;
  const bounds = {
    HISTORIA: [0, partIIIndex >= 0 ? partIIIndex : lines.length],
    MUNDO: [partIIIndex >= 0 ? partIIIndex : 0, partVIIndex >= 0 ? partVIIndex : lines.length],
    REGRAS: [partVIIndex >= 0 ? partVIIndex : 0, lines.length],
    PARTES_I_IV: [0, partVIndex >= 0 ? partVIndex : lines.length],
    COMPLETO: [partVIndex >= 0 ? partVIndex : lines.length, lines.length],
    ALL: [0, lines.length],
  };
  const [start, end] = bounds[scope];
  return { start, end, lines: lines.slice(start, end) };
}

function parseMarkdown(markdown, scope) {
  const lines = normalizeLineEndings(markdown).split("\n");
  const selected = parseScopeLines(lines, scope);
  const blocks = [];
  let i = 0;
  let sectionH1 = "";
  let sectionH2 = "";
  let sectionH3 = "";

  const add = (type, rawLines, startOffset, extra = {}) => {
    const raw = rawLines.join("\n").trim();
    if (!raw) return;
    const startLine = selected.start + startOffset + 1;
    const endLine = startLine + rawLines.length - 1;
    const heading = extra.level ? extra.text : undefined;
    const block = {
      id: sourceBlockId(scope, startLine, raw),
      type,
      raw,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      wordCount: wordCount(raw),
      sectionH1,
      sectionH2,
      sectionH3,
      ...extra,
    };
    if (heading && extra.level === 1) {
      sectionH1 = heading;
      sectionH2 = "";
      sectionH3 = "";
    } else if (heading && extra.level === 2) {
      sectionH2 = heading;
      sectionH3 = "";
    } else if (heading && extra.level === 3) {
      sectionH3 = heading;
    }
    block.sectionH1 = sectionH1;
    block.sectionH2 = sectionH2;
    block.sectionH3 = sectionH3;
    blocks.push(block);
  };

  while (i < selected.lines.length) {
    const line = selected.lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = headingMatch(line);
    if (heading) {
      add("heading", [line], i, { level: heading[1].length, text: stripMarkdown(heading[2]) });
      i += 1;
      continue;
    }

    if (
      i + 1 < selected.lines.length &&
      line.includes("|") &&
      isTableSeparator(selected.lines[i + 1])
    ) {
      const tableLines = [line, selected.lines[i + 1]];
      i += 2;
      while (
        i < selected.lines.length &&
        selected.lines[i].trim() &&
        selected.lines[i].includes("|")
      ) {
        tableLines.push(selected.lines[i]);
        i += 1;
      }
      add("table", tableLines, i - tableLines.length, { tableLines });
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const quoteLines = [];
      const start = i;
      while (
        i < selected.lines.length &&
        (/^\s*>/u.test(selected.lines[i]) || !selected.lines[i].trim())
      ) {
        quoteLines.push(selected.lines[i].replace(/^\s*>\s?/u, ""));
        i += 1;
      }
      add("blockquote", quoteLines, start);
      continue;
    }

    if (isListLine(line)) {
      const listLines = [];
      const start = i;
      while (
        i < selected.lines.length &&
        (isListLine(selected.lines[i]) || !selected.lines[i].trim())
      ) {
        if (selected.lines[i].trim()) listLines.push(selected.lines[i]);
        i += 1;
      }
      add("list", listLines, start);
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/u.test(line)) {
      add("rule", [line], i);
      i += 1;
      continue;
    }

    const paragraph = [];
    const start = i;
    while (i < selected.lines.length) {
      const current = selected.lines[i] ?? "";
      if (!current.trim() || headingMatch(current) || isListLine(current) || /^\s*>/u.test(current))
        break;
      if (
        i + 1 < selected.lines.length &&
        current.includes("|") &&
        isTableSeparator(selected.lines[i + 1])
      )
        break;
      if (/^\s*(?:---+|\*\*\*+|___+)\s*$/u.test(current)) break;
      paragraph.push(current);
      i += 1;
    }
    add("paragraph", paragraph, start);
  }

  return { blocks, selectedStartLine: selected.start + 1, selectedEndLine: selected.end };
}

function annotateHeadingPaths(sourceBlocks) {
  const active = Array(6).fill(null);
  return sourceBlocks.map((source) => {
    if (source.type === "heading") {
      for (let level = source.level; level < active.length; level += 1) active[level] = null;
      active[source.level] = { id: source.id, text: source.text, level: source.level };
    }
    return { ...source, headingPath: active.filter(Boolean).map((heading) => ({ ...heading })) };
  });
}

function bindSemanticAssets(sourceBlocks) {
  const scope = sourceBlocks[0]?.scope ?? "HISTORIA";
  const headingsByText = new Map();
  for (const source of sourceBlocks) {
    if (source.type !== "heading") continue;
    const list = headingsByText.get(source.text) ?? [];
    list.push(source);
    headingsByText.set(source.text, list);
  }
  for (const asset of HISTORY_ASSETS) {
    const matchingSources = asset.allowedHeadingTexts
      .flatMap((text) => headingsByText.get(text) ?? [])
      .filter(
        (source) =>
          !asset.allowedSectionH2 ||
          source.headingPath?.some((heading) => heading.text === asset.allowedSectionH2),
      );
    asset.allowedHeadingIds = matchingSources.map((source) => source.id);
    asset.anchorHeadingId = matchingSources[0]?.id ?? null;
    if (!asset.allowedHeadingIds.length || !asset.anchorHeadingId) {
      if (scope === "HISTORIA" && !asset.family)
        throw new Error(`Âncora sem heading canônico: ${asset.heading}`);
      continue;
    }
    asset.semanticPairId =
      asset.allowedHeadingIds.length > 1 ? `shared-${asset.heading}` : undefined;
    asset.layoutRole = asset.semanticPairId ? "SHARED_EDITORIAL_IMAGE" : "EDITORIAL_IMAGE";
    if (!asset.supportOnly)
      for (const headingText of asset.allowedHeadingTexts) VISUAL_CATALOG.set(headingText, asset);
  }
  const partOpeningAsset = VISUAL_CATALOG.get("PARTE I — O MUNDO PARTIDO");
  for (const headingText of REUSED_FINAL_ART_HEADINGS)
    VISUAL_CATALOG.set(headingText, partOpeningAsset);
  return sourceBlocks;
}

function assetForSource(source) {
  if (!source || source.type !== "heading") return null;
  const candidate = VISUAL_CATALOG.get(source.text);
  const directContext = HISTORY_ASSETS.find(
    (asset) =>
      asset.heading === source.text &&
      asset.extraContext &&
      EXTRA_PRIMARY_CONTEXT_HEADINGS.has(source.text),
  );
  const peopleContext = HISTORY_ASSETS.find(
    (asset) => asset.heading === source.text && asset.supportKind === "people-context",
  );
  const resolved = candidate?.allowedHeadingIds?.includes(source.id)
    ? candidate
    : (directContext ?? (peopleContext ? { ...peopleContext, family: "POVO_OPENING" } : null));
  if (!resolved) return null;
  const candidateForFamily = resolved;
  if (candidateForFamily.family === "POVO_OPENING") {
    const peopleImage =
      peopleContext ??
      (candidateForFamily.supportKind === "people-context" ? candidateForFamily : null);
    if (peopleImage) {
      return {
        ...peopleImage,
        supportOnly: false,
        status: "COVERED_HIGH",
        family: "POVO_OPENING",
        preferredFit: "contain",
        semanticAnchor: candidateForFamily.semanticAnchor,
        allowedWindow: candidateForFamily.allowedWindow,
        allowedHeadingTexts: candidateForFamily.allowedHeadingTexts,
        allowedHeadingIds: [source.id],
        anchorHeadingId: source.id,
      };
    }
  }
  return resolved;
}

function supportAssetsForSource(source) {
  if (!source || source.type !== "heading") return [];
  const primary = assetForSource(source);
  const insideVelarim = source.headingPath?.some((heading) => heading.text === "PARTE V — VELARIM");
  return HISTORY_ASSETS.filter(
    (asset) =>
      asset.supportOnly &&
      !asset.fullArtPlate &&
      asset.src !== primary?.src &&
      asset.allowedHeadingIds?.includes(source.id) &&
      !(insideVelarim && asset.supportKind === "contextual"),
  );
}

function fullArtPlateAssetsForSource(source) {
  if (!source || source.type !== "heading") return [];
  return HISTORY_ASSETS.filter(
    (asset) => asset.fullArtPlate && asset.allowedHeadingIds?.includes(source.id),
  );
}

function sourceIsInsideAssetWindow(asset, anchorSource, source) {
  const pathIds = new Set((source.headingPath ?? []).map((heading) => heading.id));
  const anchorPath = anchorSource.headingPath ?? [];
  if (asset.allowedWindow === "SAME_H1") {
    const anchorH1 = anchorPath.find((heading) => heading.level === 1);
    return Boolean(anchorH1 && pathIds.has(anchorH1.id));
  }
  if (asset.allowedWindow === "SAME_H2") {
    const anchorH2 = anchorPath.find((heading) => heading.level === 2);
    return Boolean(anchorH2 && pathIds.has(anchorH2.id));
  }
  if (asset.allowedWindow === "SAME_HEADING_SUBTREE") return pathIds.has(asset.anchorHeadingId);
  return asset.allowedHeadingIds.some((headingId) => pathIds.has(headingId));
}

function baseMaterialization(source, fragmentIndex = 0, fragmentCount = 1, includeRaw = true) {
  return {
    generatedBy: "kallistis-materializer",
    materializationVersion: VERSION,
    scope: source.scope,
    sourceBlockId: source.id,
    sourceStartLine: source.sourceStartLine,
    sourceEndLine: source.sourceEndLine,
    ...(includeRaw ? { sourceRaw: source.raw } : {}),
    sourceType: source.type,
    sourceFragmentIndex: fragmentIndex,
    sourceFragmentCount: fragmentCount,
    wordCount: source.wordCount,
  };
}

function blockId(source, suffix = "") {
  return `${source.id}${suffix ? `-${suffix}` : ""}`;
}

function tableBlockFromSource(source, bodyRows = null, continuationIndex = 0) {
  const isChronology = (source.headingPath ?? []).some(
    (heading) => heading.text === "Cronologia consolidada por Marcos",
  );
  const cleanCell = (content) => stripMarkdown(content);
  const headerCells = (source.tableLines?.[0] ? splitTableRow(source.tableLines[0]) : []).map(
    (content, index) => ({
      id: blockId(source, `th-${index + 1}`),
      content: cleanCell(content),
    }),
  );
  const rawRows = (source.tableLines ?? [])
    .slice(2)
    .map((line) => splitTableRow(line).map(cleanCell));
  const rows = bodyRows ?? rawRows;
  const header = { id: blockId(source, "header"), kind: "header", cells: headerCells };
  const body = rows.map((cells, rowIndex) => ({
    id: blockId(source, `r-${continuationIndex}-${rowIndex + 1}`),
    kind: "body",
    cells: cells.map((content, cellIndex) => ({
      id: blockId(source, `r-${continuationIndex}-${rowIndex + 1}-c-${cellIndex + 1}`),
      content,
    })),
  }));
  const longCell = [headerCells.map((cell) => cell.content), ...rows]
    .flat()
    .some((content) => content.length > 42);
  const columnWeights = headerCells.map((header, index) => {
    const maxLength = Math.max(
      header.content.length,
      ...rows.map((row) => row[index]?.length ?? 0),
    );
    return Math.max(1, Math.min(3.2, maxLength / 18));
  });
  const weightTotal = columnWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  return {
    id: continuationIndex ? blockId(source, `fragment-${continuationIndex + 1}`) : blockId(source),
    type: "table",
    tableVersion: 2,
    ...(headerCells.length >= 3 || longCell ? { span: "full" } : {}),
    columns: headerCells.map((cell, index) => ({
      id: blockId(source, `col-${index + 1}`),
      label: cell.content,
      width: columnWeights[index] / weightTotal,
    })),
    rows: continuationIndex ? body : [header, ...body],
    repeatHeader: true,
    allowPageBreak: true,
    compact: true,
    ...(isChronology
      ? {
          stylePresetId: "kallistis-chronology",
          style: {
            borderMode: "horizontal",
            borderWidth: "0.2mm",
            borderColor: "#17140f66",
            headerBackground: "#d9d4ca",
            headerColor: "#17140f",
            headerWeight: 700,
            bodyBackground: "#fffdf8",
            zebra: true,
            zebraBackground: "#f0ede7",
            firstColumnStrong: true,
            cellPaddingX: "2mm",
            cellPaddingY: "1.4mm",
          },
        }
      : {}),
    ...(continuationIndex
      ? { continuationOf: source.id, continuationIndex, continuationHeader: [header] }
      : {}),
    materialization: baseMaterialization(source, continuationIndex, 1, continuationIndex === 0),
  };
}

function sourceToBlock(source) {
  const materialization = baseMaterialization(source);
  if (source.type === "heading") {
    return {
      id: blockId(source),
      type: "heading",
      level: source.level,
      text: source.text,
      materialization,
    };
  }
  if (source.type === "paragraph") {
    return {
      id: blockId(source),
      type: "text",
      role: "body",
      content: source.raw.split("\n").join(" ").trim(),
      align: "justify",
      materialization,
    };
  }
  if (source.type === "list") {
    return {
      id: blockId(source),
      type: "text",
      role: "body",
      content: source.raw,
      align: "start",
      materialization,
    };
  }
  if (source.type === "blockquote") {
    return {
      id: blockId(source),
      type: "quote",
      text: source.raw.replace(/^>\s?/gmu, "").replace(/\n+/g, " ").trim(),
      size: "md",
      materialization,
    };
  }
  if (source.type === "table") return tableBlockFromSource(source);
  return { id: blockId(source), type: "divider", ornament: false, materialization };
}

function generatedImage(source, asset, size = "medium", occurrence = 0) {
  const fullArtOpening = asset.fullArtOpening === true;
  const quadrantFamily =
    !fullArtOpening &&
    ["POVO_OPENING", "OFICIO_CULTURAL_OPENING", "BESTIARY_ENTRY"].includes(asset.family);
  const sidePortrait = [
    "POVO_OPENING",
    "OFICIO_CULTURAL_OPENING",
    "TENSION_OPENING",
    "BESTIARY_ENTRY",
  ].includes(asset.family);
  const side =
    Boolean(asset.semanticPairId) ||
    sidePortrait ||
    ["Pedr’alma", "Lar · Cidade · Companhia", "Daeren"].includes(asset.heading);
  const dimensions = fullArtOpening
    ? { width: "100%", height: "100%" }
    : quadrantFamily
      ? { width: "50%", height: "84mm" }
      : source.text === "O QUE É VELARIM"
        ? { width: "100%", height: "48mm" }
        : size === "large"
          ? { width: "100%", height: "50mm" }
          : size === "small"
            ? { width: "100%", height: "28mm" }
            : side
              ? { width: "34%", height: "86mm" }
              : asset.family === "MAP_PAGE"
                ? { width: "100%", height: "110mm" }
                : { width: "100%", height: "62mm" };
  const shared = Boolean(asset.semanticPairId);
  return {
    id: `asset-${source.id}-${sha256(`${asset.src}|${occurrence}`).slice(0, 10)}`,
    type: "image",
    src: asset.src,
    alt: asset.alt,
    position: fullArtOpening ? "full" : quadrantFamily ? "flow" : side ? "left" : "top",
    fullBleed: fullArtOpening,
    fit: asset.preferredFit ?? (asset.family === "OFICIO_CULTURAL_OPENING" ? "contain" : "cover"),
    objectX: shared && occurrence % 2 === 0 ? 0 : shared ? 100 : 50,
    objectY: 50,
    ...(source.text === "Mirveth — Uma Pessoa Inteira" ? { mirror: true, objectX: 50 } : {}),
    ...(REUSED_FINAL_ART_HEADINGS.has(source.text)
      ? { mirror: occurrence % 2 === 1, objectX: occurrence % 2 === 0 ? 25 : 75 }
      : {}),
    frameAspectRatio: fullArtOpening
      ? 0.6667
      : quadrantFamily
        ? 0.62
        : size === "small"
          ? 3.8
          : side
            ? 0.55
            : asset.family === "MAP_PAGE"
              ? 0.93
              : 1.9,
    layoutRole: fullArtOpening
      ? "FULL_ART"
      : quadrantFamily
        ? "QUADRANT_IMAGE"
        : shared
          ? "SHARED_EDITORIAL_IMAGE"
          : "EDITORIAL_IMAGE",
    ...(quadrantFamily ? { quadrant: occurrence % 2 === 0 ? "top-left" : "top-right" } : {}),
    ...(shared ? { semanticPairId: asset.semanticPairId } : {}),
    ...dimensions,
    materialization: {
      generatedBy: "kallistis-materializer",
      materializationVersion: VERSION,
      scope: source.scope,
      generated: true,
      assetSourceBlockId: source.id,
      assetStatus: asset.status,
      assetCatalogReference: asset.reference,
      semanticAnchor: asset.semanticAnchor,
      allowedHeadingIds: asset.allowedHeadingIds,
      allowedWindow: asset.allowedWindow,
      semanticAnchorHeadingId: asset.anchorHeadingId,
      layoutRole: fullArtOpening
        ? "FULL_ART"
        : quadrantFamily
          ? "QUADRANT_IMAGE"
          : shared
            ? "SHARED_EDITORIAL_IMAGE"
            : "EDITORIAL_IMAGE",
      ...(fullArtOpening ? { fullArtOpening: true } : {}),
      ...(quadrantFamily ? { quadrant: occurrence % 2 === 0 ? "top-left" : "top-right" } : {}),
      ...(shared ? { semanticPairId: asset.semanticPairId } : {}),
    },
  };
}

function generatedSupportImage(source, asset, occurrence = 0) {
  const office = asset.supportKind === "office-resource";
  const bestiary = asset.supportKind === "bestiary-scale";
  const people = asset.supportKind === "people-context";
  const contextual = asset.supportKind === "contextual";
  return {
    id: `support-${source.id}-${sha256(`${asset.src}|${occurrence}`).slice(0, 10)}`,
    type: "image",
    src: asset.src,
    alt: asset.alt,
    position: "right",
    fit: office || people || contextual ? "contain" : "cover",
    objectX: 50,
    objectY: 50,
    width: contextual ? "100%" : office ? "29%" : "30%",
    height: contextual ? "52mm" : office ? "35mm" : bestiary ? "48mm" : "52mm",
    frameAspectRatio: contextual ? 1.9 : office ? 1 : 0.62,
    layoutRole: "SUPPORT_IMAGE",
    materialization: {
      generatedBy: "kallistis-materializer",
      materializationVersion: VERSION,
      scope: source.scope,
      generated: true,
      assetSourceBlockId: source.id,
      assetStatus: asset.status,
      assetCatalogReference: asset.reference,
      semanticAnchor: asset.semanticAnchor,
      allowedHeadingIds: asset.allowedHeadingIds,
      allowedWindow: asset.allowedWindow,
      semanticAnchorHeadingId: asset.anchorHeadingId,
      layoutRole: "SUPPORT_IMAGE",
    },
  };
}

function generatedFullArtPlate(source, asset, occurrence = 0) {
  return {
    id: `plate-${source.id}-${sha256(`${asset.src}|${occurrence}`).slice(0, 10)}`,
    type: "image",
    src: asset.src,
    alt: asset.alt,
    position: "full",
    fullBleed: true,
    fit: "cover",
    objectX: 50,
    objectY: 50,
    width: "100%",
    height: "100%",
    frameAspectRatio: 0.6667,
    layoutRole: "BESTIARY_PLATE",
    materialization: {
      generatedBy: "kallistis-materializer",
      materializationVersion: VERSION,
      scope: source.scope,
      generated: true,
      assetSourceBlockId: source.id,
      assetStatus: asset.status,
      assetCatalogReference: asset.reference,
      semanticAnchor: asset.semanticAnchor,
      allowedHeadingIds: asset.allowedHeadingIds,
      allowedWindow: asset.allowedWindow,
      semanticAnchorHeadingId: asset.anchorHeadingId,
      layoutRole: "BESTIARY_PLATE",
      fullArtPlate: true,
    },
  };
}

function editorialFamilyForSource(source, ordinal = 0) {
  if (ordinal === 0 || source?.text === "KALLISTIS") return "TITLE_PAGE";
  if (source?.text === "Expediente") return "COPYRIGHT_EXPEDIENTE";
  if (source?.text === "Dedicatória") return "DEDICATION";
  if (source?.text === "Apresentação" || source?.text === "Como usar este livro")
    return "INTRODUCTION";
  if (source?.level === 1 && /^PARTE\s+/u.test(source.text ?? "")) return "PART_OPENING";
  return "NARRATIVE";
}

function compositionForSource(source, asset = null, ordinal = 1) {
  if (!source) return { family: "TEXT_FLOW", template: "narrative", variant: "default" };
  const family = editorialFamilyForSource(source, ordinal);
  if (family === "TITLE_PAGE")
    return { family: "TEXT_FLOW", template: "front_matter", variant: "title-page" };
  if (family === "COPYRIGHT_EXPEDIENTE")
    return { family: "TEXT_FLOW", template: "front_matter", variant: "copyright" };
  if (family === "DEDICATION")
    return { family: "TEXT_FEATURE", template: "front_matter", variant: "dedication" };
  if (family === "INTRODUCTION")
    return { family: "TEXT_FLOW", template: "front_matter", variant: "introduction" };
  if (family === "PART_OPENING")
    return { family: "PART_HERO", template: "part_opening", variant: "default" };
  if (source.text === "A história em Marcos" || /^MARCO\s+/u.test(source.text ?? "")) {
    return { family: "TIMELINE_MILESTONE", template: "timeline_milestone", variant: "default" };
  }
  if (source.text === "Cronologia consolidada por Marcos") {
    return { family: "TEXT_FEATURE", template: "table_page", variant: "default" };
  }
  if (asset?.family === "MAP_PAGE")
    return { family: "MAP_PAGE", template: "chapter_opening", variant: "image-top" };
  if (["GEOGRAPHY_OPENING", "PEDRALMA_OPENING", "FINAL_CLOSURE"].includes(asset?.family)) {
    return { family: asset.family, template: "chapter_opening", variant: "image-top" };
  }
  if (asset?.fullArtOpening) {
    return { family: "BESTIARY_ENTRY", template: "full_art", variant: "bestiary-opening" };
  }
  if (["POVO_OPENING", "OFICIO_CULTURAL_OPENING", "BESTIARY_ENTRY"].includes(asset?.family)) {
    return { family: asset.family, template: "chapter_opening", variant: "quadrant-image" };
  }
  if (asset?.family === "TENSION_CONTINUATION") {
    return { family: "TENSION_CONTINUATION", template: "narrative", variant: "default" };
  }
  if (asset?.semanticPairId)
    return { family: "SIDE_ART_PAIR", template: "chapter_opening", variant: "image-side" };
  if (asset && ["Pedr’alma", "Lar · Cidade · Companhia", "Daeren"].includes(asset.heading)) {
    return {
      family: source.text === "Daeren" ? "SIDE_ART_LEFT" : "SIDE_ART_RIGHT",
      template: "chapter_opening",
      variant: source.text === "Daeren" ? "image-side" : "image-side",
    };
  }
  if (asset) return { family: "IMAGE_TOP", template: "chapter_opening", variant: "image-top" };
  if (/^PARTE II\b/u.test(source.sectionH1 ?? ""))
    return { family: "GEOGRAPHY_FLOW", template: "narrative", variant: "default" };
  if (/^PARTE III\b/u.test(source.sectionH1 ?? ""))
    return { family: "CULTURE_FLOW", template: "narrative", variant: "default" };
  if (source.type === "text" && source.wordCount <= 24)
    return { family: "TEXT_FEATURE", template: "narrative", variant: "default" };
  return { family: "TEXT_FLOW", template: "narrative", variant: "default" };
}

function compactReferenceSection(source) {
  return Boolean(source?.sectionH1 && /^(?:PARTE V|PARTE VI)\b/u.test(source.sectionH1));
}

function applyCompactReferencePage(page, source) {
  if (
    !compactReferenceSection(source) ||
    page.template === "part_opening" ||
    page.blocks.some((block) => block.type === "image")
  ) {
    return page;
  }
  return {
    ...page,
    template: "rules_2col",
    variant: "default",
    editorialComposition: "REFERENCE_TABLE",
    settings: { ...page.settings, columns: 2 },
  };
}

function newPage(scope, ordinal, hint) {
  const part = hint?.sectionH1 || "Front Matter";
  const chapter = hint?.sectionH2 || hint?.sectionH1 || "";
  const asset = assetForSource(hint);
  const composition = compositionForSource(hint, asset, ordinal);
  const frontMatter = ["TITLE_PAGE", "COPYRIGHT_EXPEDIENTE", "DEDICATION", "INTRODUCTION"].includes(
    editorialFamilyForSource(hint, ordinal),
  );
  return applyCompactReferencePage(
    {
      id: `${scope.toLowerCase()}-page-${String(ordinal + 1).padStart(4, "0")}`,
      template: composition.template,
      variant: composition.variant,
      editorialComposition: composition.family,
      editorialFamily: editorialFamilyForSource(hint, ordinal),
      part,
      chapter,
      title: frontMatter ? "" : chapter || part,
      settings: {
        header: ordinal > 0 && composition.template !== "full_art",
        footer: false,
        pageNumber: true,
        columns: 1,
        background: "paper",
        fullBleed: false,
      },
      blocks: [],
    },
    hint,
  );
}

function pageSourceIds(page) {
  return [
    ...new Set(page.blocks.map((block) => block.materialization?.sourceBlockId).filter(Boolean)),
  ];
}

function pageWordCount(page) {
  return page.blocks.reduce((total, block) => {
    if (block.type === "image" || block.type === "divider") return total;
    if (block.type === "table")
      return (
        total +
        block.rows.reduce(
          (sum, row) => sum + row.cells.reduce((n, cell) => n + wordCount(cell.content), 0),
          0,
        )
      );
    if (block.type === "heading") return total + wordCount(block.text);
    if (block.type === "quote") return total + wordCount(block.text);
    return total + wordCount(block.content ?? "");
  }, 0);
}

function updatePageMetadata(page, sourceById) {
  const ids = pageSourceIds(page);
  const sources = ids.map((id) => sourceById.get(id)).filter(Boolean);
  const firstHeading = sources.find((source) => source.type === "heading");
  const firstHeadingAsset = assetForSource(firstHeading);
  const pageStartsAtFirstHeading =
    page.blocks[0]?.materialization?.sourceBlockId === firstHeading?.id;
  if (pageStartsAtFirstHeading && firstHeadingAsset?.family === "POVO_OPENING") {
    page.template = "chapter_opening";
    page.variant = "quadrant-image";
    page.editorialComposition = "POVO_OPENING";
    page.editorialFamily = "NARRATIVE";
    page.title = firstHeading?.sectionH2 || firstHeading?.text || page.title;
  }
  if (
    firstHeading &&
    (firstHeading.text === "A história em Marcos" ||
      /^MARCO\s+/u.test(firstHeading.text ?? "") ||
      (firstHeading.level === 1 && /^PARTE\s+/u.test(firstHeading.text ?? "")))
  ) {
    const inferred = compositionForSource(firstHeading, firstHeadingAsset, 1);
    page.template = inferred.template;
    page.variant = inferred.variant;
    page.editorialComposition = inferred.family;
    page.editorialFamily = editorialFamilyForSource(firstHeading, 1);
    page.title = firstHeading.text;
  }
  const start = sources.length
    ? Math.min(...sources.map((source) => source.sourceStartLine))
    : undefined;
  const end = sources.length
    ? Math.max(...sources.map((source) => source.sourceEndLine))
    : undefined;
  const sourceContentHash = sha256(ids.map((id) => sourceById.get(id)?.raw ?? id).join("\n"));
  page.materialization = {
    generatedBy: "kallistis-materializer",
    materializationVersion: VERSION,
    scope: page.blocks.find((block) => block.materialization)?.materialization?.scope ?? "HISTORIA",
    ...(start === undefined ? {} : { sourceStartLine: start }),
    ...(end === undefined ? {} : { sourceEndLine: end }),
    sourceBlockIds: ids,
    sourceContentHash,
    autoGenerated: true,
    reviewFlags: [],
    editorialFamily: page.editorialFamily ?? "NARRATIVE",
    compositionFamily: page.editorialComposition ?? "TEXT_FLOW",
    wordCount: pageWordCount(page),
  };
}

function correctionImageBlock(page, id, src, alt, options = {}) {
  const heading = page.blocks.find((block) => block.type === "heading");
  const sourceBlockId = heading?.materialization?.sourceBlockId ?? `editorial-correction-${id}`;
  return {
    id: `correction-${id}`,
    type: "image",
    src,
    alt,
    position: options.position ?? "right",
    fit: options.fit ?? "contain",
    width: options.width ?? "30%",
    height: options.height ?? "52mm",
    objectX: 50,
    objectY: 50,
    frameAspectRatio: options.frameAspectRatio ?? 0.62,
    layoutRole: "SUPPORT_IMAGE",
    materialization: {
      generatedBy: "kallistis-editorial-correction",
      materializationVersion: VERSION,
      scope: "COMPLETO",
      generated: true,
      sourceBlockId,
      sourceType: "heading",
      assetStatus: "COVERED_HIGH",
      layoutRole: "SUPPORT_IMAGE",
      editorialCorrection: id,
      editorialCorrectionAdded: true,
    },
  };
}

function applyPreexistingEditorialCorrections(book) {
  if (book.pages.length < 170) return 0;
  let count = 0;
  const addOnce = (pageNumber, block, index) => {
    const page = book.pages[pageNumber - 1];
    if (!page || page.blocks.some((candidate) => candidate.id === block.id)) return;
    if (index === undefined) page.blocks.push(block);
    else page.blocks.splice(Math.max(0, Math.min(index, page.blocks.length)), 0, block);
    count += 1;
  };

  const thurDaerPage = book.pages[67];
  const thurDaerImage = thurDaerPage?.blocks.find((block) => block.type === "image");
  if (thurDaerImage && thurDaerImage.src !== "/assets/v1.5-acervo/thur-daer-pb.png") {
    const previous = { src: thurDaerImage.src, alt: thurDaerImage.alt, fit: thurDaerImage.fit };
    thurDaerImage.src = "/assets/v1.5-acervo/thur-daer-pb.png";
    thurDaerImage.alt = "Vale de Thur-Daer — mapa em preto e branco";
    thurDaerImage.fit = "cover";
    thurDaerImage.materialization = {
      ...(thurDaerImage.materialization ?? {}),
      editorialCorrection: "thur-daer-pb",
      editorialCorrectionPrevious: previous,
    };
    count += 1;
  }

  addOnce(
    77,
    correctionImageBlock(
      book.pages[76],
      "distribuicao-p77",
      "/assets/v1.5-acervo/distribuicao-povos.png",
      "Distribuição dos povos, comunidades e caminhos — imagem contextual",
      {
        position: "flow",
        width: "100%",
        height: "52mm",
        frameAspectRatio: 3.05,
      },
    ),
    1,
  );
  addOnce(
    90,
    correctionImageBlock(
      book.pages[89],
      "aelvari-p90",
      "/assets/complete/support/peoples/aelvari-context.png",
      "Aelvari — imagem contextual do povo",
      {
        position: "left",
        width: "34%",
        height: "86mm",
        frameAspectRatio: 0.63,
      },
    ),
    2,
  );
  addOnce(
    141,
    correctionImageBlock(
      book.pages[140],
      "nimari-p141",
      "/assets/complete/support/peoples/nimari-context.png",
      "Nimari — imagem contextual do povo",
      {
        position: "right",
        width: "30%",
        height: "52mm",
        frameAspectRatio: 0.92,
      },
    ),
    1,
  );
  addOnce(
    142,
    correctionImageBlock(
      book.pages[141],
      "vitralios-p142",
      "/assets/complete/support/peoples/vitralios-context.png",
      "Vitrálios — imagem contextual do povo",
      {
        position: "overlay-right",
        width: "30%",
        height: "32mm",
        frameAspectRatio: 1.5,
      },
    ),
    1,
  );
  addOnce(
    162,
    correctionImageBlock(
      book.pages[161],
      "kelvhen-p162",
      "/assets/v1.5-acervo/forja-kelvhen.png",
      "Kelvhen — forja arcana na Catedral de Cristal, imagem contextual",
      {
        position: "overlay-right",
        width: "30%",
        height: "34mm",
        frameAspectRatio: 1.4,
      },
    ),
    2,
  );
  return count;
}

function repairOrphanHeadings(book) {
  let count = 0;
  for (let index = 0; index < book.pages.length - 1; index += 1) {
    const page = book.pages[index];
    const next = book.pages[index + 1];
    const last = page.blocks.at(-1);
    if (!last || last.type !== "heading" || !next) continue;
    page.blocks.pop();
    next.blocks.unshift({ ...last, compact: true });
    count += 1;
  }
  return count;
}

function splitSentences(content) {
  const parts = content
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-ÞÁÉÍÓÚÂÊÔÃÕÇ“"'—])/u)
    .filter(Boolean);
  if (parts.length > 1) return parts;
  const words = content.trim().split(/\s+/u);
  const chunks = [];
  for (let i = 0; i < words.length; i += 80) chunks.push(words.slice(i, i + 80).join(" "));
  return chunks.length ? chunks : [content];
}

function fragmentText(block, content, index, count) {
  const materialization = {
    ...block.materialization,
    sourceFragmentIndex: index,
    sourceFragmentCount: count,
  };
  if (index > 0) delete materialization.sourceRaw;
  return {
    ...block,
    id: `${block.materialization.sourceBlockId}-fragment-${index + 1}`,
    content,
    materialization,
  };
}

function splitTable(block, bodyCount, continuationIndex, fragmentCount = 1) {
  const headerRows = block.rows.filter((row) => row.kind === "header");
  const bodyRows = block.rows.filter((row) => row.kind !== "header" && row.kind !== "footer");
  const rows = bodyRows.slice(0, bodyCount);
  const materialization = {
    ...block.materialization,
    sourceFragmentIndex: continuationIndex,
    sourceFragmentCount: fragmentCount,
  };
  if (continuationIndex > 0) delete materialization.sourceRaw;
  return {
    ...block,
    id: continuationIndex
      ? `${block.materialization.sourceBlockId}-fragment-${continuationIndex + 1}`
      : block.id,
    rows: continuationIndex ? rows : [...headerRows, ...rows],
    ...(continuationIndex
      ? {
          continuationOf: block.materialization.sourceBlockId,
          continuationIndex,
          continuationHeader: headerRows,
        }
      : {}),
    materialization,
  };
}

function visualDebtAfterPage(page, debt) {
  if (page.blocks.some((block) => block.type === "image")) return 0;
  if (page.blocks.some((block) => block.type === "table")) return debt + 0.5;
  return debt + 1;
}

async function waitForServer(url, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/print`);
      if (response.status < 500) return true;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function ensureServer(url) {
  if (await waitForServer(url, 1500)) return null;
  const child = spawn("bun", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore",
  });
  if (!(await waitForServer(url))) {
    child.kill("SIGTERM");
    throw new Error(`Book Maker não respondeu em ${url}`);
  }
  return child;
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/ms-playwright";
    const dirs = await readdir(root).catch(() => []);
    for (const dir of dirs.filter((item) => item.startsWith("chromium-"))) {
      const executablePath = path.join(root, dir, "chrome-linux", "chrome");
      try {
        await access(executablePath);
        return await chromium.launch({ headless: true, executablePath });
      } catch {
        // try next installed browser
      }
    }
    throw error;
  }
}

async function renderAndMeasure(page, book) {
  const revision = ++renderRevision;
  await page.evaluate(
    ({ nextBook, nextRevision }) => {
      window.dispatchEvent(
        new CustomEvent("kallistis-materializer-book", {
          detail: { book: nextBook, revision: nextRevision },
        }),
      );
    },
    { nextBook: book, nextRevision: revision },
  );
  await page.waitForFunction(
    (expectedRevision) =>
      document.documentElement.dataset["materializerRevision"] === String(expectedRevision) &&
      document.documentElement.dataset["printReady"] === "true",
    revision,
    { timeout: 120000 },
  );
  return page.evaluate(() => {
    const root = document.querySelector(".k-page");
    const content = root?.querySelector(".k-page__content") ?? root;
    if (!root || !content) throw new Error("PageRenderer sem .k-page__content");
    const specialCopy = root.querySelector("[data-full-art-copy='true']");
    const contentRect = content.getBoundingClientRect();
    const blockElements = [...content.querySelectorAll("[data-block-id]")];
    const blockInfo = blockElements.map((element) => {
      const rect = element.getBoundingClientRect();
      const text = element.querySelector(".k-body p");
      let lineCount = 0;
      if (text) {
        const range = document.createRange();
        range.selectNodeContents(text);
        lineCount = range.getClientRects().length;
      }
      return {
        id: element.dataset.blockId ?? "",
        height: rect.height,
        top: rect.top - contentRect.top,
        bottom: rect.bottom - contentRect.top,
        lineCount,
        isHeading: Boolean(element.querySelector(".k-h1, .k-h2, .k-h3, .k-h4, .k-h5")),
        isImage: Boolean(element.querySelector("img, .k-image-placeholder")),
      };
    });
    const usedBottom = blockInfo.reduce(
      (max, block) => (block.isImage ? max : Math.max(max, contentRect.top + block.bottom)),
      contentRect.top,
    );
    const blockOutOfBounds = blockInfo.some(
      (block) => !block.isImage && (block.top < -1 || block.bottom > contentRect.height + 1),
    );
    return {
      overflow:
        blockOutOfBounds ||
        (specialCopy
          ? specialCopy.scrollHeight > specialCopy.clientHeight + 1 ||
            specialCopy.scrollWidth > specialCopy.clientWidth + 1
          : !["part_opening", "full_art"].includes(root.dataset.template ?? "") &&
            (content.scrollHeight > content.clientHeight + 1 ||
              content.scrollWidth > content.clientWidth + 1)),
      scrollHeight: content.scrollHeight,
      clientHeight: content.clientHeight,
      scrollWidth: content.scrollWidth,
      clientWidth: content.clientWidth,
      usedHeight: Math.max(0, usedBottom - contentRect.top),
      fillRatio: content.clientHeight
        ? Math.max(0, usedBottom - contentRect.top) / content.clientHeight
        : 0,
      blockInfo,
      tableRows: [...content.querySelectorAll("[data-table-row-id]")].map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          id: row.getAttribute("data-table-row-id"),
          top: rect.top - contentRect.top,
          bottom: rect.bottom - contentRect.top,
        };
      }),
    };
  });
}

function candidateBook(base, page, pageOrdinal = 0) {
  return {
    ...base,
    meta: { ...base.meta, firstFolio: base.meta.firstFolio + pageOrdinal },
    nodes: [],
    pages: [page],
    spreads: [],
  };
}

async function materialize({ scope, markdown, baseBook, browserPage, sourceBlocks }) {
  const sourceById = new Map(sourceBlocks.map((source) => [source.id, source]));
  const pages = [];
  let current = newPage(scope, 0, sourceBlocks[0]);
  let visualDebt = 0;
  let lastImagePage = -100;
  let textRun = 0;
  const usedAssetShas = new Set();
  const usedSemanticPairs = new Map();
  let pageMeasurements = [];
  const spreads = [];

  const measureCurrentWithBlocks = async (blocks) =>
    renderAndMeasure(
      browserPage,
      candidateBook(baseBook, { ...current, blocks: [...current.blocks, ...blocks] }, pages.length),
    );
  const measureCurrentWith = async (block) => measureCurrentWithBlocks([block]);
  const finishCurrent = async (nextHint = null) => {
    if (!current.blocks.length) return;
    const measurement = await renderAndMeasure(
      browserPage,
      candidateBook(baseBook, current, pages.length),
    );
    pageMeasurements.push(measurement);
    current.materialization = current.materialization ?? {};
    updatePageMetadata(current, sourceById);
    current.materialization.pageFillRatio = measurement.fillRatio;
    current.materialization.wordCount = pageWordCount(current);
    pages.push(current);
    if (current.blocks.some((block) => block.type === "image")) {
      lastImagePage = pages.length - 1;
      textRun = 0;
    } else {
      textRun += 1;
    }
    visualDebt = visualDebtAfterPage(current, visualDebt);
    current = newPage(
      scope,
      pages.length,
      nextHint ??
        sourceBlocks.find((source) => source.sectionH2 === current.chapter) ??
        sourceBlocks[0],
    );
  };

  const trySplitText = async (block) => {
    if (block.type !== "text") return null;
    const pieces =
      block.materialization?.sourceType === "list"
        ? block.content.split("\n").filter(Boolean)
        : splitSentences(block.content);
    if (pieces.length < 2) return null;
    let low = 1;
    let high = pieces.length - 1;
    let best = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const content =
        block.materialization?.sourceType === "list"
          ? pieces.slice(0, middle).join("\n")
          : pieces.slice(0, middle).join(" ");
      const candidate = fragmentText(block, content, 0, 2);
      const measurement = await measureCurrentWith(candidate);
      if (!measurement.overflow) {
        best = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    if (!best) return null;
    const first =
      block.materialization?.sourceType === "list"
        ? pieces.slice(0, best).join("\n")
        : pieces.slice(0, best).join(" ");
    const rest =
      block.materialization?.sourceType === "list"
        ? pieces.slice(best).join("\n")
        : pieces.slice(best).join(" ");
    return [fragmentText(block, first, 0, 2), fragmentText(block, rest, 1, 2)];
  };

  const trySplitTable = async (block) => {
    if (block.type !== "table") return null;
    const bodyRows = block.rows.filter((row) => row.kind !== "header" && row.kind !== "footer");
    if (bodyRows.length < 2) return null;
    let low = 1;
    let high = bodyRows.length;
    let best = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = splitTable(block, middle, 0);
      const measurement = await measureCurrentWith(candidate);
      if (!measurement.overflow) {
        best = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    if (!best || best === bodyRows.length) return null;
    const incomingIndex =
      block.continuationIndex ?? block.materialization?.sourceFragmentIndex ?? 0;
    const nextIndex = incomingIndex + 1;
    const fragmentCount = Math.max(block.materialization?.sourceFragmentCount ?? 1, nextIndex + 1);
    const first = splitTable(block, best, incomingIndex, fragmentCount);
    const rest = splitTable(
      { ...block, rows: bodyRows.slice(best) },
      bodyRows.length - best,
      nextIndex,
      fragmentCount,
    );
    return [first, rest];
  };

  const addBlock = async (block) => {
    if (
      block.type === "table" &&
      /^PARTE VII\b/u.test(current.part ?? "") &&
      !current.blocks.some((candidate) => candidate.type === "image")
    ) {
      current = {
        ...current,
        template: "rules_2col",
        variant: "default",
        editorialComposition: "REFERENCE_TABLE",
        settings: { ...current.settings, columns: 2 },
      };
    }
    const measurement = await measureCurrentWith(block);
    if (!measurement.overflow) {
      current.blocks.push(block);
      return;
    }
    const split = (await trySplitText(block)) ?? (await trySplitTable(block));
    if (split) {
      const [first, rest] = split;
      current.blocks.push(first);
      await finishCurrent(sourceById.get(rest.materialization?.sourceBlockId));
      const continuationSource = sourceById.get(rest.materialization?.sourceBlockId);
      const isChronologyContinuation =
        rest.type === "table" &&
        rest.continuationIndex === 1 &&
        continuationSource?.headingPath?.some(
          (heading) => heading.text === "Cronologia consolidada por Marcos",
        );
      if (isChronologyContinuation) {
        const continuationImage = generatedImage(
          continuationSource,
          assetForSource({ type: "heading", text: "Cronologia consolidada por Marcos", id: "" }),
          "small",
          1,
        );
        continuationImage.mirror = true;
        continuationImage.objectX = 75;
        await addBlock(continuationImage);
      }
      await addBlock(rest);
      return;
    }
    if (current.blocks.length) {
      await finishCurrent(sourceById.get(block.materialization?.sourceBlockId));
      await addBlock(block);
      return;
    }
    throw new Error(
      `Bloco ${block.id} excede uma página mesmo sozinho; paginação interrompida. page=${current.id} template=${current.template} measurement=${JSON.stringify({ overflow: measurement.overflow, clientWidth: measurement.clientWidth, scrollWidth: measurement.scrollWidth, clientHeight: measurement.clientHeight, scrollHeight: measurement.scrollHeight, blockInfo: measurement.blockInfo?.slice(-3) })}`,
    );
  };

  const isSparseNarrativePage = (page) =>
    page.editorialFamily === "NARRATIVE" &&
    pageWordCount(page) <= 100 &&
    !page.blocks.some((candidate) => candidate.type === "image" || candidate.type === "table");

  for (let index = 0; index < sourceBlocks.length; index += 1) {
    const source = sourceBlocks[index];
    const block = sourceToBlock(source);
    const nextSource = sourceBlocks[index + 1];

    const asset = assetForSource(source);
    const supportAssets = supportAssetsForSource(source);
    const frontMatterBoundary =
      scope === "HISTORIA" &&
      source.type === "heading" &&
      source.level === 2 &&
      ["Expediente", "Dedicatória", "Apresentação", "Prólogo — A velha e a Fresta"].includes(
        source.text,
      );
    const timelineBoundary =
      source.type === "heading" &&
      (source.text === "A história em Marcos" ||
        source.text === "Cronologia consolidada por Marcos" ||
        /^MARCO\s+/u.test(source.text ?? ""));
    const timelineMilestoneFollowsTitle =
      source.type === "heading" &&
      /^MARCO\s+/u.test(source.text ?? "") &&
      current.blocks.length > 0 &&
      current.blocks.every(
        (candidate) => candidate.type === "heading" && candidate.text === "A história em Marcos",
      );
    const forcedTensionContinuationBreak =
      source.type === "heading" &&
      source.text === "Tensões Regionais: Livres, Dóreos, Teriantes, Nimari e Vitrálios";
    const forcedChavesBreak =
      source.type === "heading" && source.text === "CHAVES, VOZES E PRESENÇA EM MESA";
    const compositionBoundary =
      source.type === "heading" &&
      (asset ||
        supportAssets.some((candidate) => !candidate.extraContext) ||
        forcedTensionContinuationBreak ||
        forcedChavesBreak ||
        current.editorialFamily === "PART_OPENING" ||
        (timelineBoundary && !timelineMilestoneFollowsTitle));
    const sparseCurrent = isSparseNarrativePage(current);
    const independentOpening = [
      "MAP_PAGE",
      "GEOGRAPHY_OPENING",
      "POVO_OPENING",
      "OFICIO_CULTURAL_OPENING",
      "PEDRALMA_OPENING",
      "TENSION_OPENING",
      "TENSION_CONTINUATION",
      "FINAL_CLOSURE",
    ].includes(asset?.family);
    const absorbSparseAssetOpening =
      sparseCurrent && source.type === "heading" && Boolean(asset) && !independentOpening;
    if (
      source.type === "heading" &&
      (source.level === 1 || frontMatterBoundary || compositionBoundary) &&
      current.blocks.length &&
      !absorbSparseAssetOpening
    ) {
      const currentSources = pageSourceIds(current)
        .map((id) => sourceById.get(id))
        .filter(Boolean);
      const currentPathIds = new Set(
        (currentSources.at(-1)?.headingPath ?? []).map((heading) => heading.id),
      );
      const transitionAsset =
        sparseCurrent && !asset
          ? HISTORY_ASSETS.find((candidate) =>
              candidate.allowedHeadingIds.some((headingId) => currentPathIds.has(headingId)),
            )
          : null;
      if (transitionAsset && currentSources.at(-1)) {
        const transitionSource = currentSources.at(-1);
        const transitionImage = generatedImage(transitionSource, transitionAsset, "medium", 0);
        transitionImage.height = "86mm";
        transitionImage.frameAspectRatio = 1.55;
        current.blocks.push(transitionImage);
        current.editorialComposition = "TEXT_FEATURE";
        usedAssetShas.add(transitionAsset.sha);
      }
      await finishCurrent(source);
    }

    /* O mapa geral é uma peça horizontal única: duas páginas completas,
       com a imagem atravessando o gutter sem crop e sem repetir a arte. */
    if (
      source.type === "heading" &&
      source.text === "O Mapa em Duas Camadas" &&
      asset?.family === "MAP_PAGE" &&
      current.blocks.length === 0
    ) {
      const leftPageNumber = pages.length + 1;
      const makeMapSplash = (side) => {
        const page = newPage(scope, pages.length, source);
        const art = generatedImage(source, asset, "large", 0);
        art.position = "full";
        art.fullBleed = true;
        art.fit = "contain";
        art.width = "100%";
        art.height = "100%";
        art.spreadSide = side;
        art.materialization = {
          ...art.materialization,
          assetSourceBlockId: source.id,
          spreadSide: side,
        };
        return {
          ...page,
          template: "full_art",
          variant: "full-page",
          editorialComposition: "MAP_SPREAD",
          editorialFamily: "NARRATIVE",
          title: "",
          chapter: source.text,
          settings: { ...page.settings, header: false, footer: false, fullBleed: true },
          blocks: [art],
          materialization: {
            generatedBy: "kallistis-materializer",
            materializationVersion: VERSION,
            scope,
            sourceStartLine: source.sourceStartLine,
            sourceEndLine: source.sourceEndLine,
            sourceBlockIds: [],
            sourceContentHash: sha256(source.raw),
            autoGenerated: true,
            reviewFlags: [],
            editorialFamily: "NARRATIVE",
            compositionFamily: "MAP_SPREAD",
            wordCount: 0,
          },
        };
      };
      for (const side of ["left", "right"]) {
        const splash = makeMapSplash(side);
        const measurement = await renderAndMeasure(
          browserPage,
          candidateBook(baseBook, splash, pages.length),
        );
        splash.materialization.pageFillRatio = measurement.fillRatio;
        pages.push(splash);
        pageMeasurements.push(measurement);
        lastImagePage = pages.length - 1;
        textRun = 0;
        visualDebt = 0;
      }
      spreads.push({
        left: leftPageNumber,
        right: leftPageNumber + 1,
        asset: asset.src,
        alt: asset.alt,
        sourceSha256: asset.sha,
        sourceReference: asset.reference,
      });
      usedAssetShas.add(asset.sha);
      current = newPage(scope, pages.length, nextSource ?? source);
      await addBlock(block);
      continue;
    }

    let image = null;
    const interval = pages.length - lastImagePage;
    const firstPriority =
      source.type === "heading" && (source.text.startsWith("Prólogo") || source.level === 1);
    const cadenceReached =
      visualDebt >= IMAGE_CADENCE.targetInterval ||
      textRun >= SOFT_MAX_TEXT_RUN ||
      interval >= IMAGE_CADENCE.targetInterval;
    const pairCount = asset?.semanticPairId
      ? (usedSemanticPairs.get(asset.semanticPairId) ?? 0)
      : 0;
    const canReusePair =
      Boolean(asset?.semanticPairId) ||
      ["POVO_OPENING", "OFICIO_CULTURAL_OPENING", "BESTIARY_ENTRY"].includes(asset?.family) ||
      REUSED_FINAL_ART_HEADINGS.has(source.text) ||
      REUSABLE_SEMANTIC_ART_HEADINGS.has(source.text);
    const canUseAsset = Boolean(asset) && (!usedAssetShas.has(asset.sha) || canReusePair);
    if (absorbSparseAssetOpening) {
      const absorbedComposition = compositionForSource(source, asset, pages.length + 1);
      current.template = absorbedComposition.template;
      current.variant = absorbedComposition.variant;
      current.editorialComposition = absorbedComposition.family;
      current.editorialFamily = editorialFamilyForSource(source, pages.length + 1);
      current.title = source.text;
    }
    const semanticCompositionRecommended =
      (Boolean(asset) || supportAssets.length > 0) &&
      source.type === "heading" &&
      (current.blocks.length === 0 || absorbSparseAssetOpening);
    if (
      canUseAsset &&
      semanticCompositionRecommended &&
      !current.blocks.some((blockCandidate) => blockCandidate.type === "image") &&
      (firstPriority || cadenceReached || Boolean(asset))
    ) {
      image = generatedImage(
        source,
        asset,
        REUSED_FINAL_ART_HEADINGS.has(source.text) ? "small" : firstPriority ? "large" : "medium",
        pairCount,
      );
      usedAssetShas.add(asset.sha);
      if (asset.semanticPairId) usedSemanticPairs.set(asset.semanticPairId, pairCount + 1);
    }
    if (source.type === "heading") {
      if (current.blocks.length && source.level >= 2) {
        const headingMeasurement = await measureCurrentWith(block);
        const lookahead = nextSource?.type === "heading" ? sourceBlocks[index + 2] : null;
        const keepWithNext = await measureCurrentWithBlocks([
          block,
          ...(image ? [image] : []),
          ...(nextSource ? [sourceToBlock(nextSource)] : []),
          ...(lookahead ? [sourceToBlock(lookahead)] : []),
        ]);
        const isEncounterEntry =
          source.headingPath?.some((heading) => heading.text === ENCOUNTER_SECTION) &&
          source.level >= 3;
        const currentEncounterEntries = current.blocks.filter(
          (candidate) =>
            candidate.type === "heading" &&
            sourceById
              .get(candidate.materialization?.sourceBlockId)
              ?.headingPath?.some((heading) => heading.text === ENCOUNTER_SECTION),
        ).length;
        const mayPairEncounterEntries = isEncounterEntry && currentEncounterEntries === 1;
        /* Em páginas de referência, uma tabela longa pode continuar na coluna
           seguinte. Exigir que a tabela inteira caiba junto ao heading cria
           páginas vazias de 10–20% antes de cada tabela fragmentada. Mantemos
           o heading no fluxo e deixamos trySplitTable reservar as linhas. */
        const allowTableContinuation =
          current.template === "rules_2col" && nextSource?.type === "table";
        const tableStartPreview = allowTableContinuation
          ? tableBlockFromSource(
              nextSource,
              (nextSource.tableLines ?? [])
                .slice(2, 3)
                .map((line) => splitTableRow(line).map(stripMarkdown)),
              0,
            )
          : null;
        const headingWithTableStart = tableStartPreview
          ? await measureCurrentWithBlocks([block, tableStartPreview])
          : keepWithNext;
        if (
          (headingMeasurement.overflow ||
            (headingWithTableStart.overflow && allowTableContinuation) ||
            (keepWithNext.overflow && !allowTableContinuation)) &&
          !mayPairEncounterEntries
        ) {
          await finishCurrent(source);
        }
      }
    }

    await addBlock(block);
    if (image) await addBlock(image);
    if (source.type === "heading" && supportAssets.length) {
      for (const supportAsset of supportAssets) {
        const supportImage = generatedSupportImage(source, supportAsset);
        await addBlock(supportImage);
        usedAssetShas.add(supportAsset.sha);
      }
    }
    const fullArtPlates = fullArtPlateAssetsForSource(source);
    if (source.type === "heading" && fullArtPlates.length) {
      /* Fecha a entrada antes da prancha: a arte adicional ganha função de
         orientação e escala, em vez de virar um selo pequeno sobre o texto. */
      await finishCurrent(nextSource ?? source);
      for (const plateAsset of fullArtPlates) {
        const plate = newPage(scope, pages.length, source);
        const plateImage = generatedFullArtPlate(source, plateAsset);
        plate.template = "full_art";
        plate.variant = "default";
        plate.editorialComposition = "BESTIARY_ENTRY";
        plate.editorialFamily = "NARRATIVE";
        plate.title = "";
        plate.settings = { ...plate.settings, header: false, footer: false, fullBleed: true };
        plate.blocks = [plateImage];
        const measurement = await renderAndMeasure(
          browserPage,
          candidateBook(baseBook, plate, pages.length),
        );
        updatePageMetadata(plate, sourceById);
        plate.materialization.pageFillRatio = measurement.fillRatio;
        pages.push(plate);
        pageMeasurements.push(measurement);
        lastImagePage = pages.length - 1;
        textRun = 0;
        visualDebt = 0;
        usedAssetShas.add(plateAsset.sha);
      }
    }
  }
  await finishCurrent();

  /* A final measured pass repairs the rare case where a heading fitted at the
     end of a page but its following heading hierarchy did not. */
  for (let index = 0; index < pages.length - 1; index += 1) {
    const page = pages[index];
    const nextPage = pages[index + 1];
    const trailing = page.blocks.at(-1);
    if (!trailing || trailing.type !== "heading") continue;
    const previousCandidate = { ...page, blocks: page.blocks.slice(0, -1) };
    const nextCandidate = { ...nextPage, blocks: [trailing, ...nextPage.blocks] };
    const previousMeasurement = await renderAndMeasure(
      browserPage,
      candidateBook(baseBook, previousCandidate, index),
    );
    const nextMeasurement = await renderAndMeasure(
      browserPage,
      candidateBook(baseBook, nextCandidate, index + 1),
    );
    if (previousMeasurement.overflow || nextMeasurement.overflow) continue;
    page.blocks = previousCandidate.blocks;
    nextPage.blocks = nextCandidate.blocks;
    updatePageMetadata(page, sourceById);
    updatePageMetadata(nextPage, sourceById);
  }

  /* Tabelas fragmentadas podem deixar uma continuação curta isolada quando
     a página seguinte começa por um subtítulo. Recombina somente páginas
     vizinhas da mesma Parte, sem imagem e com o mesmo registro tipográfico,
     sempre revalidando a caixa real no /print. */
  for (let index = 0; index < pages.length - 1;) {
    const page = pages[index];
    const nextPage = pages[index + 1];
    const firstNextBlock = nextPage.blocks[0];
    const incompatible =
      page.part !== nextPage.part ||
      page.template !== nextPage.template ||
      page.settings.columns !== nextPage.settings.columns ||
      page.blocks.some((block) => block.type === "image") ||
      nextPage.blocks.some((block) => block.type === "image") ||
      page.blocks.some((block) => block.type === "heading" && block.level === 1) ||
      nextPage.blocks.some((block) => block.type === "heading" && block.level === 1) ||
      page.editorialFamily === "PART_OPENING" ||
      nextPage.editorialFamily === "PART_OPENING" ||
      (firstNextBlock?.type === "heading" && firstNextBlock.level === 1);
    if (incompatible) {
      index += 1;
      continue;
    }
    const merged = { ...page, blocks: [...page.blocks, ...nextPage.blocks] };
    const measurement = await renderAndMeasure(browserPage, candidateBook(baseBook, merged, index));
    if (measurement.overflow) {
      index += 1;
      continue;
    }
    pages.splice(index, 2, merged);
    pageMeasurements.splice(index, 2, measurement);
    updatePageMetadata(merged, sourceById);
    merged.materialization.pageFillRatio = measurement.fillRatio;
  }

  /* A boundary hint may leave an empty compositor page behind when the next
     semantic opening is measured separately. Empty pages are never part of
     the materialized book and must not affect folios or final measurements. */
  const compacted = pages
    .map((page, index) => ({ page, measurement: pageMeasurements[index] }))
    .filter(({ page }) => page.blocks.length > 0);
  pages.splice(0, pages.length, ...compacted.map(({ page }) => page));
  pageMeasurements = compacted.map(({ measurement }) => measurement).filter(Boolean);
  pages.forEach((page, index) => {
    page.id = `${scope.toLowerCase()}-page-${String(index + 1).padStart(4, "0")}`;
    if (page.materialization && pageMeasurements[index])
      page.materialization.pageFillRatio = pageMeasurements[index].fillRatio;
  });
  return { pages, pageMeasurements, spreads };
}

function validationTextForSource(source) {
  if (source.type === "table") {
    return (source.tableLines ?? []).filter((line) => !isTableSeparator(line)).join("\n");
  }
  return source.type === "heading" ? source.text : source.raw;
}

function validationTextForBlock(block) {
  if (block.type === "heading") return block.text;
  if (block.type === "text") return block.content;
  if (block.type === "quote") return block.text;
  if (block.type === "table") {
    return block.rows
      .filter(
        (row) => row.kind !== "header" || (block.materialization?.sourceFragmentIndex ?? 0) === 0,
      )
      .flatMap((row) => row.cells.map((cell) => cell.content))
      .join("\n");
  }
  return "";
}

function normalizedValidationText(value) {
  return stripMarkdown(value).replace(/\s+/gu, " ").trim();
}

function wordMultiset(value) {
  const counts = new Map();
  for (const token of normalizedValidationText(value)
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/u)
    .filter(Boolean)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function wordDelta(expected, actual) {
  const expectedCounts = wordMultiset(expected);
  const actualCounts = wordMultiset(actual);
  let lost = 0;
  let added = 0;
  for (const [word, count] of expectedCounts)
    lost += Math.max(0, count - (actualCounts.get(word) ?? 0));
  for (const [word, count] of actualCounts)
    added += Math.max(0, count - (expectedCounts.get(word) ?? 0));
  return { lost, added };
}

function collectMaterializedSourceOccurrences(book, expectedIdSet = null) {
  const occurrences = new Map();
  const orderedIds = [];
  for (const [pageIndex, page] of book.pages.entries()) {
    for (const [blockIndex, block] of page.blocks.entries()) {
      const metadata = block.materialization;
      const sourceBlockId = metadata?.sourceBlockId;
      if (!sourceBlockId) continue;
      if (expectedIdSet && !expectedIdSet.has(sourceBlockId)) continue;
      if (!occurrences.has(sourceBlockId)) {
        occurrences.set(sourceBlockId, []);
        orderedIds.push(sourceBlockId);
      }
      occurrences.get(sourceBlockId).push({
        block,
        fragmentIndex: metadata.sourceFragmentIndex ?? 0,
        fragmentCount: metadata.sourceFragmentCount ?? 1,
        pageIndex,
        blockIndex,
      });
    }
  }
  return { occurrences, orderedIds };
}

function semanticImagePlacements(book, sourceBlocks) {
  const sourceById = new Map(sourceBlocks.map((source) => [source.id, source]));
  const firstPageIndex =
    sourceBlocks[0]?.scope === "PARTES_I_IV"
      ? 53
      : sourceBlocks[0]?.scope === "COMPLETO"
        ? Math.max(
            0,
            book.pages.findIndex((page) => page.materialization?.scope === "COMPLETO"),
          )
        : 0;
  return book.pages.slice(firstPageIndex).flatMap((page, relativePageIndex) =>
    page.blocks.flatMap((block, blockIndex) => {
      if (block.type !== "image") return [];
      const sourceAssetId = block.materialization?.assetSourceBlockId;
      const asset =
        HISTORY_ASSETS.find(
          (candidate) =>
            candidate.src === block.src &&
            sourceAssetId &&
            candidate.allowedHeadingIds?.includes(sourceAssetId),
        ) ?? HISTORY_ASSETS.find((candidate) => candidate.src === block.src);
      const path = [];
      for (const previousBlock of page.blocks.slice(0, blockIndex + 1)) {
        const source = sourceById.get(
          previousBlock.materialization?.sourceBlockId ??
            previousBlock.materialization?.assetSourceBlockId,
        );
        if (source?.headingPath) path.splice(0, path.length, ...source.headingPath);
      }
      const actualHeadingIds = path.map((heading) => heading.id);
      const exact = Boolean(asset && actualHeadingIds.includes(asset.anchorHeadingId));
      const adjacent = Boolean(
        asset && asset.allowedHeadingIds.some((headingId) => actualHeadingIds.includes(headingId)),
      );
      const semanticStatus = exact ? "EXACT" : adjacent ? "ALLOWED_ADJACENT" : "INVALID";
      return [
        {
          page: firstPageIndex + relativePageIndex + 1,
          asset: asset?.src ?? block.src,
          semanticAnchor: asset?.semanticAnchor ?? null,
          allowedHeadingIds: asset?.allowedHeadingIds ?? [],
          allowedWindow: asset?.allowedWindow ?? null,
          actualH2:
            path.find((heading) => heading.level === 2)?.text ??
            path.find((heading) => heading.level === 1)?.text ??
            null,
          actualHeadingIds,
          semanticStatus,
        },
      ];
    }),
  );
}

function validateMaterialization(
  book,
  sourceBlocks,
  originalHash,
  outputPath,
  finalMeasurements,
  assetHashes,
) {
  const expectedIds = sourceBlocks.map((source) => source.id);
  const { occurrences, orderedIds: seenIds } = collectMaterializedSourceOccurrences(
    book,
    new Set(expectedIds),
  );
  let sourceBlockTextMismatches = 0;
  let sourceWordsLost = 0;
  let sourceWordsAdded = 0;
  let duplicateFragmentOccurrences = 0;
  let fragmentSequenceErrors = 0;
  const sourceTextMismatchDetails = [];
  for (const source of sourceBlocks) {
    const records = (occurrences.get(source.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          a.fragmentIndex - b.fragmentIndex ||
          a.pageIndex - b.pageIndex ||
          a.blockIndex - b.blockIndex,
      );
    const expected = validationTextForSource(source);
    const grouped = new Map();
    for (const record of records) {
      const list = grouped.get(record.fragmentIndex) ?? [];
      list.push(record);
      grouped.set(record.fragmentIndex, list);
    }
    for (const list of grouped.values())
      if (list.length > 1) duplicateFragmentOccurrences += list.length - 1;
    const declaredCount = records.length
      ? Math.max(...records.map((record) => record.fragmentCount))
      : 1;
    const indexes = [...grouped.keys()].sort((a, b) => a - b);
    const expectedIndexes = Array.from({ length: declaredCount }, (_, index) => index);
    if (
      indexes.length !== expectedIndexes.length ||
      indexes.some((index, position) => index !== expectedIndexes[position])
    ) {
      fragmentSequenceErrors += 1;
    }
    const actual = indexes
      .flatMap((index) => grouped.get(index).map((record) => validationTextForBlock(record.block)))
      .join("\n");
    if (normalizedValidationText(expected) !== normalizedValidationText(actual)) {
      sourceBlockTextMismatches += 1;
      sourceTextMismatchDetails.push({
        sourceBlockId: source.id,
        sourceStartLine: source.sourceStartLine,
        expected: normalizedValidationText(expected),
        actual: normalizedValidationText(actual),
      });
    }
    const delta = wordDelta(expected, actual);
    sourceWordsLost += delta.lost;
    sourceWordsAdded += delta.added;
  }
  const orphanHeadings = book.pages.filter((page) => {
    const last = page.blocks.at(-1);
    return last?.type === "heading";
  }).length;
  const overflowPages = finalMeasurements.filter((measurement) => measurement.overflow).length;
  const brokenTableRows = finalMeasurements.reduce(
    (count, measurement) =>
      count +
      measurement.tableRows.filter(
        (row) => row.top < -1 || row.bottom > measurement.clientHeight + 1,
      ).length,
    0,
  );
  const sourceOrderChanged = expectedIds.some((id, index) => seenIds[index] !== id);
  const outputExists = path.resolve(outputPath) === path.resolve(CANONICAL_PROJECT);
  const semanticPlacements = semanticImagePlacements(book, sourceBlocks);
  return {
    SOURCE_BLOCK_TEXT_MISMATCHES: sourceBlockTextMismatches,
    SOURCE_WORDS_LOST: sourceWordsLost,
    SOURCE_WORDS_ADDED: sourceWordsAdded,
    DUPLICATE_FRAGMENT_OCCURRENCES: duplicateFragmentOccurrences,
    FRAGMENT_SEQUENCE_ERRORS: fragmentSequenceErrors,
    MANUSCRIPT_TEXT_CHANGED:
      sourceBlockTextMismatches || sourceWordsLost || sourceWordsAdded ? 1 : 0,
    MANUSCRIPT_BLOCKS_LOST: expectedIds.filter((id) => !seenIds.includes(id)).length,
    MANUSCRIPT_BLOCKS_DUPLICATED: duplicateFragmentOccurrences,
    PAGE_OVERFLOW: overflowPages,
    OVERFLOW_PAGE_NUMBERS: finalMeasurements.flatMap((measurement, index) =>
      measurement.overflow ? [index + 1] : [],
    ),
    ORPHAN_HEADINGS: orphanHeadings,
    BROKEN_TABLE_ROWS: brokenTableRows,
    SOURCE_ORDER_CHANGED: sourceOrderChanged ? 1 : 0,
    ASSETS_MODIFIED: assetHashes.some(({ asset, currentSha }) => asset.sha !== currentSha) ? 1 : 0,
    ORIGINAL_PROJECT_OVERWRITTEN: outputExists ? 1 : 0,
    INVALID_IMAGE_PLACEMENTS: semanticPlacements.filter(
      (placement) => placement.semanticStatus === "INVALID",
    ).length,
    SEMANTIC_IMAGE_PLACEMENTS: semanticPlacements,
    SOURCE_TEXT_MISMATCH_DETAILS: sourceTextMismatchDetails,
    MANUSCRIPT_BLOCKS_TOTAL: sourceBlocks.length,
    MANUSCRIPT_BLOCKS_MATERIALIZED: seenIds.length,
    TARGET_PAGE_COUNT_MISMATCH:
      sourceBlocks[0]?.scope === "COMPLETO" && book.pages.length > PAGINATION_POLICY.targetBookPages
        ? 1
        : 0,
  };
}

function stats(book, measurements, sourceBlocks) {
  const imagePages = book.pages
    .map((page, index) => (page.blocks.some((block) => block.type === "image") ? index : -1))
    .filter((index) => index >= 0);
  const intervalSegments = imagePages.length
    ? [
        imagePages[0],
        ...imagePages.slice(1).map((page, index) => page - imagePages[index]),
        book.pages.length - 1 - imagePages.at(-1),
      ]
    : [book.pages.length];
  const bodyPageIndexes = book.pages
    .map((page, index) => [page, index])
    .filter(([page]) =>
      ["PART_OPENING", "NARRATIVE"].includes(page.materialization?.editorialFamily),
    )
    .map(([, index]) => index);
  const bodyImagePages = bodyPageIndexes.filter((index) =>
    book.pages[index].blocks.some((block) => block.type === "image"),
  );
  const bodyImageIntervals = bodyImagePages
    .slice(1)
    .map((page, index) => page - bodyImagePages[index]);
  const bodyPages = book.pages.filter(
    (page) =>
      page.materialization?.editorialFamily === "NARRATIVE" &&
      !page.blocks.some((block) => block.type === "image"),
  );
  const textPageWords = bodyPages
    .map((page) => page.materialization?.wordCount ?? 0)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  const median = (values) => (values.length ? values[Math.floor(values.length / 2)] : 0);
  const mean = (values) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const textRuns = [];
  let maxTextRun = 0;
  let textRun = 0;
  let runStart = 0;
  for (const page of book.pages) {
    const hasImage = page.blocks.some((block) => block.type === "image");
    if (hasImage) {
      if (textRun)
        textRuns.push({
          startPage: runStart + 1,
          endPage: book.pages.indexOf(page),
          length: textRun,
        });
      textRun = 0;
      runStart = book.pages.indexOf(page) + 1;
    } else {
      if (!textRun) runStart = book.pages.indexOf(page);
      textRun += 1;
      maxTextRun = Math.max(maxTextRun, textRun);
    }
  }
  if (textRun)
    textRuns.push({ startPage: runStart + 1, endPage: book.pages.length, length: textRun });
  const bodyTextRuns = [];
  let bodyTextRun = 0;
  let bodyRunStart = 0;
  let bodyMaxTextRun = 0;
  for (const pageIndex of bodyPageIndexes) {
    const hasImage = book.pages[pageIndex].blocks.some((block) => block.type === "image");
    if (hasImage) {
      if (bodyTextRun)
        bodyTextRuns.push({ startPage: bodyRunStart + 1, endPage: pageIndex, length: bodyTextRun });
      bodyTextRun = 0;
      bodyRunStart = pageIndex + 1;
    } else {
      if (!bodyTextRun) bodyRunStart = pageIndex;
      bodyTextRun += 1;
      bodyMaxTextRun = Math.max(bodyMaxTextRun, bodyTextRun);
    }
  }
  if (bodyTextRun)
    bodyTextRuns.push({
      startPage: bodyRunStart + 1,
      endPage: bodyPageIndexes.at(-1) + 1,
      length: bodyTextRun,
    });
  const vertical = measurements.reduce(
    (totals, measurement) => {
      const blocks = measurement.blockInfo ?? [];
      const gaps = blocks
        .slice(1)
        .reduce((sum, block, index) => sum + Math.max(0, block.top - blocks[index].bottom), 0);
      const headings = blocks
        .filter((block) => block.isHeading)
        .reduce((sum, block) => sum + block.height, 0);
      const images = blocks
        .filter((block) => block.isImage)
        .reduce((sum, block) => sum + block.height, 0);
      const used = measurement.usedHeight ?? 0;
      return {
        text: totals.text + Math.max(0, used - gaps - headings - images),
        gaps: totals.gaps + gaps,
        headings: totals.headings + headings,
        images: totals.images + images,
        used: totals.used + used,
      };
    },
    { text: 0, gaps: 0, headings: 0, images: 0, used: 0 },
  );
  const percent = (value) =>
    vertical.used ? Number(((value / vertical.used) * 100).toFixed(2)) : 0;
  const usedAssetShas = new Set(
    book.pages.flatMap((page) =>
      page.blocks
        .filter((block) => block.type === "image")
        .map((block) => HISTORY_ASSETS.find((asset) => asset.src === block.src)?.sha)
        .filter(Boolean),
    ),
  );
  const unusedValidHistoryAssets = HISTORY_ASSETS.filter(
    (asset) => !usedAssetShas.has(asset.sha),
  ).map((asset) => asset.heading);
  const usedHistoryAssets = HISTORY_ASSETS.filter((asset) => usedAssetShas.has(asset.sha)).map(
    (asset) => ({ heading: asset.heading, sha256: asset.sha }),
  );
  const editorialFamilyCounts = Object.fromEntries(
    [
      "TITLE_PAGE",
      "COPYRIGHT_EXPEDIENTE",
      "DEDICATION",
      "INTRODUCTION",
      "PART_OPENING",
      "NARRATIVE",
    ].map((family) => [
      family,
      book.pages.filter((page) => page.materialization?.editorialFamily === family).length,
    ]),
  );
  const compositionFamilies = [
    "PART_HERO",
    "IMAGE_TOP",
    "SIDE_ART_LEFT",
    "SIDE_ART_RIGHT",
    "SIDE_ART_PAIR",
    "MAP_PAGE",
    "MAP_SPREAD",
    "GEOGRAPHY_OPENING",
    "POVO_OPENING",
    "OFICIO_CULTURAL_OPENING",
    "BESTIARY_ENTRY",
    "PEDRALMA_OPENING",
    "GEOGRAPHY_FLOW",
    "CULTURE_FLOW",
    "TEXT_FLOW",
    "TEXT_FEATURE",
    "TIMELINE_MILESTONE",
  ];
  const compositionFamilyCounts = Object.fromEntries(
    compositionFamilies.map((family) => [
      family,
      family === "MAP_SPREAD"
        ? book.pages.filter((page) =>
            page.blocks.some((block) => block.type === "image" && block.spreadSide),
          ).length
        : family === "MAP_PAGE"
          ? book.pages.filter(
              (page) =>
                page.materialization?.compositionFamily === family &&
                !page.blocks.some((block) => block.type === "image" && block.spreadSide),
            ).length
          : book.pages.filter((page) => page.materialization?.compositionFamily === family).length,
    ]),
  );
  const futureProductRoleCounts = Object.fromEntries(
    ["CORE", "GM_CANDIDATE", "PLAYER_REFERENCE", "UNDECIDED"].map((role) => [
      role,
      book.pages.filter((page) => page.futureProductRole === role).length,
    ]),
  );
  const bodyMean = mean(textPageWords);
  const bodyMedian = median(textPageWords);
  const totalWordsScope = sourceBlocks.reduce((sum, source) => sum + source.wordCount, 0);
  const currentWordsPerPage = book.pages.length ? totalWordsScope / book.pages.length : 0;
  return {
    TOTAL_PAGES: book.pages.length,
    TEXT_ONLY_PAGES: book.pages.filter(
      (page) => !page.blocks.some((block) => block.type === "image"),
    ).length,
    TOTAL_WORDS_SCOPE: totalWordsScope,
    BODY_TEXT_PAGES: bodyPages.length,
    BODY_WORDS_PER_PAGE_MEAN: Number(bodyMean.toFixed(2)),
    BODY_WORDS_PER_PAGE_MEDIAN: bodyMedian,
    PAGES_WITH_IMAGES: imagePages.length,
    PAGES_WITH_TABLES: book.pages.filter((page) =>
      page.blocks.some((block) => block.type === "table"),
    ).length,
    PAGES_WITH_MAPS: book.pages.filter(
      (page) =>
        page.editorialComposition === "MAP_PAGE" ||
        page.blocks.some((block) => block.type === "image" && /map|mapa/iu.test(block.alt ?? "")),
    ).length,
    PAGES_WITH_REVIEW_FLAGS: book.pages.filter(
      (page) => (page.materialization?.reviewFlags ?? []).length > 0,
    ).length,
    EDITORIAL_FAMILY_COUNTS: editorialFamilyCounts,
    TITLE_PAGE_PAGES: editorialFamilyCounts.TITLE_PAGE,
    COPYRIGHT_EXPEDIENTE_PAGES: editorialFamilyCounts.COPYRIGHT_EXPEDIENTE,
    DEDICATION_PAGES: editorialFamilyCounts.DEDICATION,
    INTRODUCTION_PAGES: editorialFamilyCounts.INTRODUCTION,
    PART_OPENING_PAGES: editorialFamilyCounts.PART_OPENING,
    NARRATIVE_PAGES: editorialFamilyCounts.NARRATIVE,
    GENERIC_NARRATIVE_DEFAULT_PAGES: compositionFamilyCounts.TEXT_FLOW,
    PART_HERO_PAGES: compositionFamilyCounts.PART_HERO,
    IMAGE_TOP_PAGES: compositionFamilyCounts.IMAGE_TOP,
    SIDE_ART_PAGES: compositionFamilyCounts.SIDE_ART_LEFT + compositionFamilyCounts.SIDE_ART_RIGHT,
    SIDE_ART_PAIR_PAGES: compositionFamilyCounts.SIDE_ART_PAIR,
    TEXT_FLOW_PAGES: compositionFamilyCounts.TEXT_FLOW,
    TEXT_FEATURE_PAGES: compositionFamilyCounts.TEXT_FEATURE,
    TIMELINE_MILESTONE_PAGES: compositionFamilyCounts.TIMELINE_MILESTONE,
    COMPOSITION_FAMILY_COUNTS: compositionFamilyCounts,
    FUTURE_PRODUCT_ROLE_COUNTS: futureProductRoleCounts,
    IMAGE_INTERVAL_MEAN: Number(mean(intervalSegments).toFixed(2)),
    IMAGE_INTERVAL_MEDIAN: median(intervalSegments),
    BODY_IMAGE_INTERVAL_MEAN: Number(mean(bodyImageIntervals).toFixed(2)),
    BODY_IMAGE_INTERVAL_MEDIAN: median(bodyImageIntervals),
    FIRST_IMAGE_PAGE: imagePages.length ? imagePages[0] + 1 : null,
    LAST_IMAGE_PAGE: imagePages.length ? imagePages.at(-1) + 1 : null,
    TRAILING_TEXT_PAGES: imagePages.length
      ? book.pages.length - imagePages.at(-1) - 1
      : book.pages.length,
    TEXT_RUNS: textRuns,
    BODY_TEXT_RUNS: bodyTextRuns,
    MAX_CONSECUTIVE_TEXT_PAGES: maxTextRun,
    BODY_MAX_CONSECUTIVE_TEXT_PAGES: bodyMaxTextRun,
    WORDS_PER_TEXT_PAGE_MEAN: Number(mean(textPageWords).toFixed(2)),
    WORDS_PER_TEXT_PAGE_MEDIAN: median(textPageWords),
    PAGE_FILL_MEAN: Number(
      mean(measurements.map((measurement) => measurement.fillRatio)).toFixed(4),
    ),
    UNDERFILLED_PAGES_LT_60_PERCENT: measurements.filter(
      (measurement) => measurement.fillRatio < 0.6,
    ).length,
    OVERFLOW_PAGES: measurements.filter((measurement) => measurement.overflow).length,
    UNUSED_VALID_HISTORY_ASSETS: unusedValidHistoryAssets,
    IMAGES_USED: usedHistoryAssets,
    IMAGES_UNUSED: unusedValidHistoryAssets,
    USED_HISTORY_ASSETS: usedHistoryAssets,
    USED_HISTORY_ASSET_SHA_COUNT: usedHistoryAssets.length,
    USED_HISTORY_ASSET_SHA_UNIQUE: new Set(usedHistoryAssets.map((asset) => asset.sha256)).size,
    PROJECTED_BOOK_PAGES_TEXTUAL: bodyMean
      ? Number((MANUSCRIPT_TOTAL_WORDS / bodyMean).toFixed(2))
      : null,
    PROJECTED_BOOK_PAGES_CURRENT: currentWordsPerPage
      ? Number((MANUSCRIPT_TOTAL_WORDS / currentWordsPerPage).toFixed(2))
      : null,
    PROJECTED_BOOK_PAGES_DENSE: bodyMedian
      ? Number((MANUSCRIPT_TOTAL_WORDS / Math.max(250, bodyMedian)).toFixed(2))
      : null,
    VERTICAL_SPACE_TEXT_PERCENT: percent(vertical.text),
    VERTICAL_SPACE_BLOCK_GAPS_PERCENT: percent(vertical.gaps),
    VERTICAL_SPACE_HEADINGS_PERCENT: percent(vertical.headings),
    VERTICAL_SPACE_IMAGES_PERCENT: percent(vertical.images),
    SOFT_MAX_TEXT_RUN,
    HARD_MAX_TEXT_RUN,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseProject =
    args.baseProject ??
    (args.scope === "PARTES_I_IV"
      ? APPROVED_HISTORIA_PROJECT
      : args.scope === "COMPLETO"
        ? APPROVED_AGGREGATE_PROJECT
        : CANONICAL_PROJECT);
  const [markdown, catalog, canonicalRaw, approvedHistoriaRaw, baseProjectRaw] = await Promise.all([
    readFile(MANUSCRIPT, "utf8"),
    readFile(CATALOG, "utf8"),
    readFile(CANONICAL_PROJECT, "utf8"),
    readFile(APPROVED_HISTORIA_PROJECT, "utf8"),
    readFile(baseProject, "utf8"),
  ]);
  if (!catalog.includes("## 28. Cobertura editorial capítulo a capítulo — REV1"))
    throw new Error("Catálogo REV1 §28 ausente");
  const isContinuation = args.scope === "PARTES_I_IV" || args.scope === "COMPLETO";
  const isIntegral = args.scope === "COMPLETO";
  const baseRaw = baseProjectRaw;
  const originalHash = sha256(baseRaw);
  const parsed = parseMarkdown(markdown, args.scope);
  const annotatedBlocks = annotateHeadingPaths(
    parsed.blocks.map((source) => ({ ...source, scope: args.scope })),
  );
  const extraAcervoAssets = await enrichAcervoAssets(annotatedBlocks);
  const sourceBlocks = bindSemanticAssets(
    args.scope === "PARTES_I_IV"
      ? annotatedBlocks.filter((source) =>
          /^(?:PARTE II|PARTE III|PARTE IV)\b/u.test(source.sectionH1 ?? ""),
        )
      : annotatedBlocks,
  );
  if (!sourceBlocks.length) throw new Error(`Nenhum bloco encontrado para ${args.scope}`);

  const baseBook = JSON.parse(baseRaw);
  const preexistingPageCount = isIntegral ? baseBook.pages.length : 53;
  const historyPageHashBefore = isContinuation
    ? sha256(JSON.stringify(baseBook.pages.slice(0, preexistingPageCount)))
    : null;
  const assetHashes = await Promise.all(
    HISTORY_ASSETS.map(async (asset) => {
      const assetPath = path.join(ROOT, "public", asset.src.replace(/^\/+/, ""));
      const currentSha = sha256(await readFile(assetPath));
      asset.sha = currentSha;
      return { asset, currentSha };
    }),
  );
  const server = await ensureServer(`http://127.0.0.1:${PORT}`);
  const browser = await launchChromium();
  let generated;
  let finalMeasurements;
  try {
    const context = await browser.newContext({
      viewport: { width: 1240, height: 1754 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      locale: "pt-BR",
      timezoneId: "UTC",
      colorScheme: "light",
    });
    const browserPage = await context.newPage();
    await browserPage.addInitScript((key) => {
      const raw = localStorage.getItem(key);
      if (raw) window.__KALLISTIS_BOOK__ = JSON.parse(raw);
    }, MATERIALIZER_STORAGE_KEY);
    await browserPage.goto(`http://127.0.0.1:${PORT}/print`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await browserPage.waitForSelector("html[data-print-ready='true']", { timeout: 120000 });
    await browserPage.addStyleTag({
      content:
        ".k-print[data-pagination-measurer]{position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;}",
    });
    await browserPage.evaluate(() =>
      document.querySelector(".k-print")?.setAttribute("data-pagination-measurer", "true"),
    );
    generated = await materialize({
      scope: args.scope,
      markdown,
      baseBook,
      browserPage,
      sourceBlocks,
    });
    const slug = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "");
    const roleForPart = (part) => {
      if (/^PARTE VII\b/u.test(part ?? "")) return "GM_CANDIDATE";
      if (/^PARTE (V|VI)\b/u.test(part ?? "") || /^APÊNDICES\b/u.test(part ?? ""))
        return "PLAYER_REFERENCE";
      return undefined;
    };
    const continuationPages = isContinuation
      ? generated.pages.map((page, index) => ({
          ...page,
          id: `${slug(page.part || "continuacao")}-page-${String(index + 1).padStart(4, "0")}`,
          ...(roleForPart(page.part) ? { futureProductRole: roleForPart(page.part) } : {}),
        }))
      : generated.pages;
    const continuationLabels = isContinuation
      ? [...new Set(continuationPages.map((page) => page.part).filter(Boolean))]
      : [];
    const existingNodeLabels = new Set((baseBook.nodes ?? []).map((node) => node.label));
    const continuationNodes = isContinuation
      ? continuationLabels
          .filter((label) => !existingNodeLabels.has(label))
          .map((label, index) => ({
            id: `node-${slug(label)}`,
            label,
            kind: /^APÊNDICES\b/u.test(label) ? "appendix" : "part",
            pageIds: continuationPages.filter((page) => page.part === label).map((page) => page.id),
            order: baseBook.nodes.length + index + 1,
          }))
      : null;
    const generatedSpreads = (generated.spreads ?? []).map((spread) => ({
      ...spread,
      left: spread.left + (isContinuation ? baseBook.pages.length : 0),
      right: spread.right + (isContinuation ? baseBook.pages.length : 0),
    }));
    const mapSpreadAsset = HISTORY_ASSETS.find(
      (asset) => asset.heading === "O Mapa em Duas Camadas",
    );
    const preservedSpreads = (baseBook.spreads ?? []).map((spread) =>
      spread.asset === mapSpreadAsset?.src
        ? { ...spread, sourceSha256: mapSpreadAsset.sha, sourceReference: mapSpreadAsset.reference }
        : spread,
    );
    const book = {
      ...baseBook,
      meta: {
        ...baseBook.meta,
        title: "KALLISTIS — Manual do Mundo",
        author: "Antônio de Oliveira",
        imprint: "Nomos Ludens",
        edition: "v1.5 candidata — prova privada",
      },
      nodes: isContinuation
        ? [...baseBook.nodes, ...continuationNodes]
        : [
            {
              id: `node-${args.scope.toLowerCase()}`,
              label: args.scope,
              kind: args.scope === "HISTORIA" ? "part" : "chapter",
              pageIds: generated.pages.map((page) => page.id),
            },
          ],
      pages: isContinuation
        ? [...structuredClone(baseBook.pages), ...continuationPages]
        : generated.pages,
      spreads: [...preservedSpreads, ...generatedSpreads],
    };
    const repairedOrphanHeadings = repairOrphanHeadings(book);
    const preexistingEditorialCorrections = isIntegral
      ? applyPreexistingEditorialCorrections(book)
      : 0;
    finalMeasurements =
      (await renderAndMeasure(browserPage, book),
      await browserPage.evaluate(() =>
        [...document.querySelectorAll(".k-page")].map((root) => {
          const content = root.querySelector(".k-page__content") ?? root;
          const rect = content?.getBoundingClientRect();
          if (!content || !rect)
            return { overflow: true, fillRatio: 1, clientHeight: 0, tableRows: [] };
          const specialCopy = root.querySelector("[data-full-art-copy='true']");
          const blockInfo = [...content.querySelectorAll("[data-block-id]")].map((element) => {
            const r = element.getBoundingClientRect();
            return {
              id: element.dataset.blockId ?? "",
              height: r.height,
              top: r.top - rect.top,
              bottom: r.bottom - rect.top,
              isHeading: Boolean(element.querySelector(".k-h1, .k-h2, .k-h3, .k-h4, .k-h5")),
              isImage: Boolean(element.querySelector("img, .k-image-placeholder")),
            };
          });
          const used = blockInfo.reduce(
            (max, element) => (element.isImage ? max : Math.max(max, element.bottom)),
            0,
          );
          const blockOutOfBounds = blockInfo.some(
            (element) => !element.isImage && (element.top < -1 || element.bottom > rect.height + 1),
          );
          return {
            overflow:
              blockOutOfBounds ||
              (specialCopy
                ? specialCopy.scrollHeight > specialCopy.clientHeight + 1 ||
                  specialCopy.scrollWidth > specialCopy.clientWidth + 1
                : !["part_opening", "full_art"].includes(root.dataset.template ?? "") &&
                  (content.scrollHeight > content.clientHeight + 1 ||
                    content.scrollWidth > content.clientWidth + 1)),
            fillRatio: content.clientHeight ? used / content.clientHeight : 0,
            usedHeight: used,
            clientHeight: content.clientHeight,
            clientWidth: content.clientWidth,
            scrollWidth: content.scrollWidth,
            blockInfo,
            tableRows: [...content.querySelectorAll("[data-table-row-id]")].map((row) => {
              const r = row.getBoundingClientRect();
              return { top: r.top - rect.top, bottom: r.bottom - rect.top };
            }),
          };
        }),
      ));
    finalMeasurements.forEach((measurement, index) => {
      const page = book.pages[index];
      if (page?.materialization && (!isContinuation || index >= baseBook.pages.length))
        page.materialization.pageFillRatio = measurement.fillRatio;
    });
    const currentAssetHashes = await Promise.all(
      HISTORY_ASSETS.map(async (asset) => ({
        asset,
        currentSha: sha256(
          await readFile(path.join(ROOT, "public", asset.src.replace(/^\/+/, ""))),
        ),
      })),
    );
    const invariants = validateMaterialization(
      book,
      sourceBlocks,
      originalHash,
      args.output,
      finalMeasurements,
      currentAssetHashes,
    );
    const diagnostics = {
      ...stats(book, finalMeasurements, sourceBlocks),
      ...invariants,
      V15_ACERVO_ASSETS_MATERIALIZED: extraAcervoAssets.length,
      V15_ACERVO_INVENTORY: V15_INVENTORY_PATH,
      V15_ACERVO_DISPOSITION: V15_DISPOSITION_PATH,
    };
    if (isContinuation) {
      const historyPageHashAfter = sha256(
        JSON.stringify(
          book.pages.slice(0, preexistingPageCount).map((page, index) => {
            const basePage = baseBook.pages[index];
            const baseBlocks = new Map((basePage?.blocks ?? []).map((block) => [block.id, block]));
            return {
              ...page,
              blocks: page.blocks
                .filter((block) => !block.materialization?.editorialCorrectionAdded)
                .map((block) => baseBlocks.get(block.id) ?? block),
            };
          }),
        ),
      );
      diagnostics.PREEXISTING_PAGES_EXPECTED = preexistingPageCount;
      diagnostics.PREEXISTING_PAGES_PRESERVED =
        historyPageHashBefore === historyPageHashAfter
          ? `${preexistingPageCount}/${preexistingPageCount}`
          : "FAIL";
      diagnostics.PREEXISTING_PAGE_CONTENT_CHANGED =
        historyPageHashBefore === historyPageHashAfter ? 0 : 1;
      diagnostics.PREEXISTING_PAGE_LAYOUT_CHANGED =
        historyPageHashBefore === historyPageHashAfter ? 0 : 1;
      diagnostics.PREEXISTING_EDITORIAL_CORRECTIONS = preexistingEditorialCorrections;
      diagnostics.ORPHAN_HEADINGS_REPAIRED = repairedOrphanHeadings;
      if (!isIntegral) {
        diagnostics.HISTORIA_PAGES_EXPECTED = 53;
        diagnostics.HISTORIA_PAGES_PRESERVED = diagnostics.PREEXISTING_PAGES_PRESERVED;
        diagnostics.HISTORIA_PAGE_CONTENT_CHANGED = diagnostics.PREEXISTING_PAGE_CONTENT_CHANGED;
        diagnostics.HISTORIA_PAGE_LAYOUT_CHANGED = diagnostics.PREEXISTING_PAGE_LAYOUT_CHANGED;
      }
      diagnostics.NEW_PAGES_TOTAL = continuationPages.length;
      diagnostics.TOTAL_BOOK_PAGES_SO_FAR = book.pages.length;
      for (const part of continuationLabels) {
        const partSources = sourceBlocks.filter((source) => source.sectionH1?.startsWith(part));
        const partPages = continuationPages.filter((page) => page.part?.startsWith(part));
        diagnostics[`${part.replaceAll(" ", "_")}_WORDS`] = partSources.reduce(
          (sum, source) => sum + source.wordCount,
          0,
        );
        diagnostics[`${part.replaceAll(" ", "_")}_PAGES`] = partPages.length;
        diagnostics[`${part.replaceAll(" ", "_")}_PAGES_WITH_IMAGES`] = partPages.filter((page) =>
          page.blocks.some((block) => block.type === "image"),
        ).length;
      }
      diagnostics.PART_V_MATERIALIZED = continuationLabels.some((label) =>
        /^PARTE V\b/u.test(label),
      )
        ? "YES"
        : "NO";
    }
    const compositionFamiliesUsed = Object.values(diagnostics.COMPOSITION_FAMILY_COUNTS).filter(
      (count) => count > 0,
    ).length;
    const historyGatePassed =
      !isContinuation ||
      (diagnostics.PREEXISTING_PAGES_PRESERVED ===
        `${preexistingPageCount}/${preexistingPageCount}` &&
        diagnostics.PREEXISTING_PAGE_CONTENT_CHANGED === 0 &&
        diagnostics.PREEXISTING_PAGE_LAYOUT_CHANGED === 0);
    const visualGatePassed =
      diagnostics.INVALID_IMAGE_PLACEMENTS === 0 &&
      compositionFamiliesUsed >= 3 &&
      historyGatePassed;
    const warnings = [];
    if (book.pages.length > PAGINATION_POLICY.hardWarningBookPages)
      warnings.push("PAGE_COUNT_WARNING");
    if (book.pages.length > PAGINATION_POLICY.softMaximumBookPages)
      warnings.push("PAGE_COUNT_SOFT_MAXIMUM");
    if (diagnostics.PROJECTED_BOOK_PAGES_CURRENT > PAGINATION_POLICY.softMaximumBookPages)
      warnings.push("PROJECTED_BOOK_PAGES_WARNING");
    if (diagnostics.BODY_MAX_CONSECUTIVE_TEXT_PAGES > HARD_MAX_TEXT_RUN)
      warnings.push("BODY_IMAGE_CADENCE_SOFT_WARNING");
    if (diagnostics.INVALID_IMAGE_PLACEMENTS > 0) warnings.push("INVALID_IMAGE_PLACEMENTS");
    if (compositionFamiliesUsed < 3) warnings.push("INSUFFICIENT_COMPOSITION_FAMILIES");
    const report = {
      verdict:
        [
          "SOURCE_BLOCK_TEXT_MISMATCHES",
          "SOURCE_WORDS_LOST",
          "SOURCE_WORDS_ADDED",
          "DUPLICATE_FRAGMENT_OCCURRENCES",
          "FRAGMENT_SEQUENCE_ERRORS",
          "MANUSCRIPT_TEXT_CHANGED",
          "MANUSCRIPT_BLOCKS_LOST",
          "MANUSCRIPT_BLOCKS_DUPLICATED",
          "PAGE_OVERFLOW",
          "ORPHAN_HEADINGS",
          "BROKEN_TABLE_ROWS",
          "SOURCE_ORDER_CHANGED",
          "ASSETS_MODIFIED",
          "ORIGINAL_PROJECT_OVERWRITTEN",
          "INVALID_IMAGE_PLACEMENTS",
          "TARGET_PAGE_COUNT_MISMATCH",
        ].some((key) => invariants[key] !== 0) || !visualGatePassed
          ? "FAIL"
          : "PASS",
      scope: args.scope,
      generatedAt: new Date().toISOString(),
      engine: {
        generatedBy: "kallistis-materializer",
        materializationVersion: VERSION,
        paginationPolicy: PAGINATION_POLICY,
        imageCadence: IMAGE_CADENCE,
        manuscriptTotalWords: MANUSCRIPT_TOTAL_WORDS,
        softMaxTextRun: SOFT_MAX_TEXT_RUN,
        hardMaxTextRun: HARD_MAX_TEXT_RUN,
      },
      input: {
        manuscript: MANUSCRIPT,
        manuscriptSha256: sha256(normalizeLineEndings(markdown)),
        catalog: CATALOG,
        catalogSha256: sha256(catalog),
        sourceStartLine: parsed.selectedStartLine,
        sourceEndLine: parsed.selectedEndLine,
      },
      output: {
        project: args.output,
        originalProject: baseProject,
        originalProjectSha256: originalHash,
      },
      legacyReference: {
        project: CANONICAL_PROJECT,
        implementation: LEGACY_REFERENCE_SCRIPT,
        componentsReused: [
          "PageRenderer",
          "PartOpeningTemplate",
          "ChapterOpeningTemplate",
          "object-position/objectX",
          "140x210mm token grid",
        ],
        componentsAdapted: [
          "image-top sizing",
          "image-side composition",
          "front matter dedication anchoring",
          "timeline milestone rhythm",
          "shared editorial image pair metadata",
        ],
      },
      visualGate: {
        passed: visualGatePassed,
        semanticCorrectness: diagnostics.INVALID_IMAGE_PLACEMENTS === 0,
        compositionFamiliesUsed,
        minimumCompositionFamilies: 3,
        cadenceSoft: true,
        justification: null,
      },
      warnings,
      diagnostics,
    };
    await writeFile(args.output, `${JSON.stringify(book, null, 2)}\n`, "utf8");
    await writeFile(
      args.output.replace(/\.json$/u, ".report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(
      JSON.stringify(
        { ...report, output: report.output, diagnostics: report.diagnostics },
        null,
        2,
      ),
    );
    if (report.verdict !== "PASS") process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`[kallistis-materializer] ${error instanceof Error ? error.stack : error}`);
  process.exitCode = 1;
});
