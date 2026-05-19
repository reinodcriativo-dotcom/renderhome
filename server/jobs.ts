import "server-only";
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

  // Dispara o worker mock em background. Em produção, isto seria substituído
  // por uma chamada de enqueue (SQS / Redis / pg-boss / Supabase Queue).
  void runMockProcessing(job.id).catch((err) =>
    console.error("[jobs] processing failed", err),
  );

  return job;
}
