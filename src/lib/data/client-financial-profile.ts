import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileField = { value: number; source: string; asOf: string };

// Dado financeiro reaproveitável entre simuladores pra um mesmo cliente — só
// campos com o mesmo significado em mais de um simulador entram aqui (ex:
// "seguro de vida já contratado" é o mesmo conceito nos três; "renda
// familiar total" do INSS não é a mesma coisa que "renda mensal individual"
// da Vida, então ficam separados). Usado só pra pré-preencher formulário de
// nova simulação — o corretor sempre confere/edita antes de salvar.
export type ClientFinancialProfile = {
  existingInsurance: ProfileField | null;
  monthlyIncome: ProfileField | null;
  familyMonthlyIncome: ProfileField | null;
  currentInvestments: ProfileField | null;
};

const SOURCE_LABELS = {
  sucessao: "Simulador de Sucessão",
  inss: "Gap de Proteção (INSS)",
  vida: "Necessidade de Seguro de Vida",
};

function mostRecent(candidates: (ProfileField | null)[]): ProfileField | null {
  const valid = candidates.filter((c): c is ProfileField => c !== null);
  if (valid.length === 0) return null;
  return valid.sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime())[0];
}

export async function getClientFinancialProfile(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientFinancialProfile> {
  const [{ data: sucessao }, { data: inss }, { data: vida }] = await Promise.all([
    supabase
      .from("sucessao_simulacoes")
      .select("existing_protection, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ existing_protection: number; updated_at: string }>(),
    supabase
      .from("protecao_inss_simulacoes")
      .select("existing_insurance, family_monthly_income, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ existing_insurance: number; family_monthly_income: number; updated_at: string }>(),
    supabase
      .from("vida_simulacoes")
      .select("existing_insurance, monthly_income, current_investments, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        existing_insurance: number;
        monthly_income: number;
        current_investments: number;
        updated_at: string;
      }>(),
  ]);

  const existingInsurance = mostRecent([
    sucessao && sucessao.existing_protection > 0
      ? { value: sucessao.existing_protection, source: SOURCE_LABELS.sucessao, asOf: sucessao.updated_at }
      : null,
    inss && inss.existing_insurance > 0
      ? { value: inss.existing_insurance, source: SOURCE_LABELS.inss, asOf: inss.updated_at }
      : null,
    vida && vida.existing_insurance > 0
      ? { value: vida.existing_insurance, source: SOURCE_LABELS.vida, asOf: vida.updated_at }
      : null,
  ]);

  const monthlyIncome =
    vida && vida.monthly_income > 0
      ? { value: vida.monthly_income, source: SOURCE_LABELS.vida, asOf: vida.updated_at }
      : null;

  const familyMonthlyIncome =
    inss && inss.family_monthly_income > 0
      ? { value: inss.family_monthly_income, source: SOURCE_LABELS.inss, asOf: inss.updated_at }
      : null;

  const currentInvestments =
    vida && vida.current_investments > 0
      ? { value: vida.current_investments, source: SOURCE_LABELS.vida, asOf: vida.updated_at }
      : null;

  return { existingInsurance, monthlyIncome, familyMonthlyIncome, currentInvestments };
}
