import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrestamistaSimulacao } from "@/lib/types";

export async function getPrestamistaSimulacoes(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PrestamistaSimulacao[]> {
  const { data } = await supabase
    .from("prestamista_simulacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<PrestamistaSimulacao[]>();

  return data ?? [];
}

export async function getPrestamistaSimulacao(
  supabase: SupabaseClient,
  id: string
): Promise<PrestamistaSimulacao | null> {
  const { data } = await supabase
    .from("prestamista_simulacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle<PrestamistaSimulacao>();

  return data ?? null;
}
