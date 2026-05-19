import Link from "next/link";

export default function ViewerNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-xl font-semibold">Ambiente não encontrado</h1>
        <p className="text-sm text-muted">
          O link pode ter expirado, sido removido ou ainda não estar pronto.
        </p>
        <Link href="/" className="btn btn-primary inline-flex">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
