import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client com a service role key — bypassa RLS e dá acesso à Admin API do
// Supabase Auth (ex: redefinir a senha de outro usuário, algo que não tem
// como fazer via RPC SECURITY DEFINER porque não é uma escrita em tabela,
// é uma operação do próprio serviço de Auth). Segundo lugar do projeto que
// usa essa chave — o primeiro é o webhook do Stripe (ver comentário em
// supabase/migrations/0008_billing.sql). Só deve ser instanciado dentro de
// server actions que já conferiram platform_admins antes de chamar isso;
// nunca importar em código que roda no client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
