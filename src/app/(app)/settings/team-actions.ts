"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
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
