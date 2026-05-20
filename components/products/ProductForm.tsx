"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { productSchema } from "@/lib/validators";
import { formatPrice, parsePriceToCents } from "@/lib/utils";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    price_cents?: number | null;
    currency?: string;
    is_public?: boolean;
  };
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
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price_cents = parsePriceToCents(priceInput);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price_cents,
      currency: "BRL",
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
        <p className="text-xs text-muted">
          Aceita R$ 399,90 / 399,90 / 399.90. Deixe em branco se não quiser
          mostrar preço.
        </p>
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
