"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { requiredIsoDateSchema, optionalMoneySchema } from "@/lib/validators";
import { markFirstPolicyIfNeeded } from "@/lib/funnel-events";

const policySchema = z
  .object({
    client_id: z.string().uuid("Selecione um cliente."),
    insurer: z.string().trim().min(1, "Informe a seguradora."),
    policy_number: z.string().trim().min(1, "Informe o número da apólice."),
    policy_type: z.string().trim().optional().transform((v) => v || null),
    premium_total: optionalMoneySchema,
    start_date: requiredIsoDateSchema,
    end_date: requiredIsoDateSchema,
    status: z.enum(["ativo", "em_renovacao", "cancelado", "vencido"]),
    notes: z.string().trim().optional().transform((v) => v || null),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "A data de fim precisa ser igual ou posterior à data de início.",
    path: ["end_date"],
  });

export type PolicyFormState = { error: string | null; firstPolicy?: boolean };

export async function createPolicyRecord(
  _prevState: PolicyFormState,
  formData: FormData
): Promise<PolicyFormState> {
  const parsed = policySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { error } = await supabase.from("policies").insert({
    ...parsed.data,
    tenant_id: tenant.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível salvar a apólice." };

  const firstPolicy = await markFirstPolicyIfNeeded(supabase, tenant.id);

  revalidatePath("/policies");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return { error: null, firstPolicy };
}

export async function updatePolicyRecord(
  id: string,
  clientId: string,
  _prevState: PolicyFormState,
  formData: FormData
): Promise<PolicyFormState> {
  const parsed = policySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("policies").update(parsed.data).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a apólice." };

  revalidatePath("/policies");
  revalidatePath(`/clients/${clientId}`);
  return { error: null };
}

export async function deletePolicyRecord(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("policies").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a apólice." };

  revalidatePath("/policies");
  revalidatePath("/clients", "layout");
  return { error: null };
}
