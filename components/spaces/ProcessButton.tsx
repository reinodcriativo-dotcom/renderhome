"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProcessButton({
  spaceId,
  disabled,
  label = "Iniciar processamento",
}: {
  spaceId: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/spaces/${spaceId}/process`, {
      method: "POST",
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Falha ao iniciar processamento");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={start}
        disabled={disabled || loading}
        className="btn btn-primary"
      >
        {loading ? "Iniciando..." : label}
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
