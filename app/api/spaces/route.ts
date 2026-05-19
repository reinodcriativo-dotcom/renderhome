import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { spaceSchema } from "@/lib/validators";
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
  const parsed = spaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { name, description, address, is_public, tags } = parsed.data;

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({
      user_id: user.id,
      name,
      description: description ?? null,
      address: address ?? null,
      is_public: is_public ?? true,
      public_slug: generatePublicSlug(),
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !space) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar espaço" },
      { status: 500 },
    );
  }

  if (tags && tags.length > 0) {
    await supabase
      .from("space_tags")
      .insert(tags.map((tag) => ({ space_id: space.id, tag })));
  }

  return NextResponse.json(space, { status: 201 });
}
