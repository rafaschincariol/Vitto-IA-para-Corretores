"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";

// Idempotente por natureza (mesmo se chamado 2x, só regrava true) — quem
// decide DISPARAR o evento de funil "subscription_activated" é o
// FunnelBeacon no cliente, checando a flag antes; isso aqui só evita que
// ele dispare de novo depois.
export async function markPaidConversionTracked(): Promise<void> {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  await supabase.from("tenant_subscriptions").update({ paid_conversion_tracked: true }).eq("tenant_id", tenant.id);
}
