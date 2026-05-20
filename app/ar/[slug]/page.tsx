import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils";

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
      "id, name, description, price_cents, currency, model_url, is_public, status",
    )
    .eq("public_slug", slug)
    .single();

  if (!product || !product.is_public || product.status !== "ready") {
    notFound();
  }

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

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm text-muted">
            Aponte a câmera do seu celular para o QR físico para ver o produto
            em realidade aumentada.
          </p>
          <p className="text-xs text-muted">
            ⚠️ Experiência AR em construção (Fase 4). A captura via MindAR +
            permissão de câmera serão adicionadas em breve.
          </p>
        </div>

        {product.description && (
          <div className="card p-5 space-y-2">
            <h2 className="text-sm font-medium">Sobre o produto</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
