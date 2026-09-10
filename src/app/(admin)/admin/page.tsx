import { Building2, Users, Wallet, TrendingUp } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { listTenantsForAdmin } from "@/lib/data/admin";
import { KpiCard } from "@/components/kpi-card";
import { siteConfig } from "@/lib/site-config";
import { TenantsTable } from "./tenants-table";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthlyPrice = Number(siteConfig.price.replace(/[^\d,]/g, "").replace(",", "."));

export default async function AdminOverviewPage() {
  const supabase = await createSupabaseClient();
  const tenants = await listTenantsForAdmin(supabase);

  const active = tenants.filter((t) => t.status === "active").length;
  const trialing = tenants.filter((t) => t.status === "trialing").length;
  const atRisk = tenants.filter((t) => t.status === "past_due" || t.status === "unpaid").length;
  const canceled = tenants.filter((t) => t.status === "canceled").length;
  const mrr = active * monthlyPrice;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel de controle</h1>
        <p className="text-sm text-muted-foreground">
          Assinantes, uso e pagamentos de todas as corretoras na plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Corretoras" value={String(tenants.length)} icon={Building2} />
        <KpiCard title="Assinaturas ativas" value={String(active)} icon={Users} />
        <KpiCard title="Receita mensal recorrente" value={currencyFormatter.format(mrr)} icon={Wallet} />
        <KpiCard title="Em teste grátis" value={String(trialing)} icon={TrendingUp} />
      </div>

      {(atRisk > 0 || canceled > 0) && (
        <p className="text-sm text-muted-foreground">
          {atRisk > 0 && `${atRisk} corretora(s) com pagamento pendente. `}
          {canceled > 0 && `${canceled} corretora(s) cancelada(s).`}
        </p>
      )}

      <TenantsTable tenants={tenants} />
    </div>
  );
}
