"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/data/auth";
import type { TenantInvite, UserRole } from "@/lib/types";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  role: z.enum(["owner", "member"]),
});

export type InviteFormState = { error: string | null; invite?: TenantInvite };

export async function createTeamInvite(
  _prevState: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile, tenant } = await requireProfile();
  if (profile.role !== "owner") {
    return { error: "Só o Admin pode convidar novos membros." };
  }

  const supabase = await createSupabaseClient();
  const { data: invite, error } = await supabase
    .from("tenant_invites")
    .insert({
      tenant_id: tenant.id,
      email: parsed.data.email,
      role: parsed.data.role as UserRole,
      invited_by: profile.id,
    })
    .select("*")
    .single<TenantInvite>();

  if (error || !invite) return { error: "Não foi possível criar o convite." };

  revalidatePath("/settings");
  return { error: null, invite };
}

export async function revokeTeamInvite(id: string): Promise<{ error: string | null }> {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") return { error: "Só o Admin pode remover convites." };

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("tenant_invites").delete().eq("id", id);

  if (error) return { error: "Não foi possível remover o convite." };

  revalidatePath("/settings");
  return { error: null };
}

// Lacuna real que existia: dava pra convidar e revogar convite pendente,
// mas não tinha como tirar alguém que JÁ estava na equipe (ex: corretor
// que saiu da empresa). O próprio owner não consegue se remover por aqui
// — evita o tenant ficar sem ninguém no comando.
export async function removeTeamMember(memberId: string): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  if (profile.role !== "owner") return { error: "Só o Admin pode remover membros da equipe." };
  if (memberId === profile.id) {
    return { error: "Você não pode se remover da própria equipe por aqui." };
  }

  const supabase = await createSupabaseClient();

  // RLS de profiles não tem policy de delete pra usuário comum de
  // propósito — passa pela Admin API (mesmo padrão do painel de
  // plataforma), sempre atrás da checagem de owner acima. Só apaga o
  // acesso à conta, não os dados que a pessoa criou (clientes/apólices
  // continuam ligados ao tenant via created_by, sem cascade).
  const { data: target } = await supabase
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!target || target.tenant_id !== tenant.id) {
    return { error: "Membro não encontrado nesta corretora." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) return { error: "Não foi possível remover o membro." };

  revalidatePath("/settings");
  return { error: null };
}
