import { createBrowserClient } from "@supabase/ssr";

// Sem o generic <Database>: o schema completo do supabase-js exige uma forma
// exata (Row/Insert/Update/Relationships) mais rígida do que vale a pena
// manter manualmente nesta fase. A segurança de leitura vem de `.returns<T>()`
// em cada query; a segurança de escrita vem das policies de RLS, não do
// TypeScript.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
