"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { formatPrice } from "@/lib/utils";

/**
 * Versao "three" do MindAR. Inclui um helper MindARThree que gerencia
 * camera + canvas + scene three.js. ~385KB. Carregado via CDN para nao
 * inflar o bundle inicial do app.
 */
const MINDAR_THREE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

interface Anchor {
  group: THREE.Group;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

interface MindARThreeInstance {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  start: () => Promise<void>;
  stop: () => void;
  addAnchor: (targetIndex: number) => Anchor;
}

interface MindARThreeCtor {
  new (options: {
    container: HTMLElement;
    imageTargetSrc: string;
    uiLoading?: string;
    uiScanning?: string;
    uiError?: string;
  }): MindARThreeInstance;
}

interface MindARWindow {
  IMAGE?: {
    MindARThree?: MindARThreeCtor;
  };
}

declare global {
  interface Window {
    MINDAR?: MindARWindow;
  }
}

async function loadMindARThree(): Promise<MindARThreeCtor> {
  if (window.MINDAR?.IMAGE?.MindARThree) {
    return window.MINDAR.IMAGE.MindARThree;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-mindar-three="1"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar MindAR (três)")),
      );
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = MINDAR_THREE_MODULE_URL;
    script.dataset.mindarThree = "1";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Falha ao carregar MindAR (três)"));
    document.head.appendChild(script);
  });

  for (let i = 0; i < 60; i++) {
    if (window.MINDAR?.IMAGE?.MindARThree) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  const ctor = window.MINDAR?.IMAGE?.MindARThree;
  if (!ctor) {
    throw new Error("MindAR carregou mas não expôs MindARThree");
  }
  return ctor;
}

/**
 * Normaliza o tamanho do modelo para caber em ~1 unidade (que e o
 * tamanho do marker no espaco MindAR). Centraliza horizontalmente e
 * apoia ligeiramente acima do plano do QR.
 */
function fitModelToMarker(scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = 1 / maxDim;
  scene.scale.setScalar(scale);

  const center = box.getCenter(new THREE.Vector3());
  scene.position.set(
    -center.x * scale,
    -center.y * scale + 0.05,
    -center.z * scale,
  );
}

type Phase = "idle" | "loading" | "scanning" | "tracking" | "error";

export default function ARExperience({
  modelUrl,
  mindFileUrl,
  productName,
  priceCents,
  currency,
}: {
  modelUrl: string;
  mindFileUrl: string;
  productName: string;
  priceCents: number | null;
  currency: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const animRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function startAR() {
    if (!containerRef.current) return;
    setPhase("loading");
    setError(null);

    try {
      setStep("Carregando AR…");
      const MindARThree = await loadMindARThree();

      setStep("Baixando modelo 3D…");
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(modelUrl);
      fitModelToMarker(gltf.scene);

      setStep("Pedindo acesso à câmera…");
      const mindarThree = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: mindFileUrl,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
      });
      mindarRef.current = mindarThree;

      const { renderer, scene, camera } = mindarThree;

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(2, 5, 3);
      scene.add(ambient);
      scene.add(dir);

      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(gltf.scene);
      anchor.onTargetFound = () => setPhase("tracking");
      anchor.onTargetLost = () => setPhase("scanning");

      await mindarThree.start();
      setPhase("scanning");

      renderer.setAnimationLoop(() => renderer.render(scene, camera));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[AR] failed to start", err);
      setError(msg);
      setPhase("error");
      // Limpa parcialmente
      if (mindarRef.current) {
        try {
          mindarRef.current.stop();
        } catch {
          /* noop */
        }
        mindarRef.current = null;
      }
    }
  }

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (mindarRef.current) {
        try {
          mindarRef.current.stop();
        } catch {
          /* noop */
        }
        mindarRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {phase === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background/90">
          <h1 className="text-2xl font-semibold">{productName}</h1>
          {priceCents != null && (
            <p className="text-xl text-primary">
              {formatPrice(priceCents, currency)}
            </p>
          )}
          <button
            type="button"
            onClick={startAR}
            className="btn btn-primary text-base px-6 py-3 mt-2"
          >
            Iniciar realidade aumentada
          </button>
          <p className="text-xs text-muted max-w-xs">
            O navegador vai pedir acesso à câmera. Depois aponte para o QR para
            ver o produto 3D em cima dele.
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-background/90">
          <div className="h-1.5 w-48 bg-zinc-800 rounded overflow-hidden mb-3">
            <div className="h-full bg-primary animate-pulse" style={{ width: "50%" }} />
          </div>
          <p className="text-sm text-muted">{step}</p>
        </div>
      )}

      {phase === "scanning" && (
        <div className="absolute top-0 left-0 right-0 p-4 text-center pointer-events-none">
          <div className="inline-block bg-black/70 backdrop-blur px-4 py-2 rounded-full text-sm">
            Aponte para o QR code
          </div>
        </div>
      )}

      {(phase === "scanning" || phase === "tracking") && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="bg-black/70 backdrop-blur rounded-xl p-3 text-center">
            <p className="font-medium">{productName}</p>
            {priceCents != null && (
              <p className="text-sm text-primary">
                {formatPrice(priceCents, currency)}
              </p>
            )}
            {phase === "tracking" && (
              <p className="text-[10px] text-emerald-400 mt-1">
                Rastreando ✓
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-background/90">
          <p className="text-rose-400 font-medium">
            Não foi possível iniciar a AR
          </p>
          <p className="text-xs text-muted max-w-sm">{error}</p>
          <button
            type="button"
            onClick={startAR}
            className="btn btn-secondary mt-2"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
