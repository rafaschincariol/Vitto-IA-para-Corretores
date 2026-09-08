import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantSubscription } from "@/lib/types";

export async function getTenantSubscription(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantSubscription | null> {
  const { data } = await supabase
    .from("tenant_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle<TenantSubscription>();

  return data;
}

// Sem linha de assinatura (não deveria acontecer, mas trata como travado
// por segurança) ou status fora de "ativo"/"em trial vigente" -> travado.
export function isSubscriptionLocked(subscription: TenantSubscription | null): boolean {
  if (!subscription) return true;
  if (subscription.status === "active") return false;
  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    return new Date(subscription.trial_ends_at) <= new Date();
  }
  return true;
}

export function trialDaysRemaining(subscription: TenantSubscription | null): number {
  if (!subscription?.trial_ends_at) return 0;
  const diffMs = new Date(subscription.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
