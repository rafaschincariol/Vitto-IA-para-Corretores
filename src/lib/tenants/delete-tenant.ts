import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Agenda a exclusão de uma corretora (LGPD art. 18, VI) com 30 dias de
// carência em vez de apagar na hora — evita perda de dados irreversível
// por engano e dá tempo do admin cancelar caso o pedido tenha sido um
// erro. Cancela a assinatura Stripe imediatamente (a cobrança para na
// hora, mesmo durante a carência). Quem pode chamar isso já foi conferido
// antes, pelo RPC (owner do tenant ou platform_admins).
export async function scheduleTenantDeletion(
  supabase: SupabaseClient,
  tenantId: string,
  scheduleRpc: "schedule_own_tenant_deletion" | "admin_schedule_tenant_deletion"
) {
  const { data: subscription } = await supabase
    .from("tenant_subscriptions")
    .select("stripe_subscription_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (subscription?.stripe_subscription_id) {
    try {
      await getStripeClient().subscriptions.cancel(subscription.stripe_subscription_id);
    } catch {
      // Segue mesmo se falhar — não deixa o agendamento da exclusão
      // travado por um problema pontual no Stripe. Pode ser cancelado
      // manualmente no dashboard se precisar.
    }
  }

  const { error } = await supabase.rpc(scheduleRpc, { p_tenant_id: tenantId });
  if (error) throw new Error("schedule_deletion_failed");
}

// Exclusão definitiva de verdade — chamada só pelo cron
// (src/app/api/cron/purge-tenants/route.ts) depois que a carência de 30
// dias vence. Usa a service_role key direto: quem autoriza essa chamada é
// o segredo do cron (CRON_SECRET), não uma sessão de usuário, então não
// faz sentido passar por RLS/RPC aqui.
export async function purgeTenant(tenantId: string) {
  const admin = createAdminClient();

  const { data: members } = await admin.from("profiles").select("id").eq("tenant_id", tenantId);

  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) throw new Error("purge_tenant_failed");

  await Promise.all((members ?? []).map((m) => admin.auth.admin.deleteUser(m.id)));
}
