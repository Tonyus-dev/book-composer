/**
 * Catálogo de assets locais (public/assets).
 * O editor apenas CONSOME assets. Nenhuma geração automática de arte.
 * Para adicionar: coloque o arquivo em public/assets/<categoria>/ e registre aqui.
 */
export type AssetCategory =
  | "branding"
  | "cover"
  | "povos"
  | "oficios"
  | "characters"
  | "locations"
  | "maps"
  | "artifacts"
  | "icons"
  | "ornaments";

export interface AssetEntry {
  src: string;
  label: string;
  category: AssetCategory;
  /** estimativa legada de uso; o preflight real deriva PPI da geometria física do bloco */
  effectivePpi?: number;
  note?: string;
}

export const ASSET_CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "branding", label: "Marca" },
  { id: "cover", label: "Capa" },
  { id: "povos", label: "Povos" },
  { id: "oficios", label: "Ofícios" },
  { id: "characters", label: "Personagens" },
  { id: "locations", label: "Cenários" },
  { id: "maps", label: "Mapas" },
  { id: "artifacts", label: "Artefatos" },
  { id: "icons", label: "Ícones" },
  { id: "ornaments", label: "Ornamentos" },
];

export const ASSETS: AssetEntry[] = [
  {
    src: "/assets/branding/KALLISTIS_lockup_master.jpg",
    label: "Lockup principal (master)",
    category: "branding",
    note: "Master oficial. Não distorcer, girar, recolorir ou recriar.",
  },
  {
    src: "/assets/branding/KALLISTIS_wordmark_master.jpg",
    label: "Wordmark (master)",
    category: "branding",
    note: "Arte proprietária. Nunca substituir por fonte.",
  },
  {
    src: "/assets/branding/KALLISTIS_symbol_master.jpg",
    label: "Símbolo (master)",
    category: "branding",
  },
  {
    src: "/assets/cover/capa-cristal.jpg",
    label: "Cristal partido — campo de capa",
    category: "cover",
    effectivePpi: 240,
  },
  { src: "/assets/povos/kragor.jpg", label: "Kragor", category: "povos", effectivePpi: 260 },
  { src: "/assets/povos/doreos.jpg", label: "Dóreos", category: "povos", effectivePpi: 260 },
  {
    src: "/assets/locations/fratura-eixo.jpg",
    label: "Fratura como eixo visual",
    category: "locations",
    effectivePpi: 300,
  },
  {
    src: "/assets/locations/cotidiano-dualidade.jpg",
    label: "Cotidiano e dualidade",
    category: "locations",
    effectivePpi: 300,
  },
  {
    src: "/assets/maps/dualidade.jpg",
    label: "Referência cromática de dualidade",
    category: "maps",
    effectivePpi: 300,
  },
  {
    src: "/assets/ornaments/X4_ornamento_de_canto_em_pedra_gravada.png",
    label: "Ornamento de canto — pedra gravada",
    category: "ornaments",
    note: "Aberturas minerais e páginas de presença forte.",
  },
  {
    src: "/assets/ornaments/V1_velarim.png",
    label: "Canto Velarim",
    category: "ornaments",
    note: "Aberturas e seções ligadas ao Velarim.",
  },
  {
    src: "/assets/ornaments/X2_ornamento_de_canto_cristalino_fissurado.png",
    label: "Ornamento de canto — cristal fissurado",
    category: "ornaments",
    note: "Cristal, Fratura e transições de parte.",
  },
  {
    src: "/assets/ornaments/X5_ornamento_de_canto_gotico_gravado.png",
    label: "Ornamento de canto — gótico gravado",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/X6_ornamento_floral_de_canto_em_tinta_preta.png",
    label: "Ornamento de canto — floral em tinta",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/X3_ornamento_de_canto_em_gravura_ornamental.png",
    label: "Ornamento de canto — gravura ornamental",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/X1_moldura_ornamental_em_canto_envelhecido.png",
    label: "Ornamento de canto — envelhecido",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/C2_fresta_kethrell.png",
    label: "Canto — Fresta Kethrell",
    category: "ornaments",
    note: "Uso temático em Frestas e Kethrell.",
  },
  {
    src: "/assets/ornaments/C1_cristal_partido.png",
    label: "Canto — cristal partido",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/N2_curva_neutra_reforcada.png",
    label: "Canto neutro reforçado",
    category: "ornaments",
    note: "Aberturas sem símbolo temático específico.",
  },
  {
    src: "/assets/ornaments/L1_manesh.png",
    label: "Canto Manesh",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/N1_curva_neutra_simples.png",
    label: "Canto neutro simples",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/T1_thuvel.png",
    label: "Canto Thuvel",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/P1_pedralma.png",
    label: "Canto Pedr’alma",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/moldura_ornamental_prateada_no_canto_inferior_dire.png",
    label: "Moldura prateada — canto inferior direito",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/imagegen (copy 3).png",
    label: "Moldura integral — cristal e metal",
    category: "ornaments",
    note: "Uso raro em abertura especial; não aplicar como fundo universal.",
  },
  {
    src: "/assets/ornaments/divisor_ornamental_roxo_e_dourado.png",
    label: "Divisor roxo e dourado",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/divisor_ornamental_prateado_simétrico.png",
    label: "Divisor prateado simétrico",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/divisor_ornamental_de_cristal_prateado.png",
    label: "Divisor de cristal prateado",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/divisor_ornamental_art_nouveau_metálico.png",
    label: "Divisor art nouveau metálico",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/divisor_ornamental_art_déco_prateado.png",
    label: "Divisor art déco prateado",
    category: "ornaments",
  },
  {
    src: "/assets/ornaments/logotipo_kallistis_em_metal_esculpido.png",
    label: "Wordmark KALLISTIS — metal esculpido",
    category: "ornaments",
    note: "Reservado para capa/identidade; não usar no miolo automaticamente.",
  },
  {
    src: "/assets/ornaments/logotipo_kallistis_em_metal_cromado.png",
    label: "Wordmark KALLISTIS — metal cromado",
    category: "ornaments",
    note: "Reservado para capa/identidade; não usar no miolo automaticamente.",
  },
];

export function assetsByCategory(category: AssetCategory) {
  return ASSETS.filter((asset) => asset.category === category);
}

export function findAsset(src: string) {
  return ASSETS.find((asset) => asset.src === src);
}
