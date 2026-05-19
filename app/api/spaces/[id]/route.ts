import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { spaceSchema } from "@/lib/validators";

export async function PATCH(
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

  const body = await request.json().catch(() => null);
  const parsed = spaceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const { name, description, address, is_public, tags } = parsed.data;

  const { data: existing, error: findErr } = await supabase
    .from("spaces")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (findErr || !existing) {
    return NextResponse.json(
      { error: "Espaço não encontrado" },
      { status: 404 },
    );
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (address !== undefined) update.address = address;
  if (is_public !== undefined) update.is_public = is_public;

  if (Object.keys(update).length > 0) {
    const { error: updateErr } = await supabase
      .from("spaces")
      .update(update)
      .eq("id", id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  if (tags !== undefined) {
    await supabase.from("space_tags").delete().eq("space_id", id);
    if (tags.length > 0) {
      await supabase
        .from("space_tags")
        .insert(tags.map((tag) => ({ space_id: id, tag })));
    }
  }

  return NextResponse.json({ id });
}

export async function DELETE(
  _request: Request,
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

  const { error } = await supabase
    .from("spaces")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
