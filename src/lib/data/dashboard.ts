import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types";

export type DashboardData = {
  activePolicies: number;
  totalPolicies: number;
  totalPremium: number;
  renewalRate: number;
  renewalBuckets: { label: string; count: number }[];
};

export type UpcomingRenewal = {
  policyId: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  insurer: string;
  premiumTotal: number | null;
  endDate: string;
  daysUntil: number;
  contactedAt: string | null;
};

function daysUntil(dateStr: string, from: Date) {
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

const RENEWAL_HORIZON_DAYS = 90;

// Mesma janela do gráfico "Apólices a vencer" (30/60/90 dias) — mas aqui
// linha a linha, com o que o corretor precisa pra agir: contato do
// cliente e a apólice específica que está vencendo. Fica logo abaixo do
// gráfico no Dashboard.
export async function getUpcomingRenewals(): Promise<UpcomingRenewal[]> {
  const supabase = await createClient();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + RENEWAL_HORIZON_DAYS);
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("policies")
    .select(
      "id, client_id, insurer, premium_total, end_date, renewal_contact_marked_at, client:clients(id, name, phone, email)"
    )
    .in("status", ["ativo", "em_renovacao"])
    .gte("end_date", toIsoDate(now))
    .lte("end_date", toIsoDate(horizon))
    .order("end_date", { ascending: true })
    .returns<
      {
        id: string;
        client_id: string;
        insurer: string;
        premium_total: number | null;
        end_date: string;
        renewal_contact_marked_at: string | null;
        client: { id: string; name: string; phone: string | null; email: string | null } | null;
      }[]
    >();

  if (error || !data) return [];

  return data
    .filter((p) => p.client)
    .map((p) => ({
      policyId: p.id,
      clientId: p.client!.id,
      clientName: p.client!.name,
      clientPhone: p.client!.phone,
      clientEmail: p.client!.email,
      insurer: p.insurer,
      premiumTotal: p.premium_total,
      endDate: p.end_date,
      daysUntil: daysUntil(p.end_date, now),
      contactedAt: p.renewal_contact_marked_at,
    }));
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: policies, error } = await supabase
    .from("policies")
    .select("id, status, premium_total, end_date")
    .returns<Pick<Policy, "id" | "status" | "premium_total" | "end_date">[]>();

  if (error || !policies) {
    return { activePolicies: 0, totalPolicies: 0, totalPremium: 0, renewalRate: 0, renewalBuckets: [] };
  }

  const active = policies.filter((p) => p.status === "ativo" || p.status === "em_renovacao");
  const totalPremium = active.reduce((sum, p) => sum + (p.premium_total ?? 0), 0);

  const finished = policies.filter((p) => p.status === "cancelado" || p.status === "vencido");
  const renewed = policies.filter((p) => p.status === "em_renovacao");
  const renewalPool = finished.length + renewed.length;
  const renewalRate = renewalPool > 0 ? Math.round((renewed.length / renewalPool) * 100) : 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const buckets = [
    { label: "30 dias", max: 30, count: 0 },
    { label: "60 dias", max: 60, count: 0 },
    { label: "90 dias", max: 90, count: 0 },
  ];

  for (const policy of active) {
    const diff = daysUntil(policy.end_date, now);
    if (diff < 0) continue;
    for (const bucket of buckets) {
      if (diff <= bucket.max) {
        bucket.count += 1;
        break;
      }
    }
  }

  return {
    activePolicies: active.length,
    totalPolicies: policies.length,
    totalPremium,
    renewalRate,
    renewalBuckets: buckets.map(({ label, count }) => ({ label, count })),
  };
}
