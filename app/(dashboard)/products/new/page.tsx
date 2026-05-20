import Link from "next/link";
import ProductForm from "@/components/products/ProductForm";

export const metadata = { title: "Novo produto — RenderAR" };

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Link
          href="/products"
          className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1"
        >
          ← Voltar para produtos
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Novo produto
          </h1>
          <p className="text-sm text-muted">
            Cadastre o produto em 3 passos. Depois você sobe o modelo 3D e gera
            o QR.
          </p>
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
