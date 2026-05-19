import type { SpaceStatus } from "@/types/database";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const STATUS_LABEL: Record<SpaceStatus, string> = {
  draft: "Rascunho",
  uploading: "Enviando",
  queued: "Na fila",
  processing: "Processando",
  completed: "Pronto",
  failed: "Falhou",
};

export const STATUS_COLOR: Record<SpaceStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  uploading: "bg-blue-500/20 text-blue-300",
  queued: "bg-amber-500/20 text-amber-300",
  processing: "bg-violet-500/20 text-violet-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-rose-500/20 text-rose-300",
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
