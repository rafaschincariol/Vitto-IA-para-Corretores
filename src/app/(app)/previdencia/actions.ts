"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPrevidenciaSimulacao } from "@/lib/data/previdencia";
import { calculatePrevidencia, formatCurrency } from "@/lib/previdencia/calculator";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  client_name: z.string().trim().min(1, "Informe o nome do titular."),
  monthly_contribution: z.number().positive("Informe o valor do aporte mensal."),
  existing_balance: z.number().nonnegative(),
  years_to_retirement: z.number().positive().max(80),
  annual_return_rate: z.number().nonnegative().max(100),
  annual_taxable_income: z.number().nonnegative(),
  files_complete_declaration: z.boolean(),
  plan_type: z.enum(["pgbl", "vgbl"]),
  tax_regime: z.enum(["regressivo", "progressivo"]),
  notes: z.string().trim().nullable(),
});

export type SavePrevidenciaInput = z.infer<typeof saveSchema>;
export type SavePrevidenciaState = { error: string | null; id: string | null };

// O resultado (PrevidenciaResult) nunca vem do cliente — é sempre recalculado
// aqui a partir dos dados brutos, mesmo padrão dos outros simuladores, pra
// garantir que o snapshot salvo é sempre a mesma lógica que gerou a tela que
// o corretor viu.
export async function savePrevidenciaSimulacao(input: SavePrevidenciaInput): Promise<SavePrevidenciaState> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", id: null };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const result = calculatePrevidencia({
    monthlyContribution: parsed.data.monthly_contribution,
    existingBalance: parsed.data.existing_balance,
    yearsToRetirement: parsed.data.years_to_retirement,
    annualReturnRate: parsed.data.annual_return_rate,
    annualTaxableIncome: parsed.data.annual_taxable_income,
    filesCompleteDeclaration: parsed.data.files_complete_declaration,
    planType: parsed.data.plan_type,
    taxRegime: parsed.data.tax_regime,
  });

  const row = {
    tenant_id: tenant.id,
    client_id: parsed.data.client_id,
    client_name: parsed.data.client_name,
    monthly_contribution: parsed.data.monthly_contribution,
    existing_balance: parsed.data.existing_balance,
    years_to_retirement: parsed.data.years_to_retirement,
    annual_return_rate: parsed.data.annual_return_rate,
    annual_taxable_income: parsed.data.annual_taxable_income,
    files_complete_declaration: parsed.data.files_complete_declaration,
    plan_type: parsed.data.plan_type,
    tax_regime: parsed.data.tax_regime,
    notes: parsed.data.notes,
    result,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("previdencia_simulacoes").update(row).eq("id", parsed.data.id);
    if (error) return { error: "Não foi possível salvar a simulação.", id: null };
    revalidatePath("/previdencia");
    revalidatePath(`/previdencia/${parsed.data.id}`);
    return { error: null, id: parsed.data.id };
  }

  const { data, error } = await supabase
    .from("previdencia_simulacoes")
    .insert({ ...row, assigned_to: profile.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: "Não foi possível salvar a simulação.", id: null };

  revalidatePath("/previdencia");
  return { error: null, id: data.id };
}

export async function deletePrevidenciaSimulacao(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("previdencia_simulacoes").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a simulação." };

  revalidatePath("/previdencia");
  return { error: null };
}

export async function createProspectFromPrevidenciaSimulacao(
  simulacaoId: string
): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const simulacao = await getPrevidenciaSimulacao(supabase, simulacaoId);
  if (!simulacao) return { error: "Simulação não encontrada." };

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!stage) return { error: "Nenhuma etapa do funil encontrada." };

  const { futureValue, selected } = simulacao.result;
  const planLabel = simulacao.plan_type === "pgbl" ? "PGBL" : "VGBL";
  const regimeLabel = simulacao.tax_regime === "regressivo" ? "regressivo" : "progressivo";

  const { error } = await supabase.from("prospects").insert({
    tenant_id: tenant.id,
    stage_id: stage.id,
    client_id: simulacao.client_id,
    name: simulacao.client_name,
    estimated_value: futureValue,
    insurance_type: "Previdência Privada",
    notes: `Gerado a partir da simulação de previdência (${planLabel}, regime ${regimeLabel}) — saldo projetado: ${formatCurrency(futureValue)}, líquido de IR estimado: ${formatCurrency(selected.netProceeds)}.`,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível criar a oportunidade no funil." };

  revalidatePath("/pipeline");
  return { error: null };
}
