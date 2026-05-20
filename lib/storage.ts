import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "./env";

/**
 * Caminho no bucket: <user_id>/<product_id>/<filename>
 * O prefixo garante que as RLS policies (que usam storage.foldername(name))
 * funcionem corretamente para isolar arquivos por usuario.
 */
export function buildModelPath(
  userId: string,
  productId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^\w.\-]/g, "_");
  return `${userId}/${productId}/${Date.now()}_${safe}`;
}

export async function uploadModel(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    productId: string;
    file: File;
  },
): Promise<{ path: string; publicUrl: string }> {
  const path = buildModelPath(params.userId, params.productId, params.file.name);
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.file.type || "model/gltf-binary",
    });
  if (error) throw error;

  const { data } = supabase.storage
    .from(env.SUPABASE_BUCKET)
    .getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

export function getPublicUrl(
  supabase: SupabaseClient<Database>,
  path: string,
): string {
  const { data } = supabase.storage
    .from(env.SUPABASE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<void> {
  await supabase.storage.from(env.SUPABASE_BUCKET).remove([path]);
}
