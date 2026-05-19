function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Veja .env.example e crie um .env.local (ou configure no Vercel).`,
    );
  }
  return value;
}

/**
 * Acesso lazy às variáveis de ambiente.
 *
 * Por que getters em vez de constantes?
 *
 * Durante `next build` o Next.js importa todos os route handlers para coletar
 * metadados ("Collecting page data"). Se o módulo lançar erro na importação
 * (por exemplo, quando uma variável ainda não foi configurada na Vercel),
 * o build falha antes mesmo do app rodar. Com getters, o erro só acontece
 * em runtime, quando a variável é de fato acessada — comportamento esperado.
 */
export const env = {
  get SUPABASE_URL() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get SUPABASE_ANON_KEY() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get SUPABASE_BUCKET() {
    return process.env.NEXT_PUBLIC_SUPABASE_BUCKET?.trim() || "spaces";
  },
  get APP_URL() {
    return (
      process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
    );
  },
};

export function getServiceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
