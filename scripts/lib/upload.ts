import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Faz upload do .glb final para o Supabase Storage e devolve a URL publica.
 * Path no bucket: <user_id>/<space_id>/render-<timestamp>.glb
 */
export async function uploadGlb(params: {
  supabase: SupabaseClient;
  bucket: string;
  glbPath: string;
  userId: string;
  spaceId: string;
}): Promise<{ path: string; publicUrl: string }> {
  const { supabase, bucket, glbPath, userId, spaceId } = params;

  const ts = Date.now();
  const storagePath = `${userId}/${spaceId}/render-${ts}.glb`;
  const buf = await fs.promises.readFile(glbPath);

  console.log(
    `  > Enviando ${path.basename(glbPath)} -> bucket/${storagePath}...`,
  );

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buf, {
      contentType: "model/gltf-binary",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return { path: storagePath, publicUrl: data.publicUrl };
}
