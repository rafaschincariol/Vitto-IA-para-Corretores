import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage, ProspectWithStage } from "@/lib/types";

const DEFAULT_STAGES: { name: string; is_won?: boolean; is_lost?: boolean }[] = [
  { name: "Prospect" },
  { name: "Contato Feito" },
  { name: "Proposta Enviada" },
  { name: "Em Negociação" },
  { name: "Ganho", is_won: true },
  { name: "Perdido", is_lost: true },
];

// Toda tenant começa sem etapas — na primeira visita a /pipeline criamos as
// 6 etapas padrão (não usamos o trigger de signup pra não mexer num fluxo
// sensível). Chamadas seguintes só leem, pois a tenant já tem etapas.
export async function getOrSeedPipelineStages(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PipelineStage[]> {
  const { data: existing } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .returns<PipelineStage[]>();

  if (existing && existing.length > 0) return existing;

  const { data: seeded, error } = await supabase
    .from("pipeline_stages")
    .insert(
      DEFAULT_STAGES.map((stage, index) => ({
        tenant_id: tenantId,
        name: stage.name,
        position: index,
        is_won: stage.is_won ?? false,
        is_lost: stage.is_lost ?? false,
      }))
    )
    .select("*")
    .returns<PipelineStage[]>();

  if (error || !seeded) return [];
  return seeded.sort((a, b) => a.position - b.position);
}

export async function getProspectsBoard(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ProspectWithStage[]> {
  const { data } = await supabase
    .from("prospects")
    .select("*, stage:pipeline_stages(id, name, is_won, is_lost)")
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .returns<ProspectWithStage[]>();

  return data ?? [];
}

export type PipelineAnalytics = {
  stageOccupancy: { stageId: string; stageName: string; count: number; isWon: boolean; isLost: boolean }[];
  totalProspects: number;
  totalPipelineValue: number;
  wonCount: number;
  lostCount: number;
  overallConversionRate: number;
  stageFunnel: { stageName: string; reachedCount: number; conversionFromPrevious: number | null }[];
  avgDaysToClose: number | null;
};

type StageHistoryRow = {
  prospect_id: string;
  to_stage_id: string | null;
  to_stage_name: string;
  changed_at: string;
};

// Todo o cálculo de analytics roda a partir de dado real do banco (contagem
// atual por etapa + histórico de mudança de etapa) — nunca inventado, pra
// alimentar tanto a tela de analytics quanto os insights de IA (que recebem
// este mesmo objeto como contexto confiável).
export async function getPipelineAnalytics(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PipelineAnalytics> {
  const [{ data: stages }, { data: prospects }, { data: history }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, position, is_won, is_lost")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .returns<Pick<PipelineStage, "id" | "name" | "position" | "is_won" | "is_lost">[]>(),
    supabase
      .from("prospects")
      .select("id, stage_id, estimated_value, created_at")
      .eq("tenant_id", tenantId)
      .returns<{ id: string; stage_id: string; estimated_value: number | null; created_at: string }[]>(),
    supabase
      .from("prospect_stage_history")
      .select("prospect_id, to_stage_id, to_stage_name, changed_at")
      .eq("tenant_id", tenantId)
      .order("changed_at", { ascending: true })
      .returns<StageHistoryRow[]>(),
  ]);

  const stageList = stages ?? [];
  const prospectList = prospects ?? [];
  const historyList = history ?? [];

  const stageOccupancy = stageList.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    count: prospectList.filter((p) => p.stage_id === stage.id).length,
    isWon: stage.is_won,
    isLost: stage.is_lost,
  }));

  const wonStageIds = new Set(stageList.filter((s) => s.is_won).map((s) => s.id));
  const lostStageIds = new Set(stageList.filter((s) => s.is_lost).map((s) => s.id));
  const wonCount = prospectList.filter((p) => wonStageIds.has(p.stage_id)).length;
  const lostCount = prospectList.filter((p) => lostStageIds.has(p.stage_id)).length;
  const overallConversionRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  const totalPipelineValue = prospectList.reduce((sum, p) => sum + (p.estimated_value ?? 0), 0);

  // Funil por etapa: quantos prospects distintos já passaram por cada etapa
  // (via histórico), na ordem de "position" — dá a taxa de queda etapa a
  // etapa mesmo depois que o prospect já avançou pra frente.
  const reachedByStage = new Map<string, Set<string>>();
  for (const entry of historyList) {
    if (!entry.to_stage_id) continue;
    if (!reachedByStage.has(entry.to_stage_id)) reachedByStage.set(entry.to_stage_id, new Set());
    reachedByStage.get(entry.to_stage_id)!.add(entry.prospect_id);
  }
  // Prospects sem nenhuma entrada de histórico (criados direto numa etapa,
  // sem troca) ainda contam como tendo alcançado a etapa atual.
  for (const p of prospectList) {
    if (!reachedByStage.has(p.stage_id)) reachedByStage.set(p.stage_id, new Set());
    reachedByStage.get(p.stage_id)!.add(p.id);
  }

  let previousReached: number | null = null;
  const stageFunnel = stageList.map((stage) => {
    const reachedCount = reachedByStage.get(stage.id)?.size ?? 0;
    const conversionFromPrevious =
      previousReached === null || previousReached === 0 ? null : Math.round((reachedCount / previousReached) * 100);
    previousReached = reachedCount;
    return { stageName: stage.name, reachedCount, conversionFromPrevious };
  });

  // Tempo médio até fechar: primeira transição pra uma etapa "ganho" de cada
  // prospect, menos a data de criação dele.
  const wonTransitions = historyList.filter((h) => h.to_stage_id && wonStageIds.has(h.to_stage_id));
  const firstWonByProspect = new Map<string, string>();
  for (const entry of wonTransitions) {
    if (!firstWonByProspect.has(entry.prospect_id)) firstWonByProspect.set(entry.prospect_id, entry.changed_at);
  }
  const prospectById = new Map(prospectList.map((p) => [p.id, p]));
  const daysToClose: number[] = [];
  for (const [prospectId, wonAt] of firstWonByProspect) {
    const prospect = prospectById.get(prospectId);
    if (!prospect) continue;
    const days = (new Date(wonAt).getTime() - new Date(prospect.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days >= 0) daysToClose.push(days);
  }
  const avgDaysToClose =
    daysToClose.length > 0 ? Math.round(daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length) : null;

  return {
    stageOccupancy,
    totalProspects: prospectList.length,
    totalPipelineValue,
    wonCount,
    lostCount,
    overallConversionRate,
    stageFunnel,
    avgDaysToClose,
  };
}

// Texto plano do snapshot de analytics, usado tanto pelos insights de IA
// (src/lib/ai/pipeline-insights.ts) quanto pelo contexto do assistente de
// chat (src/lib/data/assistant-context.ts) — mesma fonte de números pros
// dois, sem duplicar a formatação.
export function formatPipelineAnalytics(analytics: PipelineAnalytics): string {
  const lines = [
    `Total de prospects no funil: ${analytics.totalProspects}.`,
    `Valor total estimado em negociação: R$ ${analytics.totalPipelineValue.toFixed(2)}.`,
    `Ganhos: ${analytics.wonCount}. Perdidos: ${analytics.lostCount}. Taxa de conversão geral (ganho / (ganho+perdido)): ${analytics.overallConversionRate}%.`,
    analytics.avgDaysToClose !== null
      ? `Tempo médio até fechar (criação → etapa de ganho): ${analytics.avgDaysToClose} dia(s).`
      : "Ainda não há prospects fechados como ganhos suficientes para calcular tempo médio até fechar.",
    "",
    "Pessoas por etapa (ocupação atual):",
    ...analytics.stageOccupancy.map((s) => `- ${s.stageName}: ${s.count} prospect(s)${s.isWon ? " (etapa de ganho)" : s.isLost ? " (etapa de perda)" : ""}`),
    "",
    "Funil de conversão por etapa (quantos prospects distintos já alcançaram cada etapa, e taxa de avanço vindo da etapa anterior):",
    ...analytics.stageFunnel.map(
      (s) =>
        `- ${s.stageName}: ${s.reachedCount} prospect(s) já alcançaram${s.conversionFromPrevious !== null ? ` (${s.conversionFromPrevious}% vindos da etapa anterior)` : ""}`
    ),
  ];
  return lines.join("\n");
}
