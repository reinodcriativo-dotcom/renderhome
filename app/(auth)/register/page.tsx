import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Criar conta — RenderAR" };

export default function RegisterPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted">
          Crie seu catálogo de produtos em AR em minutos.
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
