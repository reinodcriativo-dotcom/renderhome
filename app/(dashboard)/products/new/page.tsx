import Link from "next/link";
import ProductForm from "@/components/products/ProductForm";

export const metadata = { title: "Novo produto — RenderAR" };

export default function NewProductPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/products" className="text-sm text-muted hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-2">
          Novo produto
        </h1>
        <p className="text-sm text-muted">
          Cadastre o produto agora; o upload do modelo 3D vem na próxima tela.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
