"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPipelineAnalytics } from "@/lib/data/pipeline";
import { generatePipelineInsights, type PipelineInsights } from "@/lib/ai/pipeline-insights";
import { logActivity } from "@/lib/log-activity";

export async function getPipelineInsightsAction(): Promise<{ insights: PipelineInsights | null; error: string | null }> {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  try {
    const analytics = await getPipelineAnalytics(supabase, tenant.id);
    if (analytics.totalProspects === 0) {
      return { insights: null, error: "Cadastre alguns prospects no funil antes de gerar insights." };
    }
    const insights = await generatePipelineInsights(analytics);
    return { insights, error: null };
  } catch (err) {
    await logActivity(supabase, {
      tenantId: tenant.id,
      category: "sistema",
      eventType: "pipeline_insights_failed",
      level: "erro",
      message: "Falha ao gerar insights de IA do funil de vendas.",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return { insights: null, error: "Não foi possível gerar os insights agora. Tente novamente em instantes." };
  }
}
