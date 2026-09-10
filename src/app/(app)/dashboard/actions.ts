"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";

export async function dismissOnboardingChecklist(): Promise<{ error: string | null }> {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("tenants")
    .update({ onboarding_dismissed: true })
    .eq("id", tenant.id);

  if (error) return { error: "Não foi possível esconder o checklist." };

  revalidatePath("/dashboard");
  return { error: null };
}

// Marca (ou desmarca, se foi engano) que o corretor já contatou o cliente
// sobre a renovação. Não mexe no status da apólice em si — quando a nova
// apólice chegar, o corretor sobe o PDF normalmente em Documentos e o
// Vitto cadastra a renovação sozinho.
export async function markRenewalContacted(
  policyId: string,
  contacted: boolean
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("policies")
    .update({ renewal_contact_marked_at: contacted ? new Date().toISOString() : null })
    .eq("id", policyId);

  if (error) return { error: "Não foi possível atualizar." };

  revalidatePath("/dashboard");
  return { error: null };
}
