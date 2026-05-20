import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Entrar — RenderAR" };

export default function LoginPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="text-sm text-muted">
          Acesse seu catálogo de produtos em AR.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
