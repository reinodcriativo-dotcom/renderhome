"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCategory } from "@/types/database";
import { productSchema } from "@/lib/validators";
import { formatPrice, parsePriceToCents } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SIZE_OPTIONS,
  DEFAULT_MARKER_WIDTH_CM,
  getPresetDims,
} from "@/lib/presets";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    price_cents?: number | null;
    currency?: string;
    category?: ProductCategory;
    size_label?: string | null;
    dim_length_cm?: number | null;
    dim_width_cm?: number | null;
    dim_height_cm?: number | null;
    marker_width_cm?: number;
    is_public?: boolean;
  };
}

function dimToString(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function parseDim(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProductForm({ mode, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceInput, setPriceInput] = useState(
    initial?.price_cents != null
      ? formatPrice(initial.price_cents, initial.currency ?? "BRL")
      : "",
  );
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? "custom",
  );
  const [sizeLabel, setSizeLabel] = useState(initial?.size_label ?? "");
  const [dimL, setDimL] = useState(dimToString(initial?.dim_length_cm));
  const [dimW, setDimW] = useState(dimToString(initial?.dim_width_cm));
  const [dimH, setDimH] = useState(dimToString(initial?.dim_height_cm));
  const [markerCm, setMarkerCm] = useState(
    String(initial?.marker_width_cm ?? DEFAULT_MARKER_WIDTH_CM),
  );
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyPresetFor(newCategory: ProductCategory, newSize: string) {
    const preset = getPresetDims(newCategory, newSize);
    if (preset) {
      setDimL(String(preset.length_cm));
      setDimW(String(preset.width_cm));
      setDimH(String(preset.height_cm));
    }
  }

  function handleCategoryChange(next: ProductCategory) {
    setCategory(next);
    // Limpa tamanho se a nova categoria nao tiver o tamanho atual.
    if (!SIZE_OPTIONS[next].includes(sizeLabel)) {
      setSizeLabel("");
      // Para categorias com presets, nao limpa dims (lojista pode ter
      // ajustado manualmente). Mas se for 'custom', mantemos os campos.
    }
  }

  function handleSizeChange(next: string) {
    setSizeLabel(next);
    if (next) applyPresetFor(category, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price_cents = parsePriceToCents(priceInput);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price_cents,
      currency: "BRL",
      category,
      size_label: sizeLabel.trim() || null,
      dim_length_cm: parseDim(dimL),
      dim_width_cm: parseDim(dimW),
      dim_height_cm: parseDim(dimH),
      marker_width_cm:
        parseDim(markerCm) ?? DEFAULT_MARKER_WIDTH_CM,
      is_public: isPublic,
    };
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    const url =
      mode === "create" ? "/api/products" : `/api/products/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erro ao salvar");
      return;
    }

    const data = await res.json();
    router.replace(`/products/${data.id ?? initial?.id}`);
    router.refresh();
  }

  const sizes = SIZE_OPTIONS[category];
  const showSizeSelect = sizes.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm text-muted">
          Nome do produto
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Tênis Nike Air Max 90"
          required
          maxLength={120}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm text-muted">
            Categoria
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as ProductCategory)
            }
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {showSizeSelect ? (
          <div className="space-y-1.5">
            <label htmlFor="size" className="text-sm text-muted">
              Tamanho
            </label>
            <select
              id="size"
              value={sizeLabel}
              onChange={(e) => handleSizeChange(e.target.value)}
            >
              <option value="">— escolha —</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="size-free" className="text-sm text-muted">
              Tamanho (opcional)
            </label>
            <input
              id="size-free"
              type="text"
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              placeholder="Ex.: 42mm, unique"
              maxLength={40}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">
          Medidas físicas reais (cm)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={dimL}
            onChange={(e) => setDimL(e.target.value)}
            placeholder="Comprimento"
            aria-label="Comprimento em cm"
          />
          <input
            type="text"
            inputMode="decimal"
            value={dimW}
            onChange={(e) => setDimW(e.target.value)}
            placeholder="Largura"
            aria-label="Largura em cm"
          />
          <input
            type="text"
            inputMode="decimal"
            value={dimH}
            onChange={(e) => setDimH(e.target.value)}
            placeholder="Altura"
            aria-label="Altura em cm"
          />
        </div>
        <p className="text-xs text-muted">
          Use o tamanho real do produto. Escolha categoria + tamanho acima para
          auto-preencher; ajuste se precisar. Se deixar vazio, o modelo será
          escalado para ~60% da largura do QR.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="marker" className="text-sm text-muted">
          Largura do QR impresso (cm)
        </label>
        <input
          id="marker"
          type="text"
          inputMode="decimal"
          value={markerCm}
          onChange={(e) => setMarkerCm(e.target.value)}
          placeholder="10"
        />
        <p className="text-xs text-muted">
          Tamanho que você vai imprimir o QR. Default 10 cm. Influencia
          quanto o modelo aparece em tamanho real.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="price" className="text-sm text-muted">
          Preço
        </label>
        <input
          id="price"
          type="text"
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="R$ 0,00"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm text-muted">
          Descrição
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes do produto, material, dimensões..."
          maxLength={2000}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-auto"
        />
        Tornar acessível pelo QR público (quando publicado)
      </label>

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading
            ? "Salvando..."
            : mode === "create"
              ? "Criar produto"
              : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
