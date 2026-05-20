import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Asset {
  id: string;
  type: string;
  file_path: string;
  mime_type: string | null;
}

const VIDEO_FPS = 2; // frames extraidos por segundo
const MAX_FRAME_WIDTH = 1920;

function ffmpegPath(): string {
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static nao disponivel nesta plataforma");
  }
  return ffmpegStatic;
}

async function downloadOne(
  supabase: SupabaseClient,
  bucket: string,
  filePath: string,
  destDir: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) throw error ?? new Error("Falha no download");

  const filename = path.basename(filePath);
  const dest = path.join(destDir, filename);
  const buf = Buffer.from(await data.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
  return dest;
}

function extractFrames(videoPath: string, outDir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const baseName = path
      .basename(videoPath, path.extname(videoPath))
      .replace(/[^\w.-]/g, "_");
    const outPattern = path.join(outDir, `${baseName}_%04d.jpg`);

    const args = [
      "-i", videoPath,
      "-vf", `fps=${VIDEO_FPS},scale='min(${MAX_FRAME_WIDTH},iw)':-2`,
      "-q:v", "2",
      "-y",
      outPattern,
    ];

    console.log(`  > ffmpeg extraindo frames de ${path.basename(videoPath)}...`);
    const proc = spawn(ffmpegPath(), args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg saiu com codigo ${code}: ${stderr.slice(-400)}`));
        return;
      }
      const generated = fs
        .readdirSync(outDir)
        .filter((f) => f.startsWith(`${baseName}_`) && f.endsWith(".jpg"));
      resolve(generated.length);
    });
  });
}

/**
 * Baixa todos os assets de imagem/video de um space, extrai frames de
 * videos para .jpg, e devolve o diretorio com os arquivos prontos pro
 * Meshroom.
 */
export async function prepareInputs(params: {
  supabase: SupabaseClient;
  bucket: string;
  assets: Asset[];
  jobId: string;
}): Promise<{ dir: string; imageCount: number }> {
  const { supabase, bucket, assets, jobId } = params;

  const baseDir = path.resolve("renders", jobId);
  const inputsDir = path.join(baseDir, "inputs");
  await fs.promises.mkdir(inputsDir, { recursive: true });

  const images = assets.filter((a) => a.type === "image");
  const videos = assets.filter((a) => a.type === "video");

  console.log(
    `  > Baixando ${images.length} imagem(ns) e ${videos.length} video(s)...`,
  );

  // Imagens vao direto pra pasta de inputs.
  for (const a of images) {
    await downloadOne(supabase, bucket, a.file_path, inputsDir);
  }

  // Videos sao baixados pra subpasta temporaria, depois ffmpeg gera frames.
  let extractedTotal = 0;
  if (videos.length > 0) {
    const videosDir = path.join(baseDir, "videos");
    await fs.promises.mkdir(videosDir, { recursive: true });
    for (const v of videos) {
      const local = await downloadOne(supabase, bucket, v.file_path, videosDir);
      const n = await extractFrames(local, inputsDir);
      extractedTotal += n;
      console.log(`    extraidos ${n} frames de ${path.basename(v.file_path)}`);
    }
  }

  const finalCount = (await fs.promises.readdir(inputsDir)).filter((f) =>
    /\.(jpg|jpeg|png|webp|heic)$/i.test(f),
  ).length;

  console.log(
    `  > ${finalCount} imagem(ns) prontas em ${path.relative(process.cwd(), inputsDir)}`,
  );

  if (finalCount < 10) {
    console.warn(
      "  ! Aviso: menos de 10 imagens. Meshroom precisa de ~30+ para fotogrametria decente.",
    );
  }

  return { dir: inputsDir, imageCount: finalCount };
}
