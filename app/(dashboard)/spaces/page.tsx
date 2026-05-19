import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import SpaceCard from "@/components/spaces/SpaceCard";
import type { SpaceTag } from "@/types/space";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const spaceIds = (spaces ?? []).map((s) => s.id);
  const { data: tags } = spaceIds.length
    ? await supabase.from("space_tags").select("*").in("space_id", spaceIds)
    : { data: [] as SpaceTag[] };

  const tagsBySpace = new Map<string, SpaceTag[]>();
  for (const t of tags ?? []) {
    const list = tagsBySpace.get(t.space_id) ?? [];
    list.push(t);
    tagsBySpace.set(t.space_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Meus espaços</h1>
          <p className="text-sm text-muted">
            Capturas 3D de ambientes que você criou.
          </p>
        </div>
        <Link href="/spaces/new" className="btn btn-primary">
          + Novo espaço
        </Link>
      </div>

      {(!spaces || spaces.length === 0) && (
        <div className="card p-8 text-center space-y-3">
          <p className="text-muted">
            Você ainda não criou nenhum espaço.
          </p>
          <Link href="/spaces/new" className="btn btn-primary inline-flex">
            Criar meu primeiro espaço
          </Link>
        </div>
      )}

      {spaces && spaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {spaces.map((s) => (
            <SpaceCard
              key={s.id}
              space={s}
              tags={tagsBySpace.get(s.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
