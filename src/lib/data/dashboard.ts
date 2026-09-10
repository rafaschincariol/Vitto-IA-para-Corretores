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

function daysUntil(dateStr: string, from: Date) {
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
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
