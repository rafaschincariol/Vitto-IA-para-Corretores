"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { scheduleTenantDeletion } from "@/lib/tenants/delete-tenant";

const tenantNameSchema = z.string().trim().min(1, "Informe um nome.");

export type SettingsFormState = { error: string | null };

export async function updateTenantName(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const parsed = tenantNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };

  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  // A policy "tenants_update_owner" garante que só o owner do tenant
  // consegue atualizar esta linha — membros comuns recebem 0 linhas afetadas.
  const { error, count } = await supabase
    .from("tenants")
    .update({ name: parsed.data }, { count: "exact" })
    .eq("id", tenant.id);

  if (error) return { error: "Não foi possível salvar." };
  if (count === 0) return { error: "Apenas o owner da corretora pode alterar este nome." };

  revalidatePath("/settings");
  // O nome do tenant também aparece no shell (app)/layout.tsx (sidebar) —
  // revalida o layout, não só a página, para refletir a mudança na hora.
  revalidatePath("/settings", "layout");
  return { error: null };
}

export type DeleteAccountState = { error: string | null };

// Encerramento de conta pelo próprio owner (LGPD art. 18, VI). Exige
// digitar o nome exato da corretora — mesmo padrão de confirmação de ações
// destrutivas usado no reset de senha do painel admin, mas mais forte
// porque aqui não tem como desfazer nem repassar senha nova depois.
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const confirmName = String(formData.get("confirm_name") ?? "").trim();
  const { profile, tenant } = await requireProfile();

  if (profile.role !== "owner") {
    return { error: "Só o Admin da corretora pode encerrar a conta." };
  }
  if (confirmName !== tenant.name) {
    return { error: "Digite o nome da corretora exatamente como aparece, para confirmar." };
  }

  const supabase = await createSupabaseClient();
  try {
    await scheduleTenantDeletion(supabase, tenant.id, "schedule_own_tenant_deletion");
  } catch {
    return { error: "Não foi possível encerrar a conta. Tente novamente ou fale com o suporte." };
  }

  await supabase.auth.signOut();
  redirect("/login?deletion_scheduled=1");
}
