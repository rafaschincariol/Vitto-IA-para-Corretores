import { FileCheck2, Wallet, TrendingUp } from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { RenewalsChart } from "@/components/renewals-chart";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua carteira.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Apólices ativas" value={String(data.activePolicies)} icon={FileCheck2} />
        <KpiCard title="Prêmio total" value={currencyFormatter.format(data.totalPremium)} icon={Wallet} />
        <KpiCard title="Taxa de renovação" value={`${data.renewalRate}%`} icon={TrendingUp} />
      </div>

      <RenewalsChart data={data.renewalBuckets} />
    </div>
  );
}
