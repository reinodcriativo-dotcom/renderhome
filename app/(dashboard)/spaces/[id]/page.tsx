import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatBytes, formatDate } from "@/lib/utils";
import SpaceStatusBadge from "@/components/spaces/SpaceStatusBadge";
import ProcessButton from "@/components/spaces/ProcessButton";
import CopyLinkButton from "@/components/spaces/CopyLinkButton";
import JobProgress from "@/components/spaces/JobProgress";

export const dynamic = "force-dynamic";

export default async function SpaceDetailPage({
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

  const [{ data: tags }, { data: assets }, { data: jobs }] = await Promise.all([
    supabase.from("space_tags").select("*").eq("space_id", id),
    supabase
      .from("space_assets")
      .select("*")
      .eq("space_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("processing_jobs")
      .select("*")
      .eq("space_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const latestJob = jobs?.[0] ?? null;
  const hasCaptures = (assets ?? []).some(
    (a) => a.type === "image" || a.type === "video",
  );
  const canProcess =
    hasCaptures &&
    space.status !== "processing" &&
    space.status !== "queued";

  const publicUrl =
    space.public_slug && space.status === "completed" && space.is_public
      ? `${env.APP_URL}/view/${space.public_slug}`
      : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          href="/spaces"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Meus espaços
        </Link>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold">
                {space.name}
              </h1>
              <SpaceStatusBadge status={space.status} />
            </div>
            {space.address && (
              <p className="text-sm text-muted">{space.address}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/spaces/${id}/edit`}
              className="btn btn-secondary text-sm"
            >
              Editar
            </Link>
          </div>
        </div>

        {space.description && (
          <p className="text-sm whitespace-pre-wrap text-zinc-300">
            {space.description}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300"
              >
                {t.tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted">
          Criado em {formatDate(space.created_at)}
        </p>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Capturas</h2>
          <Link
            href={`/spaces/${id}/capture`}
            className="btn btn-primary text-sm"
          >
            Adicionar capturas
          </Link>
        </div>

        {(!assets || assets.filter((a) => a.type === "image" || a.type === "video").length === 0) && (
          <p className="text-sm text-muted">
            Nenhuma captura ainda. Adicione vídeos ou fotos do ambiente.
          </p>
        )}

        {assets && assets.length > 0 && (
          <ul className="text-sm divide-y divide-zinc-800">
            {assets
              .filter((a) => a.type === "image" || a.type === "video")
              .map((a) => (
                <li
                  key={a.id}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="text-xs uppercase text-muted mr-2">
                        {a.type}
                      </span>
                      {a.file_path.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted">
                      {formatBytes(a.size_bytes)} · {formatDate(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {latestJob && latestJob.status !== "completed" && (
        <JobProgress initialJob={latestJob} />
      )}

      <div className="card p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Ambiente 3D</h2>
            <p className="text-sm text-muted">
              {space.status === "completed"
                ? "Pronto! Compartilhe o link público."
                : "Processe o espaço para gerar o ambiente 3D."}
            </p>
          </div>
          {canProcess && (
            <ProcessButton
              spaceId={id}
              label={
                space.status === "completed"
                  ? "Reprocessar"
                  : "Iniciar processamento"
              }
            />
          )}
        </div>

        {publicUrl && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            <code className="flex-1 text-xs bg-zinc-900 border border-border rounded px-3 py-2 truncate">
              {publicUrl}
            </code>
            <div className="flex gap-2">
              <CopyLinkButton url={publicUrl} />
              <Link
                href={`/view/${space.public_slug}`}
                target="_blank"
                className="btn btn-secondary text-sm"
              >
                Abrir
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
