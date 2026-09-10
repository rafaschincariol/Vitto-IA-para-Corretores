import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionStatus } from "@/lib/types";

export type AdminTenantRow = {
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  owner_full_name: string | null;
  owner_email: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  client_count: number;
  policy_count: number;
  active_policy_count: number;
  document_count: number;
  member_count: number;
};

// admin_list_tenants() (supabase/migrations/0010_platform_admin.sql) já
// confere platform_admins internamente e só devolve contagens agregadas de
// clients/policies/documents — nunca as linhas em si, pra nunca expor CPF ou
// nome de cliente final de nenhuma corretora neste painel.
export async function listTenantsForAdmin(supabase: SupabaseClient): Promise<AdminTenantRow[]> {
  const { data, error } = await supabase.rpc("admin_list_tenants");
  if (error || !data) return [];
  return data as AdminTenantRow[];
}
