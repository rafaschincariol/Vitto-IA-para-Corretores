"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";

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
