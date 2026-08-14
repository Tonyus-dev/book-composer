import type { ComponentType } from "react";
import type { PageVariant, TemplateId } from "../types";
import type { TemplateProps } from "./types";
import { ChapterOpeningTemplate, CoverTemplate, PartOpeningTemplate } from "./openings";
import {
  FrontMatterTemplate,
  NarrativeTemplate,
  QuoteLayoutTemplate,
  RulesTemplate,
  TimelineMilestoneTemplate,
  TocTemplate,
} from "./editorial";
import { ProfileTemplate, TablePageTemplate } from "./reference";
import { FullArtTemplate, MapPageTemplate } from "./visual";

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  component: ComponentType<TemplateProps>;
  /** false = o template desenha até a sangria e ignora a caixa de texto */
  usesContentBox: boolean;
  variants: PageVariant[];
  /** grid sugerido; o editor pode sobrescrever */
  defaultColumns: 1 | 2;
  register: "literario" | "referencia" | "abertura";
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  cover: {
    id: "cover",
    label: "Capa",
    component: CoverTemplate,
    usesContentBox: false,
    variants: ["default"],
    defaultColumns: 1,
    register: "abertura",
  },
  front_matter: {
    id: "front_matter",
    label: "Front Matter",
    component: FrontMatterTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "referencia",
  },
  toc: {
    id: "toc",
    label: "Sumário",
    component: TocTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "referencia",
  },
  part_opening: {
    id: "part_opening",
    label: "Abertura de Parte",
    component: PartOpeningTemplate,
    usesContentBox: false,
    variants: ["default"],
    defaultColumns: 1,
    register: "abertura",
  },
  chapter_opening: {
    id: "chapter_opening",
    label: "Abertura de Capítulo",
    component: ChapterOpeningTemplate,
    usesContentBox: true,
    variants: ["image-top", "image-side", "quadrant-image"],
    defaultColumns: 1,
    register: "abertura",
  },
  narrative: {
    id: "narrative",
    label: "Narrativa",
    component: NarrativeTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "literario",
  },
  rules_2col: {
    id: "rules_2col",
    label: "Regras (2 colunas)",
    component: RulesTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 2,
    register: "referencia",
  },
  profile: {
    id: "profile",
    label: "Perfil",
    component: ProfileTemplate,
    usesContentBox: true,
    variants: ["portrait-left", "portrait-right", "portrait-bottom", "dual-portrait"],
    defaultColumns: 1,
    register: "referencia",
  },
  table_page: {
    id: "table_page",
    label: "Página de Tabela",
    component: TablePageTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "referencia",
  },
  quote_layout: {
    id: "quote_layout",
    label: "Citação",
    component: QuoteLayoutTemplate,
    usesContentBox: true,
    variants: ["inline-block", "full-page"],
    defaultColumns: 1,
    register: "literario",
  },
  full_art: {
    id: "full_art",
    label: "Arte",
    component: FullArtTemplate,
    usesContentBox: false,
    variants: ["default", "bestiary-opening"],
    defaultColumns: 1,
    register: "abertura",
  },
  map_page: {
    id: "map_page",
    label: "Mapa",
    component: MapPageTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "referencia",
  },
  timeline_milestone: {
    id: "timeline_milestone",
    label: "Marco histórico",
    component: TimelineMilestoneTemplate,
    usesContentBox: true,
    variants: ["default"],
    defaultColumns: 1,
    register: "literario",
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];
