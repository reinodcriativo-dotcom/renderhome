import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import ProductCard from "@/components/products/ProductCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produtos — RenderAR" };

export default async function ProductsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Meus produtos</h1>
          <p className="text-sm text-muted">
            Modelos 3D em AR ancorados em QR code.
          </p>
        </div>
        <Link href="/products/new" className="btn btn-primary">
          + Novo produto
        </Link>
      </div>

      {(!products || products.length === 0) && (
        <div className="card p-8 text-center space-y-3">
          <p className="text-muted">
            Você ainda não cadastrou nenhum produto.
          </p>
          <Link href="/products/new" className="btn btn-primary inline-flex">
            Cadastrar meu primeiro produto
          </Link>
        </div>
      )}

      {products && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
