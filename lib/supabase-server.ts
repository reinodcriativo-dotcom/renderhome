import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env, getServiceRoleKey } from "./env";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server Actions.
 * Respeita RLS via cookie de sessão do usuário.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components não podem setar cookies; ignorar.
          }
        },
      },
    },
  );
}

/**
 * Cliente Supabase com service role key. IGNORA RLS.
 * Usar APENAS em rotas de servidor de confiança (ex.: worker mockado).
 */
export function createServiceClient() {
  return createSupabaseJsClient<Database>(
    env.SUPABASE_URL,
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
