import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Carrega .env.local primeiro (mesma convencao que o Next.js usa),
// e depois .env como fallback.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`\n[render] Falta variavel ${name} no .env.local`);
    process.exit(1);
  }
  return v;
}

export function getSupabase(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export function getBucket(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_BUCKET?.trim() || "spaces";
}

export function getMeshroomPath(): string {
  return required("MESHROOM_PATH");
}
