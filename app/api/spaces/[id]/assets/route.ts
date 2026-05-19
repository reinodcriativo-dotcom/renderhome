import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const assetSchema = z.object({
  type: z.enum(["image", "video", "model", "thumbnail", "metadata"]),
  file_url: z.string().url(),
  file_path: z.string().min(1),
  mime_type: z.string().nullable().optional(),
  size_bytes: z.number().int().nonnegative().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!space) {
    return NextResponse.json(
      { error: "Espaço não encontrado" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { data: asset, error } = await supabase
    .from("space_assets")
    .insert({
      space_id: id,
      user_id: user.id,
      type: parsed.data.type,
      file_url: parsed.data.file_url,
      file_path: parsed.data.file_path,
      mime_type: parsed.data.mime_type ?? null,
      size_bytes: parsed.data.size_bytes ?? null,
    })
    .select("*")
    .single();

  if (error || !asset) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao salvar asset" },
      { status: 500 },
    );
  }

  return NextResponse.json(asset, { status: 201 });
}
