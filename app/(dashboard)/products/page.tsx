import Link from "next/link";

export const metadata = { title: "Produtos — RenderAR" };

export default function ProductsPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto text-center pt-8">
      <h1 className="text-2xl sm:text-3xl font-semibold">Meus produtos</h1>
      <div className="card p-8 space-y-3">
        <p className="text-sm text-muted">
          Em construção. A Fase 2 do RenderAR vai adicionar aqui o CRUD de
          produtos: cadastro, upload do <code>.glb</code>, geração de QR e
          edição de overlays (preço, etiquetas).
        </p>
        <p className="text-sm text-muted">
          Auth, banco e infra estão prontos. Próximo commit traz a interface.
        </p>
        <Link href="/" className="btn btn-secondary inline-flex mt-2">
          Voltar
        </Link>
      </div>
    </div>
  );
}
