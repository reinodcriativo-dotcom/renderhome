/**
 * Worker local de fotogrametria.
 *
 * Uso:
 *   npm run render
 *
 * O script:
 *   1. lista jobs em `queued`
 *   2. pede para voce escolher um (se houver mais de um)
 *   3. baixa as fotos/videos do space do Supabase Storage
 *   4. extrai frames dos videos com ffmpeg-static
 *   5. roda meshroom_batch (Meshroom CLI) -> .obj + texturas
 *   6. converte para .glb (obj2gltf)
 *   7. faz upload do .glb de volta no Storage
 *   8. atualiza space.viewer_url e marca o job como completed
 *
 * O cliente recebe os updates via Supabase Realtime e ve o status em tempo real.
 */
import { getSupabase, getBucket, getMeshroomPath } from "./lib/supabase";
import { pickIndex } from "./lib/prompt";
import { prepareInputs } from "./lib/inputs";
import { runMeshroom } from "./lib/meshroom";
import { objToGlb } from "./lib/convert";
import { uploadGlb } from "./lib/upload";

interface Job {
  id: string;
  space_id: string;
  user_id: string;
  status: string;
  created_at: string;
  space?: { name: string };
}

async function listQueuedJobs(supabase: ReturnType<typeof getSupabase>) {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("id, space_id, user_id, status, created_at, spaces(name)")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    space: Array.isArray(row.spaces) ? row.spaces[0] : row.spaces,
  })) as Job[];
}

async function setJobStatus(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  patch: {
    status?: "queued" | "processing" | "completed" | "failed";
    progress?: number;
    error_message?: string | null;
    completed_at?: string | null;
    output_assets?: unknown;
  },
) {
  const { error } = await supabase
    .from("processing_jobs")
    .update(patch)
    .eq("id", jobId);
  if (error) throw error;
}

async function setSpaceStatus(
  supabase: ReturnType<typeof getSupabase>,
  spaceId: string,
  patch: {
    status?: "queued" | "processing" | "completed" | "failed";
    viewer_url?: string | null;
  },
) {
  const { error } = await supabase.from("spaces").update(patch).eq("id", spaceId);
  if (error) throw error;
}

async function loadAssets(
  supabase: ReturnType<typeof getSupabase>,
  spaceId: string,
) {
  const { data, error } = await supabase
    .from("space_assets")
    .select("id, type, file_path, mime_type")
    .eq("space_id", spaceId)
    .in("type", ["image", "video"]);
  if (error) throw error;
  return data ?? [];
}

async function main() {
  const supabase = getSupabase();
  const bucket = getBucket();
  const meshroomPath = getMeshroomPath();

  console.log(`\n=== RenderHome — worker local ===`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Meshroom: ${meshroomPath}\n`);

  const jobs = await listQueuedJobs(supabase);
  if (jobs.length === 0) {
    console.log("Nenhum job em queued/processing. Crie um space no app e clique em 'Iniciar processamento'.");
    process.exit(0);
  }

  console.log(`${jobs.length} job(s) pendente(s):\n`);
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    console.log(
      `  ${i + 1}. ${j.space?.name ?? "(sem nome)"}  [${j.status}]  job=${j.id}  ${j.created_at}`,
    );
  }

  const idx =
    jobs.length === 1 ? 0 : await pickIndex(`\nEscolha (1-${jobs.length}): `, jobs.length);
  const job = jobs[idx];

  console.log(`\n>>> Processando job ${job.id} (space ${job.space?.name ?? job.space_id})\n`);

  try {
    await setJobStatus(supabase, job.id, { status: "processing", progress: 5 });
    await setSpaceStatus(supabase, job.space_id, { status: "processing" });

    const assets = await loadAssets(supabase, job.space_id);
    if (assets.length === 0) throw new Error("Space sem assets de imagem/video");

    await setJobStatus(supabase, job.id, { progress: 10 });
    const inputs = await prepareInputs({
      supabase,
      bucket,
      assets,
      jobId: job.id,
    });
    if (inputs.imageCount < 5) {
      throw new Error(
        `So ${inputs.imageCount} imagens — Meshroom precisa de pelo menos 5 (idealmente 30+)`,
      );
    }

    await setJobStatus(supabase, job.id, { progress: 25 });
    const objPath = await runMeshroom({
      binary: meshroomPath,
      inputDir: inputs.dir,
      jobId: job.id,
    });

    await setJobStatus(supabase, job.id, { progress: 85 });
    const glbPath = await objToGlb(objPath);

    await setJobStatus(supabase, job.id, { progress: 95 });
    const uploaded = await uploadGlb({
      supabase,
      bucket,
      glbPath,
      userId: job.user_id,
      spaceId: job.space_id,
    });

    await setJobStatus(supabase, job.id, {
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
      output_assets: { viewer_url: uploaded.publicUrl, format: "glb" },
    });
    await setSpaceStatus(supabase, job.space_id, {
      status: "completed",
      viewer_url: uploaded.publicUrl,
    });

    console.log(`\n✓ Concluido!`);
    console.log(`  Viewer URL: ${uploaded.publicUrl}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n✗ Falhou: ${msg}`);
    await setJobStatus(supabase, job.id, {
      status: "failed",
      error_message: msg,
    });
    await setSpaceStatus(supabase, job.space_id, { status: "failed" });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
