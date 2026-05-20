"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { uploadModel } from "@/lib/storage";
import { isAllowedModelFile } from "@/lib/validators";
import { formatBytes } from "@/lib/utils";

export default function GlbUploader({
  productId,
  userId,
  currentModelUrl,
}: {
  productId: string;
  userId: string;
  currentModelUrl?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!isAllowedModelFile(file)) {
      setError("Apenas arquivos .glb ou .gltf são aceitos.");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setBusy(true);
    setProgress(5);

    try {
      const supabase = createClient();
      setProgress(15);
      const { path, publicUrl } = await uploadModel(supabase, {
        userId,
        productId,
        file,
      });
      setProgress(75);

      const res = await fetch(`/api/products/${productId}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_url: publicUrl,
          model_path: path,
          model_size_bytes: file.size,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao registrar modelo");
      }
      setProgress(100);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro no upload";
      setError(message);
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {currentModelUrl && (
        <div className="text-sm text-muted">
          Modelo atual: <code className="text-xs">{currentModelUrl.split("/").pop()}</code>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn btn-primary"
      >
        {busy
          ? "Enviando..."
          : currentModelUrl
            ? "Substituir modelo"
            : "Escolher modelo .glb"}
      </button>

      {fileName && (
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{fileName}</span>
            <span className="text-xs text-muted">{formatBytes(fileSize)}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${
                error ? "bg-rose-500" : progress === 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        Formatos aceitos: .glb (recomendado) ou .gltf. Tamanho máximo do plano
        free do Supabase: ~50 MB.
      </p>
    </div>
  );
}
