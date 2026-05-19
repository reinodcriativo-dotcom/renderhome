"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { uploadAsset, inferAssetType } from "@/lib/storage";
import { isAllowedCaptureFile } from "@/lib/validators";

interface FileProgress {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export default function UploadDropzone({
  spaceId,
  userId,
}: {
  spaceId: string;
  userId: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileProgress[]>([]);
  const [running, setRunning] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    const initial: FileProgress[] = [];

    for (const f of Array.from(files)) {
      if (!isAllowedCaptureFile(f)) {
        initial.push({
          name: f.name,
          progress: 0,
          status: "error",
          error: "Tipo de arquivo não permitido",
        });
        continue;
      }
      accepted.push(f);
      initial.push({ name: f.name, progress: 0, status: "pending" });
    }
    setItems((prev) => [...prev, ...initial]);

    if (accepted.length === 0) return;

    setRunning(true);
    const supabase = createClient();
    const offset = items.length;

    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      const idx = offset + i;
      setItems((prev) =>
        prev.map((it, j) =>
          j === idx ? { ...it, status: "uploading", progress: 5 } : it,
        ),
      );

      try {
        const { path, publicUrl } = await uploadAsset(supabase, {
          userId,
          spaceId,
          file,
        });

        const res = await fetch(`/api/spaces/${spaceId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: inferAssetType(file.type),
            file_url: publicUrl,
            file_path: path,
            mime_type: file.type,
            size_bytes: file.size,
          }),
        });
        if (!res.ok) throw new Error("Falha ao registrar arquivo");

        setItems((prev) =>
          prev.map((it, j) =>
            j === idx ? { ...it, status: "done", progress: 100 } : it,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro no upload";
        setItems((prev) =>
          prev.map((it, j) =>
            j === idx ? { ...it, status: "error", error: message } : it,
          ),
        );
      }
    }

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <p className="text-sm text-muted">
          Capture devagar, passando por todos os cantos do ambiente. Cubra
          paredes, chão, teto e objetos principais. Movimentos lentos = melhor
          resultado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="btn btn-primary"
            disabled={running}
          >
            Gravar vídeo
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInput.current) {
                fileInput.current.accept = "video/*";
                fileInput.current.click();
              }
            }}
            className="btn btn-secondary"
            disabled={running}
          >
            Enviar vídeo
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInput.current) {
                fileInput.current.accept = "image/*";
                fileInput.current.click();
              }
            }}
            className="btn btn-secondary"
            disabled={running}
          >
            Enviar imagens
          </button>
        </div>

        {/* Câmera nativa (mobile) */}
        <input
          ref={cameraInput}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {/* Galeria */}
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-medium">Uploads</h3>
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={`${it.name}-${idx}`} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{it.name}</span>
                  <span className="text-xs text-muted">
                    {it.status === "done"
                      ? "Pronto"
                      : it.status === "error"
                        ? "Erro"
                        : it.status === "uploading"
                          ? `${it.progress}%`
                          : "Aguardando"}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      it.status === "error"
                        ? "bg-rose-500"
                        : it.status === "done"
                          ? "bg-emerald-500"
                          : "bg-primary"
                    }`}
                    style={{
                      width: `${
                        it.status === "done"
                          ? 100
                          : it.status === "error"
                            ? 100
                            : it.progress
                      }%`,
                    }}
                  />
                </div>
                {it.error && (
                  <p className="text-xs text-rose-400 mt-0.5">{it.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
