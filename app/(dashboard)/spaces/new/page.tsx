import Link from "next/link";
import SpaceForm from "@/components/spaces/SpaceForm";

export const metadata = { title: "Novo espaço — RenderEstate 3D" };

export default function NewSpacePage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/spaces" className="text-sm text-muted hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-2">
          Novo espaço
        </h1>
        <p className="text-sm text-muted">
          Comece criando um espaço para o ambiente que vai capturar.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <SpaceForm mode="create" />
      </div>
    </div>
  );
}
