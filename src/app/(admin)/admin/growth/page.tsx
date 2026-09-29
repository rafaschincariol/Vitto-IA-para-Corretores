import Link from "next/link";
import { Target, Users, MailCheck, Inbox } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getGrowthLeads, getGrowthStats } from "@/lib/data/growth";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { LeadsTable } from "./leads-table";
import { ImportLeadsDialog } from "./import-leads-dialog";

export default async function GrowthPage() {
  const supabase = await createSupabaseClient();
  const [leads, stats] = await Promise.all([getGrowthLeads(supabase), getGrowthStats(supabase)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aquisição de Leads</h1>
          <p className="text-sm text-muted-foreground">
            Motor de prospecção pra novos assinantes — importação, qualificação por IA e envio sempre aprovado por
            humano.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/growth/review">Fila de aprovação ({stats.pendingReview})</Link>
          </Button>
          <ImportLeadsDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total de leads" value={String(stats.totalLeads)} icon={Users} />
        <KpiCard title="Qualificados" value={String(stats.byStage.qualificado ?? 0)} icon={Target} />
        <KpiCard title="Rascunhos pendentes de revisão" value={String(stats.pendingReview)} icon={Inbox} />
        <KpiCard title="E-mails enviados" value={String(stats.sent)} icon={MailCheck} />
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}
