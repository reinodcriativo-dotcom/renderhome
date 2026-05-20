import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createClient,
  createServiceClient,
} from "@/lib/supabase-server";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/utils";
import ARExperience from "@/components/products/ARExperience";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, description, is_public, status")
    .eq("public_slug", slug)
    .single();

  if (!product || !product.is_public || product.status !== "ready") {
    return { title: "Produto não encontrado — RenderAR" };
  }
  return {
    title: `${product.name} — RenderAR`,
    description: product.description ?? undefined,
  };
}

export default async function ARPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, price_cents, currency, category, size_label, dim_length_cm, dim_width_cm, dim_height_cm, marker_width_cm, model_url, model_path, mind_file_url, mind_file_path, is_public, status",
    )
    .eq("public_slug", slug)
    .single();

  if (!product || !product.is_public || product.status !== "ready") {
    notFound();
  }

  // Geramos signed URLs (1h) com service_role para servir os assets ao
  // visitante anonimo sem depender de policies de read publico no Storage
  // — comprovadamente menos confiavel que signed URLs.
  const service = createServiceClient();
  let modelSignedUrl: string | null = null;
  let mindSignedUrl: string | null = null;

  if (product.model_path) {
    const { data: m } = await service.storage
      .from(env.SUPABASE_BUCKET)
      .createSignedUrl(product.model_path, 3600);
    modelSignedUrl = m?.signedUrl ?? null;
  }
  if (product.mind_file_path) {
    const { data: m } = await service.storage
      .from(env.SUPABASE_BUCKET)
      .createSignedUrl(product.mind_file_path, 3600);
    mindSignedUrl = m?.signedUrl ?? null;
  }

  const canRender = !!modelSignedUrl && !!mindSignedUrl;

  if (!canRender) {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {product.name}
              </h1>
              {product.price_cents != null && (
                <p className="text-sm text-primary font-medium">
                  {formatPrice(product.price_cents, product.currency)}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground hidden sm:inline"
            >
              Render<span className="text-primary">AR</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="card p-8 text-center text-sm text-muted">
            Este produto ainda não tem o modelo 3D ou o QR de tracking
            configurados. Volte mais tarde.
          </div>
        </div>
      </main>
    );
  }

  // Maior dimensao fisica em cm — usada para escalar o modelo em AR.
  // Se nenhuma das tres foi informada, deixamos null para que o
  // ARExperience use o fallback (60% da largura do marker).
  const dims = [
    product.dim_length_cm,
    product.dim_width_cm,
    product.dim_height_cm,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  const physicalMaxCm = dims.length > 0 ? Math.max(...dims) : null;

  return (
    <ARExperience
      modelUrl={modelSignedUrl!}
      mindFileUrl={mindSignedUrl!}
      productName={product.name}
      priceCents={product.price_cents}
      currency={product.currency}
      sizeLabel={product.size_label ?? null}
      physicalMaxCm={physicalMaxCm}
      markerWidthCm={product.marker_width_cm ?? 10}
    />
  );
}
