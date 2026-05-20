"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { env } from "@/lib/env";
import { generateQrPng, buildQrTargetUrl } from "@/lib/qr";

/**
 * Carrega o compilador MindAR via CDN para nao inflar o bundle do dashboard
 * (a lib traz TensorFlow.js junto, ~2MB). Cache: o navegador reusa entre
 * publicacoes.
 */
const MINDAR_CDN =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-compiler.prod.js";

interface MindARGlobal {
  IMAGE: {
    Compiler: new () => {
      compileImageTargets(
        images: HTMLImageElement[],
        onProgress: (p: number) => void,
      ): Promise<unknown>;
      exportData(): Promise<ArrayBuffer | Uint8Array>;
    };
  };
}

declare global {
  interface Window {
    MINDAR?: MindARGlobal;
  }
}

async function loadMindAR(): Promise<MindARGlobal> {
  if (typeof window !== "undefined" && window.MINDAR) return window.MINDAR;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MINDAR_CDN}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar MindAR")));
      return;
    }
    const script = document.createElement("script");
    script.src = MINDAR_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar MindAR"));
    document.head.appendChild(script);
  });
  if (!window.MINDAR) throw new Error("MindAR nao expos a global esperada");
  return window.MINDAR;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem do QR"));
    img.src = url;
  });
}

export default function QRGenerator({
  productId,
  userId,
  publicSlug,
  status,
  hasModel,
  markerUrl,
  mindFileUrl,
  productName,
}: {
  productId: string;
  userId: string;
  publicSlug: string;
  status: "draft" | "ready" | "archived";
  hasModel: boolean;
  markerUrl: string | null;
  mindFileUrl: string | null;
  productName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const arUrl = buildQrTargetUrl(env.APP_URL, publicSlug);
  const alreadyGenerated = !!markerUrl && !!mindFileUrl;
  const isReady = status === "ready" && alreadyGenerated;

  async function generate() {
    if (!hasModel) {
      setError("Faça upload do modelo .glb antes de gerar o QR.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      setStep("Gerando QR…");
      setProgress(10);
      const qrBlob = await generateQrPng(arUrl);

      setStep("Carregando compilador MindAR…");
      setProgress(25);
      const mindar = await loadMindAR();

      setStep("Compilando target de rastreamento (10–30s)…");
      setProgress(40);
      const img = await blobToImage(qrBlob);
      const compiler = new mindar.IMAGE.Compiler();
      await compiler.compileImageTargets(
        [img],
        (p) => setProgress(40 + Math.round(p * 0.4)),
      );
      const exported = await compiler.exportData();
      const mindBlob = new Blob([exported as ArrayBuffer], {
        type: "application/octet-stream",
      });

      setStep("Enviando arquivos…");
      setProgress(82);
      const supabase = createClient();
      const ts = Date.now();
      const markerPath = `${userId}/${productId}/qr-${ts}.png`;
      const mindPath = `${userId}/${productId}/marker-${ts}.mind`;

      const qrFile = new File([qrBlob], `qr-${ts}.png`, { type: "image/png" });
      const mindFile = new File([mindBlob], `marker-${ts}.mind`, {
        type: "application/octet-stream",
      });

      const upQr = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .upload(markerPath, qrFile, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: false,
        });
      if (upQr.error) throw upQr.error;

      const upMind = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .upload(mindPath, mindFile, {
          cacheControl: "3600",
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (upMind.error) throw upMind.error;

      const markerPublicUrl = supabase.storage
        .from(env.SUPABASE_BUCKET)
        .getPublicUrl(markerPath).data.publicUrl;
      const mindPublicUrl = supabase.storage
        .from(env.SUPABASE_BUCKET)
        .getPublicUrl(mindPath).data.publicUrl;

      setStep("Publicando produto…");
      setProgress(95);
      const res = await fetch(`/api/products/${productId}/marker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker_url: markerPublicUrl,
          marker_path: markerPath,
          mind_file_url: mindPublicUrl,
          mind_file_path: mindPath,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao salvar metadados do marker");
      }

      setProgress(100);
      setStep("Pronto!");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[QR] generate failed", err);
      setError(message);
      setProgress(0);
      setStep("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {isReady && markerUrl ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-white p-2 inline-block">
            <img
              src={markerUrl}
              alt={`QR de ${productName}`}
              className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={markerUrl}
              download={`renderar-${publicSlug}.png`}
              className="btn btn-primary text-sm"
            >
              Baixar QR (PNG)
            </a>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="btn btn-secondary text-sm"
            >
              {busy ? "Regerando…" : "Regerar"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Imprima e cole na prateleira ou produto físico. Clientes apontam a
            câmera nesse QR para ver o modelo 3D em AR.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={generate}
            disabled={busy || !hasModel}
            className="btn btn-primary"
            title={!hasModel ? "Faça upload do modelo .glb antes" : ""}
          >
            {busy ? "Gerando…" : "Gerar QR e publicar"}
          </button>
          {!hasModel && (
            <p className="text-xs text-muted">
              Suba o modelo .glb antes de gerar o QR.
            </p>
          )}
        </div>
      )}

      {busy && (
        <div className="space-y-1">
          <p className="text-xs text-muted">{step}</p>
          <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
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
    </div>
  );
}
