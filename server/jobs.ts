import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { runMockProcessing } from "./processing";

export async function createProcessingJob(
  supabase: SupabaseClient<Database>,
  params: { spaceId: string; userId: string; inputAssetIds: string[] },
) {
  const { data: job, error } = await supabase
    .from("processing_jobs")
    .insert({
      space_id: params.spaceId,
      user_id: params.userId,
      status: "queued",
      progress: 0,
      input_assets: { asset_ids: params.inputAssetIds },
    })
    .select("*")
    .single();

  if (error || !job) throw error ?? new Error("Falha ao criar job");

  await supabase
    .from("spaces")
    .update({ status: "queued" })
    .eq("id", params.spaceId);

  // Em serverless (Vercel), a execucao para quando a resposta volta. after()
  // sinaliza ao runtime para manter o trabalho vivo apos o response — usando
  // waitUntil internamente em plataformas que suportam (Vercel). Em producao
  // real isto seria substituido por enqueue em fila + worker dedicado.
  after(async () => {
    try {
      await runMockProcessing(job.id);
    } catch (err) {
      console.error("[jobs] processing failed", err);
    }
  });

  return job;
}
