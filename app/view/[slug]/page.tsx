import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SplatViewer from "@/components/viewer/SplatViewerClient";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("name, description, is_public, status")
    .eq("public_slug", slug)
    .single();

  if (!space || !space.is_public || space.status !== "completed") {
    return { title: "Ambiente não encontrado" };
  }

  return {
    title: `${space.name} — RenderEstate 3D`,
    description: space.description ?? undefined,
  };
}

export default async function PublicViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, description, viewer_url, is_public, status")
    .eq("public_slug", slug)
    .single();

  if (!space || !space.is_public || space.status !== "completed") notFound();

  const { data: tags } = await supabase
    .from("space_tags")
    .select("tag")
    .eq("space_id", space.id);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate">
              {space.name}
            </h1>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t) => (
                  <span
                    key={t.tag}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <a
            href="/"
            className="text-sm text-muted hover:text-foreground hidden sm:inline"
          >
            Criado com RenderEstate 3D
          </a>
        </div>
      </header>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <SplatViewer url={space.viewer_url} />

        {space.description && (
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {space.description}
          </p>
        )}
      </div>
    </main>
  );
}
