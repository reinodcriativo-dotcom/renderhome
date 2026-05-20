"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@/types/database";

export default function PublishToggle({
  productId,
  status,
  canPublish,
}: {
  productId: string;
  status: ProductStatus;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: ProductStatus) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Falha ao atualizar status");
      return;
    }
    router.refresh();
  }

  if (status === "ready") {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setStatus("draft")}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? "Atualizando..." : "Despublicar"}
        </button>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setStatus("ready")}
        disabled={loading || !canPublish}
        className="btn btn-primary"
        title={!canPublish ? "Faça upload do modelo .glb antes de publicar" : ""}
      >
        {loading ? "Publicando..." : "Publicar"}
      </button>
      {!canPublish && (
        <p className="text-xs text-muted">
          Suba o modelo .glb antes de publicar.
        </p>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
