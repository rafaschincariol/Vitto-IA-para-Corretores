import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GrowthLead, GrowthOutreachDraft } from "@/lib/types";

export async function getGrowthLeads(supabase: SupabaseClient): Promise<GrowthLead[]> {
  const { data } = await supabase
    .from("growth_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<GrowthLead[]>();

  return data ?? [];
}

export async function getGrowthLead(supabase: SupabaseClient, id: string): Promise<GrowthLead | null> {
  const { data } = await supabase.from("growth_leads").select("*").eq("id", id).maybeSingle<GrowthLead>();
  return data ?? null;
}

export async function getDraftsForLead(supabase: SupabaseClient, leadId: string): Promise<GrowthOutreachDraft[]> {
  const { data } = await supabase
    .from("growth_outreach_drafts")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .returns<GrowthOutreachDraft[]>();

  return data ?? [];
}

export type PendingDraftRow = GrowthOutreachDraft & {
  lead: Pick<GrowthLead, "id" | "contact_name" | "email" | "company_name" | "phone">;
};

export async function getPendingDrafts(supabase: SupabaseClient): Promise<PendingDraftRow[]> {
  const { data } = await supabase
    .from("growth_outreach_drafts")
    .select("*, lead:growth_leads(id, contact_name, email, company_name, phone)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .returns<PendingDraftRow[]>();

  return data ?? [];
}

export async function getApprovedDrafts(supabase: SupabaseClient): Promise<PendingDraftRow[]> {
  const { data } = await supabase
    .from("growth_outreach_drafts")
    .select("*, lead:growth_leads(id, contact_name, email, company_name, phone)")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: true })
    .returns<PendingDraftRow[]>();

  return data ?? [];
}

export type GrowthStats = {
  totalLeads: number;
  byStage: Record<string, number>;
  pendingReview: number;
  sent: number;
};

export async function getGrowthStats(supabase: SupabaseClient): Promise<GrowthStats> {
  const [{ data: leads }, { count: pendingReview }, { count: sent }] = await Promise.all([
    supabase.from("growth_leads").select("stage"),
    supabase.from("growth_outreach_drafts").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("growth_outreach_drafts").select("id", { count: "exact", head: true }).eq("status", "sent"),
  ]);

  const byStage: Record<string, number> = {};
  for (const row of leads ?? []) {
    const stage = (row as { stage: string }).stage;
    byStage[stage] = (byStage[stage] ?? 0) + 1;
  }

  return {
    totalLeads: leads?.length ?? 0,
    byStage,
    pendingReview: pendingReview ?? 0,
    sent: sent ?? 0,
  };
}
