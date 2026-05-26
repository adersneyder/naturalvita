// lib/quiz/_internal/supabase.ts
// Clientes Supabase autocontenidos para el módulo del quiz.
// No dependen de helpers del repo: usan las variables de entorno estándar
// que el proyecto NaturalVita ya tiene configuradas en Vercel.
//
// - quizPublicClient(): para lectura pública (necesidades + resolve_quiz).
//   Usa la anon key. Respeta RLS.
// - quizServiceClient(): para escritura/admin (guardar resultados, disparar
//   recálculo). Usa la service role key. Solo se invoca desde server actions
//   ya protegidas. NUNCA se importa en componentes cliente.
//
// Si en el futuro unificas con el cliente Supabase central del repo, basta
// reemplazar estas dos funciones por las del repo; el resto del módulo no cambia.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[quiz] Falta la variable de entorno ${name}. Configúrala en Vercel (y en .env.local para desarrollo).`,
    );
  }
  return value;
}

/** Cliente de lectura pública (anon, respeta RLS). Para el quiz del Home. */
export function quizPublicClient(): SupabaseClient {
  return createClient(assertEnv(URL, "NEXT_PUBLIC_SUPABASE_URL"), assertEnv(ANON, "NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
}

/** Cliente de servicio (service role). Solo en server actions protegidas. */
export function quizServiceClient(): SupabaseClient {
  return createClient(assertEnv(URL, "NEXT_PUBLIC_SUPABASE_URL"), assertEnv(SERVICE, "SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}
