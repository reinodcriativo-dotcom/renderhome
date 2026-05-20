import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produtos — RenderAR" };

export default async function ProductsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Product[];
  const total = products.length;
  const published = products.filter((p) => p.status === "ready").length;
  const drafts = products.filter((p) => p.status === "draft").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Meus produtos
          </h1>
          <p className="text-sm text-muted">
            Gerencie seu catálogo 3D em realidade aumentada.
          </p>
        </div>
        {total > 0 && (
          <Link href="/products/new" className="btn btn-primary self-start">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo produto
          </Link>
        )}
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Total" value={total} />
          <StatCard label="Publicados" value={published} accent="emerald" />
          <StatCard label="Rascunhos" value={drafts} accent="zinc" />
        </div>
      )}

      {total === 0 && (
        <div className="card p-8 sm:p-12 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              aria-hidden="true"
            >
              <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
              <path d="M3.5 7.5 12 12l8.5-4.5" />
              <path d="M12 12v9" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">
              Cadastre seu primeiro produto
            </h2>
            <p className="text-sm text-muted max-w-md mx-auto">
              Em 4 passos guiados: descreva o produto, suba um modelo 3D, gere o
              QR e publique. Seus clientes vão escanear o QR e ver o item em AR.
            </p>
          </div>
          <Link
            href="/products/new"
            className="btn btn-primary inline-flex"
          >
            Começar agora
          </Link>
        </div>
      )}

      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "zinc";
}) {
  const accentColor =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "zinc"
        ? "text-zinc-300"
        : "text-foreground";
  return (
    <div className="card px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accentColor}`}>
        {value}
      </p>
    </div>
  );
}
