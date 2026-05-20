import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import ProductForm from "@/components/products/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
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

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href={`/products/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Voltar
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-2">
          Editar produto
        </h1>
      </div>

      <div className="card p-5 sm:p-6">
        <ProductForm
          mode="edit"
          initial={{
            id: product.id,
            name: product.name,
            description: product.description,
            price_cents: product.price_cents,
            currency: product.currency,
            category: product.category,
            size_label: product.size_label,
            dim_length_cm: product.dim_length_cm,
            dim_width_cm: product.dim_width_cm,
            dim_height_cm: product.dim_height_cm,
            marker_width_cm: product.marker_width_cm,
            is_public: product.is_public,
          }}
        />
      </div>
    </div>
  );
}
