import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Criar conta — RenderEstate 3D" };

export default function RegisterPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted">
          Comece a capturar ambientes 3D em minutos.
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
