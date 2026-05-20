import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import UploadDropzone from "@/components/upload/UploadDropzone";

export const dynamic = "force-dynamic";

export default async function CapturePage({
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

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href={`/spaces/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {space.name}
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-2">
          Capturar ambiente
        </h1>
        <p className="text-sm text-muted">
          Grave um vídeo ou envie imagens do ambiente. Quanto mais cobertura,
          melhor o resultado.
        </p>
      </div>

      <div className="card p-4 text-sm space-y-1">
        <p className="font-medium">Dicas de captura</p>
        <ul className="list-disc list-inside text-muted space-y-0.5">
          <li>Ande devagar pelo ambiente.</li>
          <li>Passe por todos os cantos.</li>
          <li>Evite movimentos bruscos.</li>
          <li>Capture paredes, chão, teto e objetos principais.</li>
        </ul>
      </div>

      <UploadDropzone spaceId={space.id} userId={user.id} />

      <div className="pt-2">
        <Link href={`/spaces/${id}`} className="btn btn-secondary">
          Voltar ao espaço
        </Link>
      </div>
    </div>
  );
}
