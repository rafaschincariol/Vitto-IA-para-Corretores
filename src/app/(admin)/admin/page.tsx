import { Building2, Users, Wallet, TrendingUp, ExternalLink } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { listTenantsForAdmin } from "@/lib/data/admin";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { siteConfig } from "@/lib/site-config";
import type { SubscriptionStatus } from "@/lib/types";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  unpaid: "Não paga",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "outline" | "destructive" | "secondary"> = {
  trialing: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  unpaid: "destructive",
  incomplete: "outline",
  incomplete_expired: "outline",
  paused: "outline",
};

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretora</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial / renovação</TableHead>
              <TableHead className="text-right">Clientes</TableHead>
              <TableHead className="text-right">Apólices</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma corretora cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {tenants.map((t) => (
              <TableRow key={t.tenant_id}>
                <TableCell className="font-medium">{t.tenant_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{t.owner_full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{t.owner_email ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.status === "trialing" && t.trial_ends_at
                    ? `Termina em ${new Date(t.trial_ends_at).toLocaleDateString("pt-BR")}`
                    : t.current_period_end
                      ? `Renova em ${new Date(t.current_period_end).toLocaleDateString("pt-BR")}`
                      : "—"}
                </TableCell>
                <TableCell className="text-right">{t.client_count}</TableCell>
                <TableCell className="text-right">{t.active_policy_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  {t.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Ver pagamentos no Stripe"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
