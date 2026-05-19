import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createProcessingJob } from "@/server/jobs";

export async function POST(
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

  const { data: space } = await supabase
    .from("spaces")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!space) {
    return NextResponse.json(
      { error: "Espaço não encontrado" },
      { status: 404 },
    );
  }

  if (space.status === "processing" || space.status === "queued") {
    return NextResponse.json(
      { error: "Já existe um processamento em andamento" },
      { status: 409 },
    );
  }

  const { data: assets } = await supabase
    .from("space_assets")
    .select("id, type")
    .eq("space_id", id)
    .in("type", ["image", "video"]);

  if (!assets || assets.length === 0) {
    return NextResponse.json(
      { error: "Adicione capturas antes de processar" },
      { status: 400 },
    );
  }

  try {
    const job = await createProcessingJob(supabase, {
      spaceId: id,
      userId: user.id,
      inputAssetIds: assets.map((a) => a.id),
    });
    return NextResponse.json({ job_id: job.id }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
