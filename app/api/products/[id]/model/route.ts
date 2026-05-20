import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const modelSchema = z.object({
  model_url: z.string().url(),
  model_path: z.string().min(1),
  model_size_bytes: z.number().int().nonnegative().nullable().optional(),
});

/**
 * Registra um modelo 3D recem-enviado para o Storage no registro do produto.
 * O upload do arquivo em si vai direto do client para o Supabase Storage
 * (RLS controla a permissao); este endpoint apenas grava as URLs.
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
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = modelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("products")
    .update({
      model_url: parsed.data.model_url,
      model_path: parsed.data.model_path,
      model_size_bytes: parsed.data.model_size_bytes ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
