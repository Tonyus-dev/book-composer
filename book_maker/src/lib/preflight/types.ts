/**
 * PREFLIGHT EDITORIAL — modelo de diagnóstico.
 *
 * O preflight nunca corrige nada: ele descreve o que a produção pode perder.
 * ERROR   → a exportação de produção pode perder conteúdo ou sair incorreta.
 * WARNING → exporta, mas precisa de revisão editorial.
 * INFO    → recomendação editorial.
 */
export type PreflightSeverity = "error" | "warning" | "info";

/** static: derivado só do JSON (reprodutível). measured: exige layout renderizado. */
export type PreflightSource = "static" | "measured";

export type PreflightRuleId =
  | "text-overflow"
  | "element-outside-trim"
  | "content-outside-safe-area"
  | "missing-asset"
  | "broken-asset-reference"
  | "asset-outside-catalog"
  | "image-low-resolution"
  | "full-bleed-insufficient-bleed"
  | "missing-alt-text"
  | "caption-detached"
  | "table-overflow"
  | "table-cell-overflow"
  | "table-width-invalid"
  | "table-empty"
  | "table-merge-invalid"
  | "table-too-small-text"
  | "table-column-too-narrow"
  | "box-split"
  | "heading-orphan"
  | "widow-orphan"
  | "blank-page"
  | "missing-page-number"
  | "page-parity"
  | "running-header"
  | "numbering-discontinuity"
  | "broken-internal-reference"
  | "toc-destination"
  | "font-substitution"
  | "hidden-content"
  | "low-contrast";

export interface PreflightRuleMeta {
  id: PreflightRuleId;
  label: string;
  source: PreflightSource;
  /** inspeção sugerida — o que abrir e conferir na página */
  inspection: string;
}

export interface PreflightIssue {
  rule: PreflightRuleId;
  severity: PreflightSeverity;
  /** null = diagnóstico de documento (não pertence a uma página) */
  pageId: string | null;
  folio: number | null;
  /** id do bloco quando o problema é localizável */
  blockId?: string | undefined;
  /** descrição do elemento (bloco, header, tabela, parágrafo) */
  element: string;
  description: string;
  inspection: string;
  source: PreflightSource;
}

export interface PreflightSummary {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface PreflightReport {
  schemaVersion: 1;
  tool: "KALLISTIS BOOK BUILDER · preflight";
  generatedAt: string;
  book: {
    title: string;
    edition: string;
    pages: number;
    firstFolio: number;
    /** impressão digital do JSON: o mesmo livro gera o mesmo relatório */
    fingerprint: string;
  };
  /** false = só regras estáticas; medições de layout não foram executadas */
  measured: boolean;
  summary: PreflightSummary;
  issues: PreflightIssue[];
}

export const PREFLIGHT_RULES: Record<PreflightRuleId, PreflightRuleMeta> = {
  "text-overflow": {
    id: "text-overflow",
    label: "Texto excede a caixa",
    source: "measured",
    inspection: "Abra a página e reduza o conteúdo ou distribua em nova página.",
  },
  "element-outside-trim": {
    id: "element-outside-trim",
    label: "Elemento fora do trim",
    source: "measured",
    inspection: "Ative a sangria no overlay e verifique a posição do elemento.",
  },
  "content-outside-safe-area": {
    id: "content-outside-safe-area",
    label: "Conteúdo fora da área segura",
    source: "measured",
    inspection: "Ative o overlay de área segura e recomponha o bloco.",
  },
  "missing-asset": {
    id: "missing-asset",
    label: "Asset ausente",
    source: "static",
    inspection: "Selecione o bloco e escolha uma imagem no navegador de assets.",
  },
  "broken-asset-reference": {
    id: "broken-asset-reference",
    label: "Referência de asset quebrada",
    source: "static",
    inspection: "O id asset: não existe em book.assets — reenvie a imagem.",
  },
  "asset-outside-catalog": {
    id: "asset-outside-catalog",
    label: "Asset fora do catálogo",
    source: "static",
    inspection: "Registre o arquivo no catálogo ou envie-o para dentro do projeto.",
  },
  "image-low-resolution": {
    id: "image-low-resolution",
    label: "Resolução efetiva baixa",
    source: "static",
    inspection: "Confira ppi efetivo no navegador de assets e substitua a arte.",
  },
  "full-bleed-insufficient-bleed": {
    id: "full-bleed-insufficient-bleed",
    label: "Full bleed sem sangria suficiente",
    source: "static",
    inspection: "Verifique o token de sangria e se a imagem cobre o trim + sangria.",
  },
  "missing-alt-text": {
    id: "missing-alt-text",
    label: "Alt text ausente",
    source: "static",
    inspection: "Preencha ALT TEXT no painel de propriedades da imagem.",
  },
  "caption-detached": {
    id: "caption-detached",
    label: "Legenda separada da imagem",
    source: "static",
    inspection: "Reordene os blocos para que a legenda siga a imagem.",
  },
  "table-overflow": {
    id: "table-overflow",
    label: "Tabela excede a medida",
    source: "static",
    inspection: "Use span de largura total, reduza colunas ou o corpo de tabela.",
  },
  "table-cell-overflow": {
    id: "table-cell-overflow",
    label: "Célula de tabela excede a página",
    source: "measured",
    inspection: "Reduza o conteúdo da célula ou quebre a tabela antes dessa linha.",
  },
  "table-width-invalid": {
    id: "table-width-invalid",
    label: "Larguras de tabela inválidas",
    source: "static",
    inspection: "Confira as divisórias de coluna e normalize a soma para 100%.",
  },
  "table-empty": {
    id: "table-empty",
    label: "Tabela vazia",
    source: "static",
    inspection: "Preencha a tabela ou remova o bloco vazio.",
  },
  "table-merge-invalid": {
    id: "table-merge-invalid",
    label: "Mesclagem estrutural inválida",
    source: "static",
    inspection: "Desmescle a célula e refaça o intervalo retangular.",
  },
  "table-too-small-text": {
    id: "table-too-small-text",
    label: "Texto de tabela pequeno demais",
    source: "static",
    inspection: "Aumente o corpo da tabela para preservar legibilidade em P&B.",
  },
  "table-column-too-narrow": {
    id: "table-column-too-narrow",
    label: "Coluna estreita demais",
    source: "static",
    inspection: "Arraste a divisória para redistribuir a largura da tabela.",
  },
  "box-split": {
    id: "box-split",
    label: "Box quebrado indevidamente",
    source: "static",
    inspection: "Divida o box ou mova-o para a página seguinte.",
  },
  "heading-orphan": {
    id: "heading-orphan",
    label: "Título órfão no fim da página",
    source: "static",
    inspection: "Mova o título para a página seguinte, junto do texto que ele abre.",
  },
  "widow-orphan": {
    id: "widow-orphan",
    label: "Viúva tipográfica",
    source: "measured",
    inspection: "Reveja o parágrafo: a última linha tem uma palavra isolada.",
  },
  "blank-page": {
    id: "blank-page",
    label: "Página em branco",
    source: "static",
    inspection: "Confirme se a página vazia é intencional (verso de abertura).",
  },
  "missing-page-number": {
    id: "missing-page-number",
    label: "Número de página ausente",
    source: "static",
    inspection: "Ative Número de página nas propriedades da página.",
  },
  "page-parity": {
    id: "page-parity",
    label: "Paridade de página incorreta",
    source: "static",
    inspection: "Aberturas devem cair em recto (fólio ímpar). Insira página de respiro.",
  },
  "running-header": {
    id: "running-header",
    label: "Running header inconsistente",
    source: "static",
    inspection: "Preencha Parte/Capítulo ou desligue o header nesta página.",
  },
  "numbering-discontinuity": {
    id: "numbering-discontinuity",
    label: "Descontinuidade de numeração",
    source: "static",
    inspection: "Reveja o primeiro fólio e a contagem física de páginas.",
  },
  "broken-internal-reference": {
    id: "broken-internal-reference",
    label: "Referência interna quebrada",
    source: "static",
    inspection: "O destino do link não existe no livro — corrija o texto.",
  },
  "toc-destination": {
    id: "toc-destination",
    label: "Entrada de sumário sem destino",
    source: "static",
    inspection: "Ajuste o fólio da entrada para uma página existente.",
  },
  "font-substitution": {
    id: "font-substitution",
    label: "Fonte substituída por fallback",
    source: "measured",
    inspection: "Sem a face editorial carregada o PDF sai com fonte de sistema.",
  },
  "hidden-content": {
    id: "hidden-content",
    label: "Conteúdo oculto por regra de overflow",
    source: "measured",
    inspection: "O contêiner corta conteúdo: aumente a caixa ou reduza o material.",
  },
  "low-contrast": {
    id: "low-contrast",
    label: "Contraste de texto baixo",
    source: "measured",
    inspection: "Reveja cor de texto sobre o fundo desta página.",
  },
};

export const SEVERITY_ORDER: Record<PreflightSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export const SEVERITY_LABEL: Record<PreflightSeverity, string> = {
  error: "ERROR",
  warning: "WARNING",
  info: "INFO",
};

export function summarize(issues: PreflightIssue[]): PreflightSummary {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    infos: issues.filter((i) => i.severity === "info").length,
    total: issues.length,
  };
}
