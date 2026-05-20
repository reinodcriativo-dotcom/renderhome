import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { productSchema } from "@/lib/validators";
import { generatePublicSlug } from "@/lib/slug";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { name, description, price_cents, currency, is_public } = parsed.data;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      name,
      description: description ?? null,
      price_cents: price_cents ?? null,
      currency: currency ?? "BRL",
      is_public: is_public ?? true,
      public_slug: generatePublicSlug(),
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !product) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar produto" },
      { status: 500 },
    );
  }

  return NextResponse.json(product, { status: 201 });
}
