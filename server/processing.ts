import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { generatePublicSlug } from "@/lib/slug";

/**
 * Mock do pipeline de Gaussian Splatting.
 *
 * Em produção este worker seria executado fora do request/response do Next.js
 * (fila + worker dedicado). Aqui rodamos em background dentro do processo para
 * o MVP validar o fluxo de produto.
 *
 * Quando o processamento real for adicionado:
 *  - este arquivo deve enfileirar o job em uma fila (ex.: SQS, Redis, pg-boss);
 *  - um worker dedicado consome a fila, baixa os assets, roda gsplat e devolve
 *    um arquivo .ply/.splat/.spz no storage;
 *  - o worker atualiza processing_jobs e spaces.viewer_url ao final.
 */
export async function runMockProcessing(jobId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: job, error: jobErr } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    console.error("[processing] job not found", jobId, jobErr);
    return;
  }

  const steps = [
    { progress: 10, delayMs: 800 },
    { progress: 30, delayMs: 1200 },
    { progress: 60, delayMs: 1500 },
    { progress: 85, delayMs: 1200 },
    { progress: 100, delayMs: 800 },
  ];

  await supabase
    .from("processing_jobs")
    .update({ status: "processing", progress: 0 })
    .eq("id", jobId);

  await supabase
    .from("spaces")
    .update({ status: "processing" })
    .eq("id", job.space_id);

  try {
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delayMs));
      await supabase
        .from("processing_jobs")
        .update({ progress: step.progress })
        .eq("id", jobId);
    }

    // Garante slug público
    const { data: space } = await supabase
      .from("spaces")
      .select("public_slug")
      .eq("id", job.space_id)
      .single();

    const slug = space?.public_slug ?? generatePublicSlug();

    // No MVP, viewer_url aponta para o modelo de exemplo público.
    // Quando o pipeline real existir, isso vai apontar para o arquivo .splat
    // gerado e salvo no storage.
    const viewerUrl = "/sample-models/sample.glb";

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        output_assets: { viewer_url: viewerUrl, format: "glb" },
      })
      .eq("id", jobId);

    await supabase
      .from("spaces")
      .update({
        status: "completed",
        public_slug: slug,
        viewer_url: viewerUrl,
      })
      .eq("id", job.space_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", jobId);
    await supabase
      .from("spaces")
      .update({ status: "failed" })
      .eq("id", job.space_id);
  }
}
