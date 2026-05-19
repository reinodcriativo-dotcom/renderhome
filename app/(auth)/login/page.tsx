import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Entrar — RenderEstate 3D" };

export default function LoginPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="text-sm text-muted">
          Acesse seus espaços e capturas 3D.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
