/**
 * Camada de paginação — pensada para ser trocável (Paged.js <-> Vivliostyle).
 *
 * Estado real:
 *  - "fixed" (ativo): o modelo de dados é explicitamente paginado. Cada Page do
 *    JSON é uma página física 210x280 mm. O Chromium imprime 1:1 e o PDF nasce
 *    do HTML/CSS. Nenhuma biblioteca externa é necessária.
 *  - "paged" / "vivliostyle" (NÃO IMPLEMENTADO): necessários somente quando o
 *    livro passar a ter fluxo contínuo (importação de texto longo) e a quebra
 *    de páginas precisar ser calculada. Interface abaixo é o ponto de extensão.
 */
export type PaginationEngine = "fixed" | "paged" | "vivliostyle";

export interface PaginationAdapter {
  engine: PaginationEngine;
  available: boolean;
  /** Prepara o DOM da print view. Resolve quando as páginas estão estáveis. */
  paginate(root: HTMLElement): Promise<void>;
}

export const fixedAdapter: PaginationAdapter = {
  engine: "fixed",
  available: true,
  async paginate() {
    /* O modelo já é paginado: nada a calcular. */
  },
};

export const pagedAdapter: PaginationAdapter = {
  engine: "paged",
  available: false,
  async paginate() {
    throw new Error("Paginação por fluxo (Paged.js) ainda não implementada. Use engine 'fixed'.");
  },
};

export function getPaginationAdapter(engine: PaginationEngine = "fixed"): PaginationAdapter {
  return engine === "fixed" ? fixedAdapter : pagedAdapter;
}
