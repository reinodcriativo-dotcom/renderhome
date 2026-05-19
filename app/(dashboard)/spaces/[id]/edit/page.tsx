import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import SpaceForm from "@/components/spaces/SpaceForm";

export const dynamic = "force-dynamic";

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!space) notFound();

  const { data: tags } = await supabase
    .from("space_tags")
    .select("*")
    .eq("space_id", id);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href={`/spaces/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Voltar
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-2">
          Editar espaço
        </h1>
      </div>

      <div className="card p-5 sm:p-6">
        <SpaceForm
          mode="edit"
          initial={{
            id: space.id,
            name: space.name,
            description: space.description,
            address: space.address,
            is_public: space.is_public,
            tags: (tags ?? []).map((t) => t.tag),
          }}
        />
      </div>
    </div>
  );
}
