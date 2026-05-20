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
}: {
  modelUrl: string;
  mindFileUrl: string;
  productName: string;
  priceCents: number | null;
  currency: string;
  sizeLabel: string | null;
  physicalMaxCm: number | null;
  markerWidthCm: number;
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

      // O modelo vai dentro de um Group "holder" — nos podemos re-parentear
      // esse holder entre anchor.group (marker mode), camera (screen mode) ou
      // scene (world mode) para suportar os 3 modos AR.
      const modelHolder = new THREE.Group();
      modelHolder.add(gltf.scene);
      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(modelHolder);
      anchor.onTargetFound = () => {
        setPhase("tracking");
        setHasTrackedOnce(true);
      };
      anchor.onTargetLost = () => setPhase("scanning");

      // Salva nas refs para os botoes de modo (marker/screen/world) lerem.
      threeRef.current = THREE;
      sceneRef.current = scene;
      cameraRef.current = camera;
      anchorRef.current = anchor;
      modelHolderRef.current = modelHolder;

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
  function switchMode(next: ARMode) {
    const THREE = threeRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const anchor = anchorRef.current;
    const holder = modelHolderRef.current;
    if (!THREE || !scene || !camera || !anchor || !holder) return;

    // Remove de qualquer pai antes de re-parentear.
    if (holder.parent) holder.parent.remove(holder);
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
      // Reset: anchor.group ira ditar a matriz do holder a cada frame.
      holder.position.set(0, 0, 0);
      holder.quaternion.identity();
      holder.scale.setScalar(1);
      anchor.group.add(holder);
    } else if (next === "screen") {
      // Distancia confortavel para o modelo ocupar ~70% da menor dimensao
      // visivel (geralmente a altura no celular). camera.fov esta em
      // graus em PerspectiveCamera.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fovDeg = (camera as any).fov ?? 50;
      const fovRad = (fovDeg * Math.PI) / 180;
      const distance =
        maxDimUnits / (2 * Math.tan(fovRad / 2) * 0.7);
      screenDistanceRef.current = Math.max(distance, 0.3);
      // Coloca no scene root e a pose e atualizada por frame pelo render
      // loop (em vez de reparentear na camera, que pode ter problemas
      // de scene graph com a MindAR).
      holder.position.copy(camera.position);
      holder.quaternion.copy(camera.quaternion);
      holder.scale.setScalar(1);
      scene.add(holder);
    } else if (next === "world") {
      // Snapshot da pose mundial do anchor no momento atual. Decompondo
      // em position/quaternion/scale e mais robusto que copiar a matriz
      // crua com matrixAutoUpdate=false (que tem casos de borda chatos).
      anchor.group.updateMatrixWorld(true);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      anchor.group.matrixWorld.decompose(pos, quat, scl);
      holder.position.copy(pos);
      holder.quaternion.copy(quat);
      holder.scale.copy(scl);
      scene.add(holder);
    }

    modeRef.current = next;
    setMode(next);
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
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="text-xs font-medium tracking-wide text-white/90 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">
            Render<span className="text-primary">AR</span>
          </div>

          <div className="w-9 h-9" aria-hidden />
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
              onClick={() => switchMode("screen")}
              className={
                "px-3 py-2 rounded-full text-xs font-medium transition-colors " +
                (mode === "screen"
                  ? "bg-primary text-white"
                  : "text-white/80 hover:text-white")
              }
            >
              Fixar na tela
            </button>
            <button
              type="button"
              onClick={() => switchMode("world")}
              disabled={phase !== "tracking"}
              title={
                phase !== "tracking"
                  ? "Aponte para o QR primeiro"
                  : "Congela o produto onde o QR está"
              }
              className={
                "px-3 py-2 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                (mode === "world"
                  ? "bg-primary text-white"
                  : "text-white/80 hover:text-white")
              }
            >
              Colocar aqui
            </button>
          </div>
        </div>
      )}

      {/* ============================== BOTTOM CARD ============================== */}
      {cameraActive && (
        <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(env(safe-area-inset-bottom),16px)] z-10">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-white truncate">
                  {productName}
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  {priceCents != null && (
                    <p className="text-lg text-primary font-semibold mt-0.5">
                      {formatPrice(priceCents, currency)}
                    </p>
                  )}
                  {sizeLabel && (
                    <span className="text-[10px] text-white/60 bg-white/5 px-1.5 py-0.5 rounded">
                      Tam. {sizeLabel}
                    </span>
                  )}
                  {physicalMaxCm != null && (
                    <span className="text-[10px] text-white/60">
                      {physicalMaxCm} cm
                    </span>
                  )}
                </div>
              </div>
              {mode === "marker" ? (
                phase === "tracking" ? (
                  <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Rastreando
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Procurando
                  </div>
                )
              ) : mode === "screen" ? (
                <div className="inline-flex items-center gap-1.5 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                  Fixo na tela
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                  Posicionado
                </div>
              )}
            </div>

            <p className="text-[11px] text-white/60 mt-2 flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3.5 h-3.5 shrink-0"
              >
                <path
                  d="M7 12a5 5 0 1 1 10 0M12 7v10M7 12l-2-2M17 12l2-2"
                  strokeLinecap="round"
                />
              </svg>
              Arraste o dedo na tela para girar o produto
            </p>
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
