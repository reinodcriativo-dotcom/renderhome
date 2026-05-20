"use client";

import { useEffect, useRef, useState } from "react";

interface Viewer {
  addSplatScene(
    url: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  start(): void;
  dispose(): Promise<void> | void;
}

type ViewerOptions = {
  rootElement: HTMLElement;
  cameraUp?: [number, number, number];
  initialCameraPosition?: [number, number, number];
  initialCameraLookAt?: [number, number, number];
  sharedMemoryForWorkers?: boolean;
  useBuiltInControls?: boolean;
  enableSIMDInSort?: boolean;
};

interface ViewerCtor {
  new (options: ViewerOptions): Viewer;
}

interface GaussianSplats3DModule {
  Viewer: ViewerCtor;
}

/**
 * Renderiza um arquivo Gaussian Splat (.ply / .splat / .ksplat) usando
 * @mkkellogg/gaussian-splats-3d. A lib monta a sua propria scene Three.js
 * dentro do containerRef — por isso fica fora do <Canvas> do R3F.
 *
 * Importacao dinamica para evitar bundle desnecessario quando nao ha splat.
 */
export default function RealSplatViewer({
  url,
  onError,
}: {
  url: string;
  onError?: (err: unknown) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let viewer: Viewer | null = null;

    async function boot() {
      try {
        const mod = (await import(
          "@mkkellogg/gaussian-splats-3d"
        )) as unknown as GaussianSplats3DModule;
        if (cancelled || !containerRef.current) return;

        viewer = new mod.Viewer({
          rootElement: containerRef.current,
          cameraUp: [0, 1, 0],
          initialCameraPosition: [0, 1, 5],
          initialCameraLookAt: [0, 0, 0],
          useBuiltInControls: true,
          sharedMemoryForWorkers: false,
          enableSIMDInSort: true,
        });

        await viewer.addSplatScene(url, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: false,
          progressiveLoad: true,
        });

        if (cancelled) {
          await viewer.dispose();
          return;
        }

        viewer.start();
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o ambiente 3D";
        setErrorMsg(message);
        setLoading(false);
        onError?.(err);
      }
    }

    boot();

    return () => {
      cancelled = true;
      if (viewer) {
        try {
          void viewer.dispose();
        } catch {
          /* ignore */
        }
      }
    };
  }, [url, onError]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
      />
      {loading && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted bg-zinc-950/60 pointer-events-none">
          Carregando ambiente 3D...
        </div>
      )}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-muted text-center px-6">
          <p>Não foi possível carregar o ambiente 3D.</p>
          <p className="text-xs opacity-70">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
