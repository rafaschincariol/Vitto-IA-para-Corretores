import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SucessaoSimulacao } from "@/lib/types";

export async function getSucessaoSimulacoes(
  supabase: SupabaseClient,
  tenantId: string
): Promise<SucessaoSimulacao[]> {
  const { data } = await supabase
    .from("sucessao_simulacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<SucessaoSimulacao[]>();

  return data ?? [];
}

export async function getSucessaoSimulacao(
  supabase: SupabaseClient,
  id: string
): Promise<SucessaoSimulacao | null> {
  const { data } = await supabase
    .from("sucessao_simulacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle<SucessaoSimulacao>();

  return data ?? null;
}
