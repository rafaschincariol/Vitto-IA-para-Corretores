"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getVidaSimulacao } from "@/lib/data/vida";
import { calculateVidaNeed, formatCurrency } from "@/lib/vida/calculator";

const debtSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1, "Descreva a dívida."),
  balance: z.number().nonnegative(),
  payoffYears: z.number().int().nonnegative(),
  annualInterestRate: z.number().nonnegative().max(100).optional(),
  amortizationType: z.enum(["linear", "sac", "price"]).optional(),
});

const childSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Informe o nome do filho."),
  currentAge: z.number().int().nonnegative(),
  collegeAnnualCost: z.number().nonnegative(),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  client_name: z.string().trim().min(1, "Informe o nome do titular."),
  monthly_income: z.number().nonnegative(),
  dependency_years: z.number().int().min(1).max(40),
  debts: z.array(debtSchema),
  children: z.array(childSchema),
  current_investments: z.number().nonnegative(),
  monthly_contribution: z.number().nonnegative(),
  existing_insurance: z.number().nonnegative(),
  real_return_rate: z.number().min(0).max(0.3),
  final_costs: z.number().nonnegative(),
  notes: z.string().trim().nullable(),
});

export type SaveVidaInput = z.infer<typeof saveSchema>;
export type SaveVidaState = { error: string | null; id: string | null };

// O resultado (VidaResult) nunca vem do cliente — é sempre recalculado aqui a
// partir dos dados brutos, mesmo padrão de sucessao/actions.ts e
// protecao-inss/actions.ts, pra garantir que o snapshot salvo é sempre a
// mesma lógica que gerou a tela que o corretor viu.
export async function saveVidaSimulacao(input: SaveVidaInput): Promise<SaveVidaState> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", id: null };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const result = calculateVidaNeed({
    monthlyIncome: parsed.data.monthly_income,
    dependencyYears: parsed.data.dependency_years,
    debts: parsed.data.debts,
    children: parsed.data.children,
    currentInvestments: parsed.data.current_investments,
    monthlyContribution: parsed.data.monthly_contribution,
    existingInsurance: parsed.data.existing_insurance,
    realReturnRate: parsed.data.real_return_rate,
    finalCosts: parsed.data.final_costs,
  });

  const row = {
    tenant_id: tenant.id,
    client_id: parsed.data.client_id,
    client_name: parsed.data.client_name,
    monthly_income: parsed.data.monthly_income,
    dependency_years: parsed.data.dependency_years,
    debts: parsed.data.debts,
    children: parsed.data.children,
    current_investments: parsed.data.current_investments,
    monthly_contribution: parsed.data.monthly_contribution,
    existing_insurance: parsed.data.existing_insurance,
    real_return_rate: parsed.data.real_return_rate,
    final_costs: parsed.data.final_costs,
    notes: parsed.data.notes,
    result,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("vida_simulacoes").update(row).eq("id", parsed.data.id);
    if (error) return { error: "Não foi possível salvar a simulação.", id: null };
    revalidatePath("/vida");
    revalidatePath(`/vida/${parsed.data.id}`);
    return { error: null, id: parsed.data.id };
  }

  const { data, error } = await supabase
    .from("vida_simulacoes")
    .insert({ ...row, assigned_to: profile.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: "Não foi possível salvar a simulação.", id: null };

  revalidatePath("/vida");
  return { error: null, id: data.id };
}

export async function deleteVidaSimulacao(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("vida_simulacoes").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a simulação." };

  revalidatePath("/vida");
  return { error: null };
}

export async function createProspectFromVidaSimulacao(simulacaoId: string): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const simulacao = await getVidaSimulacao(supabase, simulacaoId);
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
    notes: `Gerado a partir da simulação de necessidade de seguro de vida (DIME) — capital sugerido: ${formatCurrency(suggested)}.`,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível criar a oportunidade no funil." };

  revalidatePath("/pipeline");
  return { error: null };
}
