import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Marca a primeira apólice de um tenant (manual ou via IA) e diz se essa
// chamada foi quem realmente marcou — usado pra disparar o evento de
// funil "first_policy_created" no cliente uma única vez. A cláusula where
// garante que só a primeira chamada concorrente vence.
export async function markFirstPolicyIfNeeded(supabase: SupabaseClient, tenantId: string): Promise<boolean> {
  const { data } = await supabase
    .from("tenants")
    .update({ first_policy_event_sent: true })
    .eq("id", tenantId)
    .eq("first_policy_event_sent", false)
    .select("id");

  return Boolean(data && data.length > 0);
}
