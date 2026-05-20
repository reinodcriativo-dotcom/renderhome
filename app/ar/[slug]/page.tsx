import Link from "next/link";

export const metadata = { title: "Experiência AR — RenderAR" };

export default async function ARPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          Render<span className="text-primary">AR</span>
        </h1>
        <div className="card p-6 space-y-2">
          <p className="text-sm">Slug do produto: <code>{slug}</code></p>
          <p className="text-sm text-muted">
            Experiência de realidade aumentada em construção. A Fase 4 vai
            ativar a câmera, rastrear o QR e sobrepor o modelo 3D.
          </p>
        </div>
        <Link href="/" className="btn btn-secondary inline-flex">
          Voltar
        </Link>
      </div>
    </main>
  );
}
