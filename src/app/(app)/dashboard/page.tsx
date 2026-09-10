import { FileCheck2, Wallet, TrendingUp } from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { requireProfile } from "@/lib/data/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { RenewalsChart } from "@/components/renewals-chart";
import { AssistantQuickAsk } from "./assistant-quick-ask";
import { OnboardingChecklist } from "./onboarding-checklist";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function DashboardPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const [data, { count: memberCount }] = await Promise.all([
    getDashboardData(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua carteira.</p>
      </div>

      <AssistantQuickAsk />

      {!tenant.onboarding_dismissed && (
        <OnboardingChecklist
          hasPolicies={data.totalPolicies > 0}
          askedAssistant={tenant.onboarding_asked_assistant}
          hasTeam={(memberCount ?? 1) > 1}
        />
      )}

      {data.totalPolicies > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Apólices ativas" value={String(data.activePolicies)} icon={FileCheck2} />
            <KpiCard title="Prêmio total" value={currencyFormatter.format(data.totalPremium)} icon={Wallet} />
            <KpiCard title="Taxa de renovação" value={`${data.renewalRate}%`} icon={TrendingUp} />
          </div>

          <RenewalsChart data={data.renewalBuckets} />
        </>
      )}
    </div>
  );
}
