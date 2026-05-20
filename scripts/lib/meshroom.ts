import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

/**
 * Roda o pipeline de fotogrametria do Meshroom em modo CLI (meshroom_batch).
 * Retorna o caminho do .obj texturizado gerado.
 *
 * Pipeline default = photogrammetry (SfM -> MVS -> Meshing -> Texturing).
 * Tunings de baixo VRAM podem ser passados via env MESHROOM_PARAM_OVERRIDES,
 * exemplo: "DepthMap:downscale=8,Meshing:maxInputPoints=5000000"
 */
export async function runMeshroom(params: {
  binary: string;
  inputDir: string;
  jobId: string;
}): Promise<string> {
  const { binary, inputDir, jobId } = params;

  if (!fs.existsSync(binary)) {
    throw new Error(
      `MESHROOM_PATH nao aponta para um arquivo existente: ${binary}`,
    );
  }

  const baseDir = path.resolve("renders", jobId);
  const outputDir = path.join(baseDir, "output");
  const cacheDir = path.join(baseDir, "cache");
  await fs.promises.mkdir(outputDir, { recursive: true });
  await fs.promises.mkdir(cacheDir, { recursive: true });

  const args = [
    "--input", inputDir,
    "--output", outputDir,
    "--cache", cacheDir,
  ];

  const overrides = (process.env.MESHROOM_PARAM_OVERRIDES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (overrides.length > 0) {
    args.push("--paramOverrides", ...overrides);
  }

  console.log(`  > meshroom_batch (isso leva 30min-2h em CPU+GPU 2GB)...`);
  console.log(`    cmd: ${binary} ${args.join(" ")}`);

  const startedAt = Date.now();

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(binary, args, {
      stdio: ["ignore", "inherit", "inherit"],
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`meshroom_batch saiu com codigo ${code}`));
    });
  });

  const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log(`  > Meshroom terminou em ${elapsedMin} min`);

  // Meshroom escreve o resultado texturizado em <output>/texturedMesh.obj
  // junto com material e texturas.
  const candidates = [
    path.join(outputDir, "texturedMesh.obj"),
    path.join(outputDir, "Texturing", "texturedMesh.obj"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Fallback: procura recursivamente.
  const found = findFile(outputDir, "texturedMesh.obj");
  if (found) return found;

  throw new Error(
    `Nao encontrei texturedMesh.obj em ${outputDir}. Verifique se o Meshroom completou todas as etapas.`,
  );
}

function findFile(dir: string, name: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const r = findFile(full, name);
      if (r) return r;
    } else if (e.name === name) {
      return full;
    }
  }
  return null;
}
