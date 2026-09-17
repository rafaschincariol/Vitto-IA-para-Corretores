"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPrestamistaSimulacao } from "@/lib/data/prestamista";
import { calculatePrestamista, formatCurrency } from "@/lib/prestamista/calculator";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  client_name: z.string().trim().min(1, "Informe o nome do titular."),
  financed_amount: z.number().positive("Informe o valor financiado."),
  annual_interest_rate: z.number().nonnegative().max(100),
  term_years: z.number().int().min(1).max(50),
  amortization_system: z.enum(["sac", "price"]),
  years_elapsed: z.number().nonnegative(),
  notes: z.string().trim().nullable(),
});

export type SavePrestamistaInput = z.infer<typeof saveSchema>;
export type SavePrestamistaState = { error: string | null; id: string | null };

// O resultado (PrestamistaResult) nunca vem do cliente — é sempre recalculado
// aqui a partir dos dados brutos, mesmo padrão dos outros três simuladores,
// pra garantir que o snapshot salvo é sempre a mesma lógica que gerou a tela
// que o corretor viu.
export async function savePrestamistaSimulacao(input: SavePrestamistaInput): Promise<SavePrestamistaState> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", id: null };
  }
  if (parsed.data.years_elapsed >= parsed.data.term_years) {
    return { error: "Anos já pagos não pode ser maior ou igual ao prazo total.", id: null };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const result = calculatePrestamista({
    financedAmount: parsed.data.financed_amount,
    annualInterestRate: parsed.data.annual_interest_rate,
    termYears: parsed.data.term_years,
    amortizationSystem: parsed.data.amortization_system,
    yearsElapsed: parsed.data.years_elapsed,
  });

  const row = {
    tenant_id: tenant.id,
    client_id: parsed.data.client_id,
    client_name: parsed.data.client_name,
    financed_amount: parsed.data.financed_amount,
    annual_interest_rate: parsed.data.annual_interest_rate,
    term_years: parsed.data.term_years,
    amortization_system: parsed.data.amortization_system,
    years_elapsed: parsed.data.years_elapsed,
    notes: parsed.data.notes,
    result,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("prestamista_simulacoes").update(row).eq("id", parsed.data.id);
    if (error) return { error: "Não foi possível salvar a simulação.", id: null };
    revalidatePath("/prestamista");
    revalidatePath(`/prestamista/${parsed.data.id}`);
    return { error: null, id: parsed.data.id };
  }

  const { data, error } = await supabase
    .from("prestamista_simulacoes")
    .insert({ ...row, assigned_to: profile.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: "Não foi possível salvar a simulação.", id: null };

  revalidatePath("/prestamista");
  return { error: null, id: data.id };
}

export async function deletePrestamistaSimulacao(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("prestamista_simulacoes").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a simulação." };

  revalidatePath("/prestamista");
  return { error: null };
}

export async function createProspectFromPrestamistaSimulacao(
  simulacaoId: string
): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const simulacao = await getPrestamistaSimulacao(supabase, simulacaoId);
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
    insurance_type: "Seguro Prestamista",
    notes: `Gerado a partir da simulação de seguro prestamista — saldo devedor hoje: ${formatCurrency(suggested)}.`,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível criar a oportunidade no funil." };

  revalidatePath("/pipeline");
  return { error: null };
}
