"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "./TagInput";
import { spaceSchema } from "@/lib/validators";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    address?: string | null;
    is_public?: boolean;
    tags?: string[];
  };
}

export default function SpaceForm({ mode, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = spaceSchema.safeParse({
      name,
      description: description || null,
      address: address || null,
      is_public: isPublic,
      tags,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    const url =
      mode === "create" ? "/api/spaces" : `/api/spaces/${initial?.id}`;
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
    router.replace(`/spaces/${data.id ?? initial?.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm text-muted">
          Nome do espaço
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Apartamento Vila Mariana"
          required
          maxLength={120}
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
          placeholder="Detalhes do imóvel, ambiente, características..."
          maxLength={2000}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm text-muted">
          Endereço (opcional)
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Tags</label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-auto"
        />
        Tornar visível por link público quando estiver pronto
      </label>

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading
            ? "Salvando..."
            : mode === "create"
              ? "Criar espaço"
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
