import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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

  // NOTA: o worker e LOCAL agora. O job fica em "queued" ate o usuario
  // rodar `npm run render` no PC (com GPU NVIDIA + Meshroom instalado),
  // que pega o proximo job na fila, processa e atualiza o status via
  // SUPABASE_SERVICE_ROLE_KEY. O cliente recebe os updates em tempo real
  // via Supabase Realtime.
  return job;
}
