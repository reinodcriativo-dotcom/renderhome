import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AssetType } from "@/types/database";
import { env } from "./env";

export function buildAssetPath(
  userId: string,
  spaceId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^\w.\-]/g, "_");
  return `${userId}/${spaceId}/${Date.now()}_${safe}`;
}

export function inferAssetType(mime: string | null | undefined): AssetType {
  if (!mime) return "metadata";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/octet-stream") return "model";
  return "metadata";
}

export async function uploadAsset(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    spaceId: string;
    file: File;
  },
): Promise<{ path: string; publicUrl: string }> {
  const path = buildAssetPath(params.userId, params.spaceId, params.file.name);
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.file.type || undefined,
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
