import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatBytes, formatDate, formatPrice } from "@/lib/utils";
import ProductStatusBadge from "@/components/products/ProductStatusBadge";
import GlbUploader from "@/components/products/GlbUploader";
import PublishToggle from "@/components/products/PublishToggle";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) notFound();

  const arUrl =
    product.public_slug && product.status === "ready" && product.is_public
      ? `${env.APP_URL}/ar/${product.public_slug}`
      : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/products" className="text-sm text-muted hover:text-foreground">
          ← Meus produtos
        </Link>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold">
                {product.name}
              </h1>
              <ProductStatusBadge status={product.status} />
            </div>
            {product.price_cents != null && (
              <p className="text-lg text-primary font-medium">
                {formatPrice(product.price_cents, product.currency)}
              </p>
            )}
          </div>
          <Link
            href={`/products/${id}/edit`}
            className="btn btn-secondary text-sm"
          >
            Editar
          </Link>
        </div>

        {product.description && (
          <p className="text-sm whitespace-pre-wrap text-zinc-300">
            {product.description}
          </p>
        )}

        <p className="text-xs text-muted">
          Criado em {formatDate(product.created_at)}
        </p>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-medium">Modelo 3D</h2>
          <p className="text-sm text-muted">
            Arquivo .glb que vai aparecer flutuando em cima do QR.
          </p>
        </div>

        {product.model_url && (
          <div className="text-sm space-y-1">
            <p className="text-muted">
              Modelo enviado · {formatBytes(product.model_size_bytes)}
            </p>
          </div>
        )}

        <GlbUploader
          productId={id}
          userId={user.id}
          currentModelUrl={product.model_url}
        />
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Publicação</h2>
            <p className="text-sm text-muted">
              {product.status === "ready"
                ? "Produto publicado. Em breve será possível gerar o QR (Fase 3)."
                : "Publique para gerar o QR público (Fase 3 implementa o QR; agora só marca o produto como pronto)."}
            </p>
          </div>
          <PublishToggle
            productId={id}
            status={product.status}
            canPublish={!!product.model_url}
          />
        </div>

        {arUrl && (
          <div className="space-y-1">
            <p className="text-xs text-muted">URL pública AR (Fase 4):</p>
            <code className="block text-xs bg-zinc-900 border border-border rounded px-3 py-2 truncate">
              {arUrl}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
