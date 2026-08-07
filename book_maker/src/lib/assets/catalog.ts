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
  /** ppi efetivo estimado no formato 210x280 mm; usado apenas para warning */
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
];

export function assetsByCategory(category: AssetCategory) {
  return ASSETS.filter((asset) => asset.category === category);
}

export function findAsset(src: string) {
  return ASSETS.find((asset) => asset.src === src);
}
