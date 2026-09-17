"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getSucessaoSimulacao } from "@/lib/data/sucessao";
import { calculateSuccessionCosts, formatCurrency } from "@/lib/sucessao/calculator";
import { AssetType, type Asset, type MaritalRegime } from "@/lib/sucessao/types";
import { extractSucessaoAssets } from "@/lib/ai/extract-sucessao-assets";

const assetSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1, "Descreva o bem."),
  type: z.nativeEnum(AssetType),
  value: z.number().nonnegative("Valor não pode ser negativo."),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  client_name: z.string().trim().min(1, "Informe o nome do titular."),
  assets: z.array(assetSchema).min(1, "Adicione ao menos um bem."),
  marital_regime: z.enum(["solteiro", "comunhao_parcial", "comunhao_universal", "separacao_total"]),
  existing_protection: z.number().nonnegative(),
  monthly_maintenance: z.number().nonnegative(),
  custom_duration_months: z.number().int().min(1).max(60),
  scenario: z.enum(["min", "max"]),
  notes: z.string().trim().nullable(),
});

export type SaveSucessaoInput = z.infer<typeof saveSchema>;
export type SaveSucessaoState = { error: string | null; id: string | null };

// O resultado (SimulationResult) nunca vem do cliente — é sempre recalculado
// aqui a partir dos dados brutos (bens, regime de bens, proteção já
// contratada), pra garantir que o snapshot salvo é sempre a mesma lógica que
// gerou a tela que o corretor viu, nunca um JSON que o cliente poderia
// adulterar.
export async function saveSucessaoSimulacao(input: SaveSucessaoInput): Promise<SaveSucessaoState> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", id: null };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const result = calculateSuccessionCosts({
    assets: parsed.data.assets as Asset[],
    maritalRegime: parsed.data.marital_regime as MaritalRegime,
    existingProtection: parsed.data.existing_protection,
    monthlyMaintenance: parsed.data.monthly_maintenance,
  });

  const row = {
    tenant_id: tenant.id,
    client_id: parsed.data.client_id,
    client_name: parsed.data.client_name,
    assets: parsed.data.assets,
    marital_regime: parsed.data.marital_regime,
    existing_protection: parsed.data.existing_protection,
    monthly_maintenance: parsed.data.monthly_maintenance,
    custom_duration_months: parsed.data.custom_duration_months,
    scenario: parsed.data.scenario,
    notes: parsed.data.notes,
    result,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("sucessao_simulacoes").update(row).eq("id", parsed.data.id);
    if (error) return { error: "Não foi possível salvar a simulação.", id: null };
    revalidatePath("/sucessao");
    revalidatePath(`/sucessao/${parsed.data.id}`);
    return { error: null, id: parsed.data.id };
  }

  const { data, error } = await supabase
    .from("sucessao_simulacoes")
    .insert({ ...row, assigned_to: profile.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: "Não foi possível salvar a simulação.", id: null };

  revalidatePath("/sucessao");
  return { error: null, id: data.id };
}

export async function deleteSucessaoSimulacao(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("sucessao_simulacoes").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir a simulação." };

  revalidatePath("/sucessao");
  return { error: null };
}

// Ponto de integração com o funil: o botão "Agendar Diagnóstico" do
// protótipo original não fazia nada — aqui ele de fato cria um prospect,
// reaproveitando a mesma tabela/lógica de pipeline/actions.ts::createProspect,
// já com o valor da oportunidade preenchido a partir da meta de liquidez
// sugerida (descontada a proteção que o cliente já tem).
export async function createProspectFromSimulacao(simulacaoId: string): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const simulacao = await getSucessaoSimulacao(supabase, simulacaoId);
  if (!simulacao) return { error: "Simulação não encontrada." };

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!stage) return { error: "Nenhuma etapa do funil encontrada." };

  const suggested = simulacao.result.suggestedCoverage[simulacao.scenario];

  const { error } = await supabase.from("prospects").insert({
    tenant_id: tenant.id,
    stage_id: stage.id,
    client_id: simulacao.client_id,
    name: simulacao.client_name,
    estimated_value: suggested,
    insurance_type: "Seguro de Vida",
    notes: `Gerado a partir da simulação de sucessão — meta de liquidez sugerida: ${formatCurrency(suggested)}.`,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível criar a oportunidade no funil." };

  revalidatePath("/pipeline");
  return { error: null };
}

const EXTRACT_ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const EXTRACT_MAX_BYTES = 8 * 1024 * 1024; // 8MB — cabe dentro do bodySizeLimit do next.config.ts

export type ExtractAssetsState = { assets: Asset[] | null; error: string | null };

// Análise automatizada de um documento patrimonial (declaração de bens do
// IRPF, relação de bens, auto de inventário) pra pré-preencher a lista de
// bens do simulador. Não persiste o documento em lugar nenhum — é só um
// atalho de digitação; o corretor sempre revisa os valores antes de salvar.
export async function extractAssetsFromDocument(formData: FormData): Promise<ExtractAssetsState> {
  await requireProfile();

  const file = formData.get("file");
  if (!(file instanceof File)) return { assets: null, error: "Nenhum arquivo enviado." };
  if (!EXTRACT_ALLOWED_MIME_TYPES.includes(file.type)) {
    return { assets: null, error: "Formato não suportado (use PDF, PNG ou JPEG)." };
  }
  if (file.size > EXTRACT_MAX_BYTES) {
    return { assets: null, error: "Arquivo maior que 8MB." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const extracted = await extractSucessaoAssets(bytes, file.type);
    if (extracted.length === 0) {
      return { assets: null, error: "Não encontrei bens com valores claros nesse documento." };
    }
    const assets: Asset[] = extracted.map((a) => ({
      id: Math.random().toString(36).slice(2, 10),
      description: a.description,
      type: a.type,
      value: a.value,
    }));
    return { assets, error: null };
  } catch {
    return { assets: null, error: "Não foi possível analisar o documento com a IA." };
  }
}
