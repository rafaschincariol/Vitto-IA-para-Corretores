"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getProtecaoInssSimulacao } from "@/lib/data/protecao-inss";
import { calculateInssGap, formatCurrency } from "@/lib/protecao-inss/calculator";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  client_name: z.string().trim().min(1, "Informe o nome do titular."),
  contribution_salary: z.number().nonnegative(),
  dependents_count: z.number().int().nonnegative(),
  family_monthly_income: z.number().nonnegative(),
  dependency_years: z.number().int().min(1).max(60),
  notes: z.string().trim().nullable(),
});

export type SaveInssGapInput = z.infer<typeof saveSchema>;
export type SaveInssGapState = { error: string | null; id: string | null };

// O resultado (InssGapResult) nunca vem do cliente — é sempre recalculado
// aqui a partir dos dados brutos, mesmo padrão de sucessao/actions.ts, pra
// garantir que o snapshot salvo é sempre a mesma lógica que gerou a tela que
// o corretor viu.
export async function saveProtecaoInssSimulacao(input: SaveInssGapInput): Promise<SaveInssGapState> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", id: null };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const result = calculateInssGap({
    contributionSalary: parsed.data.contribution_salary,
    dependentsCount: parsed.data.dependents_count,
    familyMonthlyIncome: parsed.data.family_monthly_income,
    dependencyYears: parsed.data.dependency_years,
  });

  const row = {
    tenant_id: tenant.id,
    client_id: parsed.data.client_id,
    client_name: parsed.data.client_name,
    contribution_salary: parsed.data.contribution_salary,
    dependents_count: parsed.data.dependents_count,
    family_monthly_income: parsed.data.family_monthly_income,
    dependency_years: parsed.data.dependency_years,
    notes: parsed.data.notes,
    result,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("protecao_inss_simulacoes").update(row).eq("id", parsed.data.id);
    if (error) return { error: "Não foi possível salvar a simulação.", id: null };
    revalidatePath("/protecao-inss");
    revalidatePath(`/protecao-inss/${parsed.data.id}`);
    return { error: null, id: parsed.data.id };
  }

  const { data, error } = await supabase
    .from("protecao_inss_simulacoes")
    .insert({ ...row, assigned_to: profile.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: "Não foi possível salvar a simulação.", id: null };

  revalidatePath("/protecao-inss");
  return { error: null, id: data.id };
}

export async function deleteProtecaoInssSimulacao(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("protecao_inss_simulacoes").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a simulação." };

  revalidatePath("/protecao-inss");
  return { error: null };
}

export async function createProspectFromInssSimulacao(simulacaoId: string): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const simulacao = await getProtecaoInssSimulacao(supabase, simulacaoId);
  if (!simulacao) return { error: "Simulação não encontrada." };

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!stage) return { error: "Nenhuma etapa do funil encontrada." };

  const suggested = simulacao.result.suggestedCoverage;

  const { error } = await supabase.from("prospects").insert({
    tenant_id: tenant.id,
    stage_id: stage.id,
    client_id: simulacao.client_id,
    name: simulacao.client_name,
    estimated_value: suggested,
    insurance_type: "Seguro de Vida",
    notes: `Gerado a partir da simulação de gap de proteção previdenciária — capital sugerido: ${formatCurrency(suggested)} (gap mensal de ${formatCurrency(simulacao.result.monthlyGap)} caso o INSS pague a pensão por morte hoje).`,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível criar a oportunidade no funil." };

  revalidatePath("/pipeline");
  return { error: null };
}
