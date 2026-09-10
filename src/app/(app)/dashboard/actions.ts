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
