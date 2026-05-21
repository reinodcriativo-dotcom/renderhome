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
 * Escala o modelo ao tamanho FISICO real (em cm) relativo ao QR impresso.
 *
 * No espaco MindAR, 1 unidade = largura do marker. Se o QR e impresso
 * com X cm de largura e o produto tem Y cm na maior dimensao, o modelo
 * deve ter Y/X unidades MindAR.
 *
 * Se physicalMaxCm for nulo (lojista nao informou medidas), caimos no
 * fallback de 60% da largura do marker.
 *
 * Tambem centraliza o modelo horizontalmente e o apoia ligeiramente
 * acima do plano do QR (Y +0.05).
 */
const MODEL_FALLBACK_FRACTION = 0.6;

function fitModelToMarker(
  THREE: ThreeNS,
  scene: ThreeObject3D,
  opts: { physicalMaxCm: number | null; markerWidthCm: number },
) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);

  const targetUnits =
    opts.physicalMaxCm && opts.markerWidthCm > 0
      ? opts.physicalMaxCm / opts.markerWidthCm
      : MODEL_FALLBACK_FRACTION;

  const scale = targetUnits / maxDim;
  scene.scale.setScalar(scale);

  const center = box.getCenter(new THREE.Vector3());
  scene.position.set(
    -center.x * scale,
    -center.y * scale + 0.05,
    -center.z * scale,
  );
}

type Phase = "idle" | "loading" | "scanning" | "tracking" | "error";
type ARMode = "marker" | "screen" | "world";

export default function ARExperience({
  modelUrl,
  mindFileUrl,
  productName,
  priceCents,
  currency,
  sizeLabel,
  physicalMaxCm,
  markerWidthCm,
  categoryLabel,
}: {
  modelUrl: string;
  mindFileUrl: string;
  productName: string;
  priceCents: number | null;
  currency: string;
  sizeLabel: string | null;
  physicalMaxCm: number | null;
  markerWidthCm: number;
  categoryLabel?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const animRef = useRef<number | null>(null);
  // Refs para conseguir mudar o pai do modelo entre anchor / camera / scene
  // depois do startAR (e fora do escopo do try/catch).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threeRef = useRef<ThreeNS | null>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const cameraRef = useRef<ThreeCamera | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const modelHolderRef = useRef<ThreeGroup | null>(null);
  // innerHolder fica DENTRO de modelHolder e segura a rotacao/escala
  // controladas pelo usuario (drag + pinch). Sobrevive a trocas de modo.
  const innerHolderRef = useRef<ThreeGroup | null>(null);
  // Modo lido pelo render loop a cada frame para atualizar a pose do
  // holder em screen mode (sem precisar reparentear na camera).
  const modeRef = useRef<ARMode>("marker");
  // Distancia camera->modelo no screen mode, calculada uma vez para o
  // modelo caber confortavelmente na tela.
  const screenDistanceRef = useRef<number>(1.5);

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ARMode>("marker");
  // Flag de oferecer botoes: aparece depois que o QR foi rastreado
  // pelo menos UMA vez na sessao (entao o usuario pode "fixar" ou "colocar
  // aqui" sem precisar continuar segurando o QR).
  const [hasTrackedOnce, setHasTrackedOnce] = useState(false);

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
      fitModelToMarker(THREE, gltf.scene, {
        physicalMaxCm,
        markerWidthCm,
      });

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

      // Estrutura em duas camadas:
      //   modelHolder (transformacao de modo: anchor/scene/etc)
      //     innerHolder (transformacao do usuario: rotacao Y + escala)
      //       gltf.scene (modelo, ja com fitModelToMarker aplicado)
      //
      // Separar essas camadas garante que mudar de modo nao perde a
      // rotacao/zoom que o usuario aplicou.
      const modelHolder = new THREE.Group();
      const innerHolder = new THREE.Group();
      modelHolder.add(innerHolder);
      innerHolder.add(gltf.scene);

      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(modelHolder);
      anchor.onTargetFound = () => {
        setPhase("tracking");
        setHasTrackedOnce(true);
      };
      anchor.onTargetLost = () => setPhase("scanning");

      threeRef.current = THREE;
      sceneRef.current = scene;
      cameraRef.current = camera;
      anchorRef.current = anchor;
      modelHolderRef.current = modelHolder;
      innerHolderRef.current = innerHolder;

      // ----- Multi-touch: 1 dedo = rotacao Y, 2 dedos = pinch zoom -----
      const container = containerRef.current;
      const pointers = new Map<number, { x: number; y: number }>();
      let pinch: { distance: number; scale: number } | null = null;
      let dragX: number | null = null;

      function pinchDistance(): number {
        const pts = Array.from(pointers.values());
        if (pts.length < 2) return 0;
        const a = pts[0];
        const b = pts[1];
        return Math.hypot(a.x - b.x, a.y - b.y);
      }

      const onDown = (e: PointerEvent) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try {
          container.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        if (pointers.size === 2) {
          pinch = {
            distance: pinchDistance(),
            scale: innerHolder.scale.x,
          };
          dragX = null;
        } else if (pointers.size === 1) {
          dragX = e.clientX;
        }
      };

      const onMove = (e: PointerEvent) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2 && pinch) {
          const d = pinchDistance();
          if (d > 0) {
            const next = pinch.scale * (d / pinch.distance);
            // Limites: 0.1x ate 20x do tamanho real para nao "perder" o
            // modelo (escala minima muito pequena somindo, ou enorme).
            const clamped = Math.max(0.1, Math.min(20, next));
            innerHolder.scale.setScalar(clamped);
          }
        } else if (pointers.size === 1 && dragX !== null) {
          const dx = e.clientX - dragX;
          innerHolder.rotation.y += dx * 0.01;
          dragX = e.clientX;
        }
      };

      const onUp = (e: PointerEvent) => {
        pointers.delete(e.pointerId);
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        if (pointers.size < 2) pinch = null;
        if (pointers.size === 0) dragX = null;
        if (pointers.size === 1) {
          const p = Array.from(pointers.values())[0];
          dragX = p?.x ?? null;
        }
      };
      container.style.touchAction = "none";
      container.addEventListener("pointerdown", onDown);
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerup", onUp);
      container.addEventListener("pointercancel", onUp);

      await mindarThree.start();
      setPhase("scanning");

      // No screen mode, atualizamos a pose do holder a cada frame
      // para seguir a camera, em vez de reparentea-lo (mais robusto).
      const forwardVec = new THREE.Vector3();
      renderer.setAnimationLoop(() => {
        if (modeRef.current === "screen" && modelHolderRef.current) {
          forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
          modelHolderRef.current.position
            .copy(camera.position)
            .addScaledVector(forwardVec, screenDistanceRef.current);
          modelHolderRef.current.quaternion.copy(camera.quaternion);
        }
        renderer.render(scene, camera);
      });
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

  /**
   * Modos AR:
   *  - marker: modelo fica dentro do anchor (segue QR fisico em tempo real)
   *  - screen: modelo fica preso a camera (acompanha onde voce aponta)
   *  - world : modelo congela onde estava o QR (snapshot da matrix mundial),
   *           voce anda em volta e ele permanece la
   */
  /**
   * Estados externos dos botoes (UX):
   * - "Seguir QR"     -> switchMode("marker")
   * - "Fixar na tela" -> switchMode("world-from-anchor") congela onde
   *                      o QR esta sendo rastreado nesse instante.
   * - "Colocar aqui"  -> alterna grab/drop:
   *      not grabbing -> switchMode("screen"): modelo cola na camera
   *                      e voce move o celular para posicionar.
   *      grabbing     -> switchMode("drop"): solta o modelo no mundo
   *                      naquela pose (vira mode 'world' interno).
   */
  function switchMode(
    next: "marker" | "world-from-anchor" | "screen" | "drop",
  ) {
    const THREE = threeRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const anchor = anchorRef.current;
    const holder = modelHolderRef.current;
    if (!THREE || !scene || !camera || !anchor || !holder) return;

    holder.matrixAutoUpdate = true;
    holder.visible = true;

    // Tamanho local do modelo em unidades MindAR: o gltf.scene dentro do
    // holder ja foi escalado por fitModelToMarker (physicalMaxCm /
    // markerWidthCm, ou fallback 0.6).
    const maxDimUnits =
      physicalMaxCm && markerWidthCm > 0
        ? physicalMaxCm / markerWidthCm
        : MODEL_FALLBACK_FRACTION;

    if (next === "marker") {
      if (holder.parent) holder.parent.remove(holder);
      holder.position.set(0, 0, 0);
      holder.quaternion.identity();
      holder.scale.setScalar(1);
      anchor.group.add(holder);
      modeRef.current = "marker";
      setMode("marker");
    } else if (next === "screen") {
      if (holder.parent) holder.parent.remove(holder);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fovDeg = (camera as any).fov ?? 50;
      const fovRad = (fovDeg * Math.PI) / 180;
      const distance =
        maxDimUnits / (2 * Math.tan(fovRad / 2) * 0.7);
      screenDistanceRef.current = Math.max(distance, 0.3);
      holder.position.copy(camera.position);
      holder.quaternion.copy(camera.quaternion);
      holder.scale.setScalar(1);
      scene.add(holder);
      modeRef.current = "screen";
      setMode("screen");
    } else if (next === "world-from-anchor") {
      if (holder.parent) holder.parent.remove(holder);
      // Snapshot da pose mundial do anchor no momento atual (decompondo
      // em pos/quat/scale, mais robusto que copiar matrix raw).
      anchor.group.updateMatrixWorld(true);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      anchor.group.matrixWorld.decompose(pos, quat, scl);
      holder.position.copy(pos);
      holder.quaternion.copy(quat);
      holder.scale.copy(scl);
      scene.add(holder);
      modeRef.current = "world";
      setMode("world");
    } else if (next === "drop") {
      // O holder ja esta no scene (screen mode) na pose seguindo a camera.
      // Soltar = parar de atualizar no render loop. Pose final = onde o
      // holder esta agora. Garantimos que esta no scene caso algo tenha
      // mudado.
      if (holder.parent !== scene) {
        if (holder.parent) holder.parent.remove(holder);
        scene.add(holder);
      }
      modeRef.current = "world";
      setMode("world");
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

  const cameraActive = phase === "scanning" || phase === "tracking";
  const showModeControls = cameraActive && hasTrackedOnce;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Container que recebe o video + canvas do MindAR. object-fit cover
          faz o feed da camera preencher a tela inteira sem barras pretas. */}
      <div
        ref={containerRef}
        className="ar-container absolute inset-0 [&>video]:!w-full [&>video]:!h-full [&>video]:object-cover [&>canvas]:!w-full [&>canvas]:!h-full"
      />

      {/* Gradiente sutil no topo e no rodape para legibilidade da UI */}
      {cameraActive && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
        </>
      )}

      {/* ============================== HEADER ============================== */}
      {cameraActive && (
        <header className="absolute inset-x-0 top-0 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 flex items-center justify-between gap-3 z-10">
          <button
            type="button"
            onClick={() => {
              try {
                if (mindarRef.current) mindarRef.current.stop();
              } catch {
                /* noop */
              }
              window.location.href = "/";
            }}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-zinc-900 active:scale-95 transition-transform shadow-lg"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="h-10 px-3 inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg text-zinc-900">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
            </svg>
            <span className="text-xs font-semibold tracking-wide">
              Render<span className="text-primary">AR</span>
            </span>
          </div>
        </header>
      )}

      {/* ============================== IDLE ============================== */}
      {phase === "idle" && (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-zinc-950 via-background to-zinc-950">
          <div className="px-6 pt-[max(env(safe-area-inset-top),24px)]">
            <div className="text-xs text-muted tracking-widest uppercase">
              Render<span className="text-primary">AR</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-12 h-12 text-primary"
              >
                <path
                  d="M3 7V5a2 2 0 0 1 2-2h2M3 17v2a2 2 0 0 0 2 2h2M17 3h2a2 2 0 0 1 2 2v2M17 21h2a2 2 0 0 0 2-2v-2M9 9h6v6H9z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-xs uppercase tracking-widest text-muted mb-2">
              Produto em AR
            </p>
            <h1 className="text-3xl font-semibold mb-2">{productName}</h1>
            {priceCents != null && (
              <p className="text-2xl text-primary font-medium mb-6">
                {formatPrice(priceCents, currency)}
              </p>
            )}

            <p className="text-sm text-muted max-w-xs leading-relaxed mb-8">
              Aponte a câmera para o QR físico e veja o produto em 3D, em
              tamanho real, sobre a superfície.
            </p>

            <button
              type="button"
              onClick={startAR}
              className="btn btn-primary text-base px-8 py-3.5 shadow-lg shadow-primary/30"
            >
              Iniciar realidade aumentada
            </button>
          </div>

          <p className="text-[11px] text-muted/70 text-center pb-[max(env(safe-area-inset-bottom),20px)] px-6">
            O navegador vai pedir acesso à câmera ao continuar.
          </p>
        </div>
      )}

      {/* ============================== LOADING ============================== */}
      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-background/95 backdrop-blur">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-foreground/80">{step}</p>
          <p className="text-xs text-muted mt-2 max-w-xs">
            Primeiro carregamento pode levar 10–30 segundos.
          </p>
        </div>
      )}

      {/* ============================== SCANNING ============================== */}
      {phase === "scanning" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
          {/* Marco visual no centro indicando onde apontar */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/80 rounded-tl-md animate-pulse" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/80 rounded-tr-md animate-pulse" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/80 rounded-bl-md animate-pulse" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/80 rounded-br-md animate-pulse" />
          </div>
        </div>
      )}

      {phase === "scanning" && (
        <div className="absolute inset-x-0 top-20 px-4 text-center pointer-events-none z-10">
          <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-sm text-white/95 shadow-lg">
            Aponte para o QR code
          </div>
        </div>
      )}

      {/* ===================== MODE CONTROLS (acima do card) ===================== */}
      {showModeControls && (
        <div className="absolute inset-x-0 bottom-[180px] sm:bottom-[170px] px-4 flex justify-center z-10">
          <div className="inline-flex bg-black/60 backdrop-blur-md rounded-full border border-white/10 p-1 shadow-2xl">
            <button
              type="button"
              onClick={() => switchMode("marker")}
              className={
                "px-3 py-2 rounded-full text-xs font-medium transition-colors " +
                (mode === "marker"
                  ? "bg-primary text-white"
                  : "text-white/80 hover:text-white")
              }
            >
              Seguir QR
            </button>
            <button
              type="button"
              onClick={() => switchMode("world-from-anchor")}
              disabled={phase !== "tracking"}
              title={
                phase !== "tracking"
                  ? "Aponte para o QR primeiro"
                  : "Congela o produto onde o QR está. Use 2 dedos para ajustar o tamanho."
              }
              className={
                "px-3 py-2 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                (mode === "world"
                  ? "bg-primary text-white"
                  : "text-white/80 hover:text-white")
              }
            >
              Fixar na tela
            </button>
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "screen" ? "drop" : "screen")
              }
              title={
                mode === "screen"
                  ? "Solta o produto na posição atual"
                  : "Pega o produto: ele vai seguir a câmera. Posicione e clique de novo para soltar."
              }
              className={
                "px-3 py-2 rounded-full text-xs font-medium transition-colors " +
                (mode === "screen"
                  ? "bg-amber-500 text-black"
                  : "text-white/80 hover:text-white")
              }
            >
              {mode === "screen" ? "Soltar" : "Colocar aqui"}
            </button>
          </div>
        </div>
      )}

      {/* ============================== BOTTOM CARD ============================== */}
      {cameraActive && (
        <div className="absolute inset-x-0 bottom-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] z-10">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Top row: nome + preço, status pill, thumbnail */}
            <div className="p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {mode === "marker" ? (
                    phase === "tracking" ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Rastreando
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Procurando
                      </span>
                    )
                  ) : mode === "screen" ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Segurando
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      Posicionado
                    </span>
                  )}
                </div>

                <h2 className="text-[15px] sm:text-base font-semibold text-zinc-900 leading-tight line-clamp-2">
                  {productName}
                </h2>

                {priceCents != null && (
                  <p className="text-xl font-bold text-zinc-900 tabular-nums pt-1">
                    {formatPrice(priceCents, currency)}
                  </p>
                )}
              </div>

              {/* Thumbnail: ícone com a categoria */}
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-8 h-8"
                  aria-hidden="true"
                >
                  <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
                  <path d="M3.5 7.5 12 12l8.5-4.5" />
                  <path d="M12 12v9" />
                </svg>
              </div>
            </div>

            {/* Hint: muda conforme o modo */}
            <p className="px-4 pb-2 text-[11px] text-zinc-500 leading-snug">
              {mode === "screen"
                ? "Mire onde quiser colocar e toque em Soltar"
                : "Arraste com 1 dedo para girar · pinçada de 2 dedos para zoom"}
            </p>

            {/* Footer stats — 3 colunas separadas por linha vertical */}
            <div className="grid grid-cols-3 border-t border-zinc-100 bg-zinc-50/50">
              <Stat
                label="Categoria"
                value={categoryLabel ?? "—"}
              />
              <Stat
                label="Tamanho"
                value={sizeLabel ?? "—"}
                divider
              />
              <Stat
                label="Tamanho real"
                value={physicalMaxCm != null ? `${physicalMaxCm} cm` : "—"}
                divider
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================== ERROR ============================== */}
      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-background/95 backdrop-blur">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-7 h-7 text-rose-400"
            >
              <path
                d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-base text-foreground font-medium mb-1">
            Não foi possível iniciar a AR
          </p>
          <p className="text-xs text-muted max-w-sm mb-5 break-all">{error}</p>
          <button
            type="button"
            onClick={startAR}
            className="btn btn-secondary"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className={
        "px-3 py-3 flex flex-col items-center justify-center text-center " +
        (divider ? "border-l border-zinc-200" : "")
      }
    >
      <p className="text-sm font-semibold text-zinc-900 tabular-nums truncate max-w-full">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
        {label}
      </p>
    </div>
  );
}
