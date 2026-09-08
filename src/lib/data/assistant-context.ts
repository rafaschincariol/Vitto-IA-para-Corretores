import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type PolicyRow = {
  status: string;
  premium_total: number | null;
  start_date: string;
  end_date: string;
  insurer: string;
  policy_number: string;
  client: { name: string } | { name: string }[] | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Contexto estruturado (não semântico) passado ao assistente para perguntas
// sobre a própria carteira — cobre exatamente o tipo de pergunta operacional
// do exemplo do produto ("quais apólices vencem nos próximos 30 dias?"),
// que a busca vetorial sobre texto de PDF não responderia bem sozinha.
export async function getPortfolioSnapshot(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data: policies } = await supabase
    .from("policies")
    .select("status, premium_total, start_date, end_date, insurer, policy_number, client:clients(name)")
    .eq("tenant_id", tenantId)
    .returns<PolicyRow[]>();

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (!policies || policies.length === 0) {
    return `Nenhuma apólice cadastrada ainda. ${clientCount ?? 0} cliente(s) na carteira.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = policies.filter((p) => p.status === "ativo" || p.status === "em_renovacao");
  const totalPremium = active.reduce((sum, p) => sum + (p.premium_total ?? 0), 0);

  const clientName = (p: PolicyRow) => (Array.isArray(p.client) ? p.client[0]?.name : p.client?.name) ?? "—";

  const upcoming = active
    .map((p) => ({
      ...p,
      daysUntil: Math.ceil(
        (new Date(`${p.end_date}T00:00:00`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .filter((p) => p.daysUntil >= 0 && p.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const lines = [
    `Data de hoje: ${today.toLocaleDateString("pt-BR")}.`,
    `${clientCount ?? 0} cliente(s) cadastrado(s). ${active.length} apólice(s) ativa(s)/em renovação, prêmio total ${currencyFormatter.format(totalPremium)}.`,
  ];

  if (upcoming.length > 0) {
    lines.push("Apólices vencendo nos próximos 90 dias:");
    for (const p of upcoming) {
      lines.push(
        `- ${clientName(p)} · ${p.insurer} · apólice ${p.policy_number} · vence em ${p.end_date} (${p.daysUntil} dia(s)) · status ${p.status}`
      );
    }
  } else {
    lines.push("Nenhuma apólice vence nos próximos 90 dias.");
  }

  return lines.join("\n");
}
