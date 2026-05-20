import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/products");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Render<span className="text-primary">AR</span>
          </h1>
          <p className="text-muted">
            Crie experiências de realidade aumentada para seus produtos. Suba um
            modelo 3D, gere um QR e seus clientes veem o produto flutuando
            direto da câmera do celular.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/register" className="btn btn-primary w-full">
            Criar conta grátis
          </Link>
          <Link href="/login" className="btn btn-secondary w-full">
            Entrar
          </Link>
        </div>

        <p className="text-xs text-muted pt-6">
          Web app mobile-first. Funciona em qualquer celular.
        </p>
      </div>
    </main>
  );
}
