import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const markerSchema = z.object({
  marker_url: z.string().url(),
  marker_path: z.string().min(1),
  mind_file_url: z.string().url(),
  mind_file_path: z.string().min(1),
});

/**
 * Recebe as URLs do PNG do QR e do arquivo .mind apos o upload no Storage
 * (feito pelo client). Grava no produto e marca status='ready' (publicado).
 */
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

  const { data: product } = await supabase
    .from("products")
    .select("id, model_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 },
    );
  }
  if (!product.model_url) {
    return NextResponse.json(
      { error: "Faça upload do modelo .glb antes de gerar o QR" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = markerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("products")
    .update({
      marker_url: parsed.data.marker_url,
      marker_path: parsed.data.marker_path,
      mind_file_url: parsed.data.mind_file_url,
      mind_file_path: parsed.data.mind_file_path,
      status: "ready",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
