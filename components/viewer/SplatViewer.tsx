"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Bounds } from "@react-three/drei";
import {
  Component,
  Suspense,
  useRef,
  useState,
  type ReactNode,
} from "react";
import RealSplatViewer from "./RealSplatViewer";

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[viewer] caught error", err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function getExt(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0].toLowerCase();
  const dot = path.lastIndexOf(".");
  if (dot < 0) return null;
  return path.slice(dot);
}

function isSplatUrl(url: string | null | undefined): boolean {
  const ext = getExt(url);
  return ext === ".ply" || ext === ".splat" || ext === ".ksplat";
}

function isMeshUrl(url: string | null | undefined): boolean {
  const ext = getExt(url);
  return ext === ".glb" || ext === ".gltf";
}

function Mesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function PlaceholderScene() {
  return (
    <group>
      {/* chão */}
      <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#27272a" />
      </mesh>
      {/* parede atrás */}
      <mesh position={[0, 1.5, -5]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      {/* móveis */}
      <mesh position={[-1.5, -0.25, -1]}>
        <boxGeometry args={[1.5, 1.5, 1]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
      <mesh position={[1.2, -0.5, -0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>
      <mesh position={[0.5, -0.7, 1.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 32]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

function MeshOrPlaceholder({ url }: { url?: string | null }) {
  if (!url) return <PlaceholderScene />;
  return (
    <CanvasErrorBoundary fallback={<PlaceholderScene />}>
      <Suspense fallback={<PlaceholderScene />}>
        <Bounds fit clip observe margin={1.2}>
          <Mesh url={url} />
        </Bounds>
      </Suspense>
    </CanvasErrorBoundary>
  );
}

function R3FCanvas({ url }: { url?: string | null }) {
  return (
    <Canvas
      shadows
      camera={{ position: [4, 3, 6], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 6, -3]} intensity={0.4} />
      <MeshOrPlaceholder url={url} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={50}
      />
    </Canvas>
  );
}

function ViewerFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center text-sm text-muted">
      Não foi possível carregar a visualização 3D.
    </div>
  );
}

export default function SplatViewer({ url }: { url?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splatFailed, setSplatFailed] = useState(false);

  // Decisao de qual renderer usar baseado na extensao da URL:
  // - .ply / .splat / .ksplat  -> Gaussian Splat (mkkellogg)
  // - .glb / .gltf             -> mesh (R3F + useGLTF) -- fotogrametria/Meshroom
  // - qualquer outro (ou null) -> Canvas R3F com PlaceholderScene
  const useRealSplat = isSplatUrl(url) && !splatFailed;
  const useMesh = isMeshUrl(url);

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[60vh] sm:h-[70vh] bg-zinc-950 rounded-xl overflow-hidden border border-border"
    >
      <CanvasErrorBoundary fallback={<ViewerFallback />}>
        {useRealSplat && url ? (
          <RealSplatViewer url={url} onError={() => setSplatFailed(true)} />
        ) : (
          <R3FCanvas url={useMesh ? url : null} />
        )}
      </CanvasErrorBoundary>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 btn btn-secondary text-xs z-10"
      >
        {isFullscreen ? "Sair tela cheia" : "Tela cheia"}
      </button>
    </div>
  );
}
