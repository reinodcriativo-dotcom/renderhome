import type { ProductStatus } from "@/types/database";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Rascunho",
  ready: "Publicado",
  archived: "Arquivado",
};

export const STATUS_COLOR: Record<ProductStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  ready: "bg-emerald-500/20 text-emerald-300",
  archived: "bg-amber-500/20 text-amber-300",
};

export function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Formata um valor em centavos como moeda BRL.
 *   formatPrice(39990) -> "R$ 399,90"
 */
export function formatPrice(
  cents: number | null | undefined,
  currency = "BRL",
): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)}`;
  }
}

/**
 * Recebe input do usuario tipo "R$ 399,90" ou "399.90" ou "399,90"
 * e devolve o valor em centavos (int). Devolve null se vazio/invalido.
 */
export function parsePriceToCents(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
