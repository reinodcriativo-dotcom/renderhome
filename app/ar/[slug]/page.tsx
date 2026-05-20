import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
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
      "id, name, description, price_cents, currency, model_url, mind_file_url, is_public, status",
    )
    .eq("public_slug", slug)
    .single();

  if (!product || !product.is_public || product.status !== "ready") {
    notFound();
  }

  // Se faltar modelo ou arquivo de tracking, mostramos fallback informativo.
  const canRender = !!product.model_url && !!product.mind_file_url;

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

  return (
    <ARExperience
      modelUrl={product.model_url}
      mindFileUrl={product.mind_file_url}
      productName={product.name}
      priceCents={product.price_cents}
      currency={product.currency}
    />
  );
}
