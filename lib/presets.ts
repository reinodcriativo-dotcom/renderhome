import type { ProductCategory } from "@/types/database";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  tenis: "Tênis",
  camiseta: "Camiseta",
  bone: "Boné",
  relogio: "Relógio",
  custom: "Outro / Personalizado",
};

export const CATEGORY_ORDER: ProductCategory[] = [
  "tenis",
  "camiseta",
  "bone",
  "relogio",
  "custom",
];

export interface PresetDims {
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

/**
 * Listagem de tamanhos disponiveis por categoria. Sao mostrados como
 * dropdown no formulario. 'custom' nao tem tamanhos pre-definidos —
 * o lojista digita as medidas direto.
 */
export const SIZE_OPTIONS: Record<ProductCategory, string[]> = {
  tenis: [
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
  ],
  camiseta: ["PP", "P", "M", "G", "GG", "XGG", "XXG"],
  bone: ["U", "P", "M", "G"],
  relogio: ["36mm", "38mm", "40mm", "42mm", "44mm", "46mm"],
  custom: [],
};

/**
 * Tabela de dimensoes tipicas em cm para cada (categoria, tamanho).
 * Sao usadas para pre-preencher o formulario quando o lojista escolhe
 * a categoria + tamanho. Os valores sao aproximados — o lojista pode
 * ajustar antes de salvar.
 *
 * Referencias:
 * - Tenis: tabelas de tamanho Nike/adidas (comprimento internacional)
 * - Camiseta: tabela padrao brasileira tomadas no tecido estirado
 * - Bone: tamanhos snapback aproximados
 * - Relogio: diametro/altura tipicos de smartwatches e relogios
 */
export const PRESET_DIMS: Record<
  ProductCategory,
  Record<string, PresetDims>
> = {
  tenis: {
    "33": { length_cm: 22, width_cm: 8.5, height_cm: 10.5 },
    "34": { length_cm: 22.5, width_cm: 8.5, height_cm: 10.5 },
    "35": { length_cm: 23, width_cm: 9, height_cm: 11 },
    "36": { length_cm: 23.5, width_cm: 9, height_cm: 11 },
    "37": { length_cm: 24, width_cm: 9.5, height_cm: 11 },
    "38": { length_cm: 24.5, width_cm: 9.5, height_cm: 11.5 },
    "39": { length_cm: 25, width_cm: 10, height_cm: 11.5 },
    "40": { length_cm: 25.5, width_cm: 10, height_cm: 12 },
    "41": { length_cm: 26, width_cm: 10.5, height_cm: 12 },
    "42": { length_cm: 26.5, width_cm: 10.5, height_cm: 12.5 },
    "43": { length_cm: 27, width_cm: 11, height_cm: 12.5 },
    "44": { length_cm: 27.5, width_cm: 11, height_cm: 13 },
    "45": { length_cm: 28, width_cm: 11.5, height_cm: 13 },
    "46": { length_cm: 28.5, width_cm: 11.5, height_cm: 13 },
    "47": { length_cm: 29, width_cm: 12, height_cm: 13.5 },
    "48": { length_cm: 29.5, width_cm: 12, height_cm: 13.5 },
  },
  camiseta: {
    PP: { length_cm: 65, width_cm: 45, height_cm: 2 },
    P: { length_cm: 68, width_cm: 48, height_cm: 2 },
    M: { length_cm: 71, width_cm: 51, height_cm: 2 },
    G: { length_cm: 74, width_cm: 54, height_cm: 2 },
    GG: { length_cm: 77, width_cm: 57, height_cm: 2 },
    XGG: { length_cm: 80, width_cm: 60, height_cm: 2 },
    XXG: { length_cm: 83, width_cm: 63, height_cm: 2 },
  },
  bone: {
    U: { length_cm: 27, width_cm: 21, height_cm: 12 },
    P: { length_cm: 25, width_cm: 19, height_cm: 11 },
    M: { length_cm: 27, width_cm: 21, height_cm: 12 },
    G: { length_cm: 29, width_cm: 23, height_cm: 13 },
  },
  relogio: {
    "36mm": { length_cm: 3.6, width_cm: 3.6, height_cm: 0.9 },
    "38mm": { length_cm: 3.8, width_cm: 3.8, height_cm: 1.0 },
    "40mm": { length_cm: 4.0, width_cm: 4.0, height_cm: 1.0 },
    "42mm": { length_cm: 4.2, width_cm: 4.2, height_cm: 1.1 },
    "44mm": { length_cm: 4.4, width_cm: 4.4, height_cm: 1.1 },
    "46mm": { length_cm: 4.6, width_cm: 4.6, height_cm: 1.2 },
  },
  custom: {},
};

export function getPresetDims(
  category: ProductCategory,
  size: string | null | undefined,
): PresetDims | null {
  if (!size) return null;
  return PRESET_DIMS[category]?.[size] ?? null;
}

export const DEFAULT_MARKER_WIDTH_CM = 10;
