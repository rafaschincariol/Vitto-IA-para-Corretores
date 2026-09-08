"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export type InviteInfo = {
  email: string;
  tenantName: string;
  roleLabel: string;
  valid: boolean;
};

// Leitura pública (sem sessão) do convite pelo token — a RLS de
// tenant_invites libera select por token para qualquer um, exatamente para
// este caso: alguém ainda não autenticado abrindo o link de convite.
export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;

  const supabase = await createSupabaseClient();
  const { data: invite } = await supabase
    .from("tenant_invites")
    .select("email, role, accepted_at, tenant:tenants(name)")
    .eq("token", token)
    .single<{ email: string; role: UserRole; accepted_at: string | null; tenant: { name: string } | null }>();

  if (!invite || !invite.tenant) return null;

  return {
    email: invite.email,
    tenantName: invite.tenant.name,
    roleLabel: ROLE_LABELS[invite.role],
    valid: !invite.accepted_at,
  };
}
