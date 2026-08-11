/**
 * KALLISTIS BOOK BUILDER — modelo de dados editorial.
 * Tudo aqui é serializável em JSON (versionável em Git).
 * Nenhuma decisão editorial deve viver no JSX: ela vive neste modelo.
 */

export type TemplateId =
  | "cover"
  | "front_matter"
  | "toc"
  | "part_opening"
  | "chapter_opening"
  | "narrative"
  | "rules_2col"
  | "profile"
  | "table_page"
  | "quote_layout"
  | "full_art"
  | "map_page";

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  cover: "COVER",
  front_matter: "FRONT MATTER",
  toc: "TOC",
  part_opening: "PART",
  chapter_opening: "CHAPTER",
  narrative: "NARRATIVE",
  rules_2col: "RULES",
  profile: "PROFILE",
  table_page: "TABLE",
  quote_layout: "QUOTE",
  full_art: "ART",
  map_page: "MAP",
};

/** Variantes de composição por template (o editor escolhe, nunca a automação). */
export type PageVariant =
  | "default"
  | "image-top"
  | "image-side"
  | "portrait-left"
  | "portrait-right"
  | "portrait-bottom"
  | "dual-portrait"
  | "inline-block"
  | "full-page";

export type BlockAlign = "start" | "center" | "end" | "justify";
export type BlockSpan = "column" | "full";

export interface BaseBlock {
  id: string;
  /** Bloco pode ocupar uma coluna ou a largura total da caixa de texto. */
  span?: BlockSpan;
  /** Espaço editorial antes/depois, em mm. */
  spaceBefore?: number;
  spaceAfter?: number;
  /** Metadados discretos de uma instância de recipe; não alteram o print. */
  recipeSlotKey?: string;
  recipeSlotLabel?: string;
  recipeSlotRequired?: boolean;
}

export type TextRole = "body" | "lead" | "dialogue" | "credits" | "note";

export interface TextBlock extends BaseBlock {
  type: "text";
  /** Markdown simples: **bold**, *itálico*, - lista, [link](url). */
  content: string;
  role?: TextRole;
  dropCap?: boolean;
  align?: BlockAlign;
  width?: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  eyebrow?: string;
}

export type ImageFit = "contain" | "cover";
export type ImagePosition = "flow" | "left" | "right" | "top" | "bottom" | "full";

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
  fit?: ImageFit;
  /** object-position em porcentagem (crop). */
  objectX?: number;
  objectY?: number;
  /** deslocamento visual em porcentagem do frame, aplicado pela composição direta. */
  offsetX?: number;
  offsetY?: number;
  /** largura/altura em % ou mm (string CSS). */
  width?: string;
  height?: string;
  position?: ImagePosition;
  fullBleed?: boolean;
  /** ppi efetivo declarado — usado apenas para warning editorial. */
  effectivePpi?: number;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  attribution?: string;
  size?: "sm" | "md" | "lg";
  variant?: "plain" | "rule";
  align?: BlockAlign;
}

export type TableAlign = "left" | "center" | "right";
export type TableVerticalAlign = "top" | "middle" | "bottom";
export type TableRowKind = "header" | "body" | "footer";
export type TableBorderMode = "none" | "horizontal" | "grid" | "custom";

export interface TableCellStyle {
  background?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  fontSize?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  color?: string;
}

export interface TableRowStyle {
  background?: string;
  borderTop?: string;
  borderBottom?: string;
}

export interface TableColumn {
  id: string;
  label?: string;
  width?: number;
  minWidth?: number;
  align?: TableAlign;
}

export interface TableCell {
  id: string;
  content: string;
  colSpan?: number;
  rowSpan?: number;
  align?: TableAlign;
  verticalAlign?: TableVerticalAlign;
  emphasis?: "normal" | "strong";
  style?: TableCellStyle;
}

export interface TableRow {
  id: string;
  kind?: TableRowKind;
  cells: TableCell[];
  minHeight?: number;
  keepTogether?: boolean;
  style?: TableRowStyle;
}

export interface TableStyle {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  textColor?: string;
  cellPaddingX?: string;
  cellPaddingY?: string;
  borderMode?: TableBorderMode;
  borderWidth?: string;
  borderColor?: string;
  headerBackground?: string;
  headerColor?: string;
  headerWeight?: number;
  bodyBackground?: string;
  zebra?: boolean;
  zebraBackground?: string;
  firstColumnStrong?: boolean;
}

/** Formato V2: IDs internos são persistidos e independem do índice atual. */
export interface TableBlockV2 extends BaseBlock {
  type: "table";
  tableVersion: 2;
  caption?: string;
  columns: TableColumn[];
  rows: TableRow[];
  stylePresetId?: string;
  style?: TableStyle;
  compact?: boolean;
  repeatHeader?: boolean;
  allowPageBreak?: boolean;
  continuationOf?: string;
  continuationIndex?: number;
  continuationHeader?: TableRow[];
}

/** V1 aceito na entrada para compatibilidade com projetos já salvos. */
export interface LegacyTableBlock extends BaseBlock {
  type: "table";
  tableVersion?: 1;
  caption?: string;
  columns: string[];
  rows: string[][];
  compact?: boolean;
}

export type TableBlock = TableBlockV2 | LegacyTableBlock;

export interface TableStylePreset {
  id: string;
  name: string;
  style: TableStyle;
}

export type BoxKind = "regra" | "exemplo" | "ambientacao" | "mestre" | "atencao";

export interface BoxBlock extends BaseBlock {
  type: "box";
  kind: BoxKind;
  title: string;
  content: string;
}

export interface CaptionBlock extends BaseBlock {
  type: "caption";
  text: string;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  ornament?: boolean;
}

export interface TocEntry {
  label: string;
  page: number;
  level: "part" | "chapter" | "appendix";
}

export interface TocBlock extends BaseBlock {
  type: "toc";
  columns: 1 | 2 | 3;
  entries: TocEntry[];
}

export interface LockupBlock extends BaseBlock {
  type: "lockup";
  /** Master oficial. Nunca reconstruído com fonte. */
  src: string;
  alt: string;
  width?: string;
  variant?: "lockup" | "wordmark" | "symbol";
}

export type FormFieldType = "text" | "multiline" | "number" | "checkbox" | "line";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  hint?: string;
  lines?: number;
}

/** Ficha/formulário estrutural: continua editável e imprimível, sem simular backend. */
export interface FormBlock extends BaseBlock {
  type: "form";
  title: string;
  intro?: string;
  fields: FormField[];
  columns?: 1 | 2;
}

/**
 * Documento preenchível editorial. A geometria é física (mm), portanto o
 * mesmo JSON serve ao editor, ao preenchimento digital e à impressão.
 */
export type SheetElementType =
  | "text"
  | "label"
  | "text-field"
  | "number-field"
  | "checkbox"
  | "choice"
  | "scale"
  | "line"
  | "divider"
  | "box"
  | "image"
  | "symbol"
  | "table"
  | "text-area"
  | "calculated"
  | "group"
  | "repeater";

export interface SheetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetElementStyle {
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  padding?: number;
}

export interface SheetElement {
  id: string;
  type: SheetElementType;
  rect: SheetRect;
  text?: string;
  label?: string;
  key?: string;
  placeholder?: string;
  formula?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  value?: string | number | boolean;
  source?: string;
  alt?: string;
  childIds?: string[];
  repeatCount?: number;
  repeatGap?: number;
  style?: SheetElementStyle;
  required?: boolean;
  tabIndex?: number;
  locked?: boolean;
  hidden?: boolean;
  zIndex?: number;
}

export interface SheetPage {
  id: string;
  widthMm: number;
  heightMm: number;
  elements: SheetElement[];
  background?: string;
  master?: boolean;
}

export type SheetMode = "design" | "fill" | "print";

export interface SheetDocument {
  id: string;
  name: string;
  version: 1;
  widthMm: number;
  heightMm: number;
  bleedMm?: number;
  pages: SheetPage[];
  values: Record<string, string | number | boolean>;
  formulas?: Record<string, string>;
  templateId?: string;
  mode?: SheetMode;
}

export interface SheetTemplate {
  id: string;
  name: string;
  sheet: SheetDocument;
  createdAt: string;
  updatedAt: string;
}

export interface SheetInstance {
  id: string;
  templateId: string;
  values: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface SheetBlock extends BaseBlock {
  type: "sheet";
  sheet: SheetDocument;
}

export type LayoutAreaContent =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | QuoteBlock
  | TableBlock
  | BoxBlock
  | CaptionBlock
  | DividerBlock
  | TocBlock
  | LockupBlock
  | FormBlock
  | SheetBlock;

export interface LayoutArea {
  id: string;
  row: number;
  column: number;
  rowSpan?: number;
  colSpan?: number;
  marker?: string;
  block: LayoutAreaContent;
}

/** Grid editorial real derivado do desenho ASCII; continua serializável e imprimível. */
export interface LayoutBlock extends BaseBlock {
  type: "layout";
  columns: number;
  rows: number;
  widths: number[];
  heights: number[];
  areas: LayoutArea[];
  /** Fonte textual preservada para preview e round-trip determinístico. */
  asciiSource?: string;
}

export type Block =
  | TextBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | TableBlock
  | BoxBlock
  | CaptionBlock
  | DividerBlock
  | TocBlock
  | LockupBlock
  | FormBlock
  | SheetBlock
  | LayoutBlock;

export type BlockType = Block["type"];

export interface PageSettings {
  header: boolean;
  footer: boolean;
  pageNumber: boolean;
  columns: 1 | 2;
  background: "paper" | "obsidian";
  fullBleed: boolean;
  breakBefore?: boolean;
}

export interface Page {
  id: string;
  template: TemplateId;
  variant?: PageVariant | undefined;
  /** metadados editoriais usados por header/footer */
  part?: string | undefined;
  chapter?: string | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  eyebrow?: string | undefined;
  /** composição manual protegida contra alterações automáticas futuras. */
  fixed?: boolean;
  /** Proveniência informativa; a página materializada não fica vinculada à recipe. */
  recipeInstance?: RecipeInstance;
  settings: PageSettings;
  blocks: Block[];
}

/** Nó da árvore do livro. Agrupa páginas; não duplica conteúdo. */
export interface SectionNode {
  id: string;
  label: string;
  kind: "front" | "part" | "chapter" | "appendix";
  pageIds: string[];
}

export interface BookTokens {
  pageWidth: string;
  pageHeight: string;
  bleed: string;
  marginInner: string;
  marginOuter: string;
  marginTop: string;
  marginBottom: string;
  columnGap: string;
  bodySize: string;
  bodyLeading: string;
  rulesSize: string;
  rulesLeading: string;
  tableSize: string;
  h1Size: string;
  h2Size: string;
  h3Size: string;
}

export interface BookMeta {
  title: string;
  subtitle: string;
  author: string;
  imprint: string;
  edition: string;
  /** número da primeira página impressa (a capa normalmente não numera) */
  firstFolio: number;
}

/**
 * Asset embutido no projeto: bytes em data URL + metadados de produção.
 * Blocos referenciam por `asset:<id>` (ver lib/assets/registry).
 */
export interface BookAsset {
  id: string;
  label: string;
  /** categoria do catálogo, para filtro no navegador de assets */
  category: string;
  /** data URL (base64) — mantém o JSON autocontido e reprodutível */
  data: string;
  mime: string;
  bytes: number;
  pixelWidth: number;
  pixelHeight: number;
  /** ppi efetivo se a imagem ocupar a largura total da página */
  effectivePpi?: number;
  note?: string;
  createdAt: string;
}

export interface Book {
  /** versão do formato de arquivo, para migrações futuras */
  schemaVersion: 1;
  meta: BookMeta;
  tokens: BookTokens;
  nodes: SectionNode[];
  pages: Page[];
  /** assets enviados localmente, mapeados por id */
  assets?: BookAsset[];
  /** pares obrigatórios que abrem juntos (ex.: 008-009, 021-022). */
  spreads?: Spread[];
  /** presets de tabela personalizados, persistidos dentro do projeto. */
  tableStyles?: TableStylePreset[];
  /** modelos editoriais reutilizáveis; páginas materializadas são independentes. */
  recipes?: BookRecipe[];
  /** modelos e instâncias de documentos preenchíveis, sem separar do projeto editorial. */
  sheetTemplates?: SheetTemplate[];
  sheetInstances?: SheetInstance[];
}

export type RecipeScope = "page" | "spread";

export type RecipeSlotKind =
  | "title"
  | "subtitle"
  | "eyebrow"
  | "lead"
  | "body"
  | "portrait"
  | "image"
  | "hero-image"
  | "map"
  | "symbol"
  | "table"
  | "quote"
  | "box"
  | "caption";

export type RecipeBlockMode = "slot" | "fixed" | "ignore";

export interface RecipeSlotConstraints {
  preferredOrientation?: "portrait" | "landscape" | "square";
  transparentPreferred?: boolean;
  fit?: ImageFit;
  maxCharacters?: number;
  minCharacters?: number;
}

export interface RecipeSlot {
  id: string;
  key: string;
  kind: RecipeSlotKind;
  label: string;
  required?: boolean;
  acceptedBlockTypes?: BlockType[];
  sourceBlockId?: string;
  defaults?: Record<string, unknown>;
  constraints?: RecipeSlotConstraints;
}

/** Bloco estrutural da recipe. `style` contém apenas forma e conteúdo vazio. */
export interface RecipeBlockNode {
  type: "block";
  recipeBlockId: string;
  blockType: BlockType;
  mode: RecipeBlockMode;
  slotKey?: string;
  fixedContent?: Block;
  style?: Block;
}

export interface RecipePageBlueprint {
  template?: TemplateId;
  variant?: PageVariant;
  pageSettings?: Partial<PageSettings>;
  structure: RecipeBlockNode[];
  slots: RecipeSlot[];
}

export interface RecipePreviewMetadata {
  blockCount: number;
  slotCount: number;
  fixedCount: number;
  pageCount?: 1 | 2;
}

export interface RecipeInstance {
  recipeId: string;
  recipeVersion: number;
  spreadInstanceId?: string;
}

export interface BookRecipe {
  id: string;
  name: string;
  description?: string;
  version: number;
  scope: RecipeScope;
  template?: TemplateId;
  variant?: PageVariant;
  pageSettings?: Partial<PageSettings>;
  structure: RecipeBlockNode[];
  slots: RecipeSlot[];
  spread?: {
    left: RecipePageBlueprint;
    right: RecipePageBlueprint;
  };
  preview?: RecipePreviewMetadata;
  /** Campo de leitura apenas para projetos anteriores à versão semântica. */
  blocks?: Block[];
  createdAt: string;
  updatedAt: string;
}

export const CSS_VAR_BY_TOKEN: Record<keyof BookTokens, string> = {
  pageWidth: "--page-width",
  pageHeight: "--page-height",
  bleed: "--bleed",
  marginInner: "--margin-inner",
  marginOuter: "--margin-outer",
  marginTop: "--margin-top",
  marginBottom: "--margin-bottom",
  columnGap: "--column-gap",
  bodySize: "--body-size",
  bodyLeading: "--body-leading",
  rulesSize: "--rules-size",
  rulesLeading: "--rules-leading",
  tableSize: "--table-size",
  h1Size: "--h1-size",
  h2Size: "--h2-size",
  h3Size: "--h3-size",
};

export const DEFAULT_TOKENS: BookTokens = {
  /* Edição Definitiva v1.3 — trim 140×210 mm + bleed 5 mm → PDF 150×220 mm. */
  pageWidth: "140mm",
  pageHeight: "210mm",
  bleed: "5mm",
  marginInner: "16mm",
  marginOuter: "12mm",
  marginTop: "14mm",
  marginBottom: "16mm",
  columnGap: "6mm",
  bodySize: "10pt",
  bodyLeading: "13.5pt",
  rulesSize: "9.5pt",
  rulesLeading: "12.5pt",
  tableSize: "8.5pt",
  h1Size: "22pt",
  h2Size: "14pt",
  h3Size: "11pt",
};

/**
 * Par editorial de páginas adjacentes que compartilham uma composição visual.
 * Não altera a paginação física do PDF.
 */
export interface Spread {
  left: number;
  right: number;
  /** caminho público do asset (mesma imagem horizontal em ambos os lados). */
  asset: string;
  alt: string;
}
