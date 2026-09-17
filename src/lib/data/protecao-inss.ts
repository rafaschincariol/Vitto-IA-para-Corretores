import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProtecaoInssSimulacao } from "@/lib/types";

export async function getProtecaoInssSimulacoes(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ProtecaoInssSimulacao[]> {
  const { data } = await supabase
    .from("protecao_inss_simulacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<ProtecaoInssSimulacao[]>();

  return data ?? [];
}

export async function getProtecaoInssSimulacao(
  supabase: SupabaseClient,
  id: string
): Promise<ProtecaoInssSimulacao | null> {
  const { data } = await supabase
    .from("protecao_inss_simulacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProtecaoInssSimulacao>();

  return data ?? null;
}
