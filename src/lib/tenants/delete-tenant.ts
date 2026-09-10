import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Apaga permanentemente uma corretora: cancela a assinatura Stripe se
// houver, remove todos os dados (clients/policies/documents/etc. caem em
// cascata pela FK em tenant_id) e apaga o login de todos os membros. Quem
// pode chamar isso já foi conferido antes — pelo RPC (owner do tenant ou
// platform_admins, ver 0012_tenant_deletion.sql), não por esta função.
export async function teardownTenant(
  supabase: SupabaseClient,
  tenantId: string,
  deleteRpc: "delete_own_tenant" | "admin_delete_tenant"
) {
  const [{ data: members }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("id").eq("tenant_id", tenantId),
    supabase
      .from("tenant_subscriptions")
      .select("stripe_subscription_id")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  if (subscription?.stripe_subscription_id) {
    try {
      await getStripeClient().subscriptions.cancel(subscription.stripe_subscription_id);
    } catch {
      // Segue mesmo se falhar — não deixa a exclusão dos dados (o que a
      // LGPD exige) travada por um problema pontual no Stripe. O
      // cancelamento pode ser conferido/refeito manualmente no dashboard.
    }
  }

  const { error } = await supabase.rpc(deleteRpc, { p_tenant_id: tenantId });
  if (error) throw new Error("delete_tenant_failed");

  const admin = createAdminClient();
  await Promise.all((members ?? []).map((m) => admin.auth.admin.deleteUser(m.id)));
}
