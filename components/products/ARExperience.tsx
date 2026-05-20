"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";

/**
 * Tres.js e o GLTFLoader sao carregados dinamicamente do MESMO CDN que o
 * MindAR (via import map declarado no layout). Isso garante que o MindAR
 * e nosso codigo compartilhem a mesma instancia do three — caso contrario
 * anchor.group (Group da copia do MindAR) e gltf.scene (Object3D da nossa
 * copia) seriam classes diferentes incompativeis.
 *
 * webpackIgnore impede o webpack de tentar bundlar/resolver os specifiers.
 * O import passa pro browser nativo, que segue o import map.
 *
 * Three 0.161 e a ultima versao que ainda exporta sRGBEncoding, que o
 * mindar-image-three.prod.js (compilado contra three antigo) referencia.
 */
type ThreeNS = typeof import("three");
// drei nao expoe GLTFLoader em "three" diretamente; loader vem de addons.
type GLTFResult = { scene: ThreeObject3D };
interface GLTFLoaderInstance {
  loadAsync(url: string): Promise<GLTFResult>;
}
interface GLTFLoaderCtor {
  new (): GLTFLoaderInstance;
}
type ThreeObject3D = InstanceType<ThreeNS["Object3D"]>;
type ThreeGroup = InstanceType<ThreeNS["Group"]>;
type ThreeScene = InstanceType<ThreeNS["Scene"]>;
type ThreeCamera = InstanceType<ThreeNS["Camera"]>;
type ThreeRenderer = InstanceType<ThreeNS["WebGLRenderer"]>;

const MINDAR_THREE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

interface Anchor {
  group: ThreeGroup;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

interface MindARThreeInstance {
  renderer: ThreeRenderer;
  scene: ThreeScene;
  camera: ThreeCamera;
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
    // Suavizacao do tracking — valores menores = mais suave porem com lag.
    filterMinCF?: number;
    filterBeta?: number;
    // Tolerancias de frames antes de disparar onTargetFound/Lost.
    warmupTolerance?: number;
    missTolerance?: number;
    maxTrack?: number;
  }): MindARThreeInstance;
}

async function loadMindARThree(): Promise<MindARThreeCtor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.MINDAR?.IMAGE?.MindARThree) return w.MINDAR.IMAGE.MindARThree;

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
    if (w.MINDAR?.IMAGE?.MindARThree) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  const ctor = w.MINDAR?.IMAGE?.MindARThree as MindARThreeCtor | undefined;
  if (!ctor) {
    throw new Error("MindAR carregou mas não expôs MindARThree");
  }
  return ctor;
}

async function loadThree(): Promise<ThreeNS> {
  return (await import(/* webpackIgnore: true */ "three")) as ThreeNS;
}

async function loadGLTFLoader(): Promise<GLTFLoaderCtor> {
  const mod = (await import(
    /* webpackIgnore: true */ "three/addons/loaders/GLTFLoader.js"
  )) as { GLTFLoader: GLTFLoaderCtor };
  return mod.GLTFLoader;
}

/**
 * Normaliza o tamanho do modelo para ~60% da largura do marker (1 unidade
 * = largura do QR no espaco MindAR). Centraliza e apoia ligeiramente
 * acima do plano do QR para nao ficar embutido.
 */
const MODEL_FIT_FRACTION = 0.6;

function fitModelToMarker(THREE: ThreeNS, scene: ThreeObject3D) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = MODEL_FIT_FRACTION / maxDim;
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
      const [MindARThree, THREE, GLTFLoader] = await Promise.all([
        loadMindARThree(),
        loadThree(),
        loadGLTFLoader(),
      ]);

      setStep("Baixando modelo 3D…");
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(modelUrl);
      fitModelToMarker(THREE, gltf.scene);

      setStep("Pedindo acesso à câmera…");
      const mindarThree = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: mindFileUrl,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
        // Filtros de pose 1 euro: mais suaves que o default. Reduzem
        // tremor sem comprometer responsividade demais (lag perceptivel
        // ~50ms). Sao os valores tipicos recomendados para QR.
        filterMinCF: 0.0001,
        filterBeta: 100,
        warmupTolerance: 5,
        missTolerance: 8,
        maxTrack: 1,
      });
      mindarRef.current = mindarThree;

      const { renderer, scene, camera } = mindarThree;

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(2, 5, 3);
      scene.add(ambient);
      scene.add(dir);

      // O modelo vai dentro de um Group "holder" para que possamos
      // aplicar rotacao por dedo SEM mexer na rotacao do anchor (que
      // segue o marker fisico). Resultado: anchor segue o QR no espaco,
      // holder gira em Y conforme o usuario arrasta o dedo.
      const modelHolder = new THREE.Group();
      modelHolder.add(gltf.scene);
      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(modelHolder);
      anchor.onTargetFound = () => setPhase("tracking");
      anchor.onTargetLost = () => setPhase("scanning");

      // Touch / pointer drag horizontal -> rotacao Y do modelo.
      const container = containerRef.current;
      let dragX: number | null = null;
      const onDown = (e: PointerEvent) => {
        dragX = e.clientX;
        container.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (dragX === null) return;
        const dx = e.clientX - dragX;
        modelHolder.rotation.y += dx * 0.01;
        dragX = e.clientX;
      };
      const onUp = (e: PointerEvent) => {
        dragX = null;
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      };
      container.style.touchAction = "none";
      container.addEventListener("pointerdown", onDown);
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerup", onUp);
      container.addEventListener("pointercancel", onUp);

      await mindarThree.start();
      setPhase("scanning");

      renderer.setAnimationLoop(() => renderer.render(scene, camera));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[AR] failed to start", err);
      setError(msg);
      setPhase("error");
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
            O navegador vai pedir acesso à câmera. Depois aponte para o QR
            para ver o produto 3D em cima dele.
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-background/90">
          <div className="h-1.5 w-48 bg-zinc-800 rounded overflow-hidden mb-3">
            <div
              className="h-full bg-primary animate-pulse"
              style={{ width: "50%" }}
            />
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
