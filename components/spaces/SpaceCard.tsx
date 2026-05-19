"use client";

import Link from "next/link";
import type { Space, SpaceTag } from "@/types/space";
import SpaceStatusBadge from "./SpaceStatusBadge";
import { formatDate } from "@/lib/utils";
import { env } from "@/lib/env";

export default function SpaceCard({
  space,
  tags,
}: {
  space: Space;
  tags: SpaceTag[];
}) {
  const publicUrl =
    space.public_slug && space.status === "completed" && space.is_public
      ? `${env.APP_URL}/view/${space.public_slug}`
      : null;

  function copyLink() {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl).catch(() => {});
    }
  }

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Link
            href={`/spaces/${space.id}`}
            className="text-base font-medium hover:text-primary truncate block"
          >
            {space.name}
          </Link>
          {space.address && (
            <p className="text-xs text-muted truncate">{space.address}</p>
          )}
        </div>
        <SpaceStatusBadge status={space.status} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map((t) => (
            <span
              key={t.id}
              className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300"
            >
              {t.tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted">
          {formatDate(space.created_at)}
        </span>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <button
              type="button"
              onClick={copyLink}
              className="btn btn-ghost text-xs"
            >
              Copiar link
            </button>
          )}
          <Link
            href={`/spaces/${space.id}`}
            className="btn btn-secondary text-xs"
          >
            Abrir
          </Link>
        </div>
      </div>
    </div>
  );
}
