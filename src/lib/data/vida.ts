import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VidaSimulacao } from "@/lib/types";

export async function getVidaSimulacoes(supabase: SupabaseClient, tenantId: string): Promise<VidaSimulacao[]> {
  const { data } = await supabase
    .from("vida_simulacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<VidaSimulacao[]>();

  return data ?? [];
}

export async function getVidaSimulacao(supabase: SupabaseClient, id: string): Promise<VidaSimulacao | null> {
  const { data } = await supabase.from("vida_simulacoes").select("*").eq("id", id).maybeSingle<VidaSimulacao>();

  return data ?? null;
}
