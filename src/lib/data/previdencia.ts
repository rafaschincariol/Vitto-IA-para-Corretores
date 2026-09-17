import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrevidenciaSimulacao } from "@/lib/types";

export async function getPrevidenciaSimulacoes(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PrevidenciaSimulacao[]> {
  const { data } = await supabase
    .from("previdencia_simulacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<PrevidenciaSimulacao[]>();

  return data ?? [];
}

export async function getPrevidenciaSimulacao(
  supabase: SupabaseClient,
  id: string
): Promise<PrevidenciaSimulacao | null> {
  const { data } = await supabase
    .from("previdencia_simulacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle<PrevidenciaSimulacao>();

  return data ?? null;
}
