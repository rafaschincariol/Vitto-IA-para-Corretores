import Link from "next/link";
import { ArrowLeft, Target, TrendingUp, Users, Wallet } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPipelineAnalytics } from "@/lib/data/pipeline";
import { KpiCard } from "@/components/kpi-card";
import { PipelineFunnelChart } from "@/components/pipeline-funnel-chart";
import { Button } from "@/components/ui/button";
import { PipelineInsightsPanel } from "./pipeline-insights-panel";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PipelineAnalyticsPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const analytics = await getPipelineAnalytics(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/pipeline">
            <ArrowLeft className="size-4" />
            Voltar pro funil
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics do Funil</h1>
        <p className="text-sm text-muted-foreground">Índices de conversão e valor em negociação.</p>
      </div>

      {analytics.totalProspects === 0 ? (
        <p className="text-sm text-muted-foreground">Cadastre prospects no funil pra ver as análises aqui.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Prospects no funil" value={String(analytics.totalProspects)} icon={Users} />
            <KpiCard
              title="Valor em negociação"
              value={currencyFormatter.format(analytics.totalPipelineValue)}
              icon={Wallet}
            />
            <KpiCard
              title="Taxa de conversão"
              value={`${analytics.overallConversionRate}%`}
              icon={Target}
              tooltip="Ganhos ÷ (ganhos + perdidos). Prospects ainda em negociação não entram nessa conta."
            />
            <KpiCard
              title="Tempo médio até fechar"
              value={analytics.avgDaysToClose !== null ? `${analytics.avgDaysToClose} dia(s)` : "—"}
              icon={TrendingUp}
              tooltip="Média de dias entre a criação do prospect e o momento em que ele entrou numa etapa de ganho."
            />
          </div>

          <PipelineFunnelChart data={analytics.stageFunnel} />

          <PipelineInsightsPanel />
        </>
      )}
    </div>
  );
}
