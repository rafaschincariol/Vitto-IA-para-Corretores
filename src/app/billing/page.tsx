import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/data/auth";
import { getTenantSubscription, isSubscriptionLocked, trialDaysRemaining } from "@/lib/data/billing";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { SubscribeButton, ManageSubscriptionButton } from "./billing-buttons";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Em teste grátis",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  unpaid: "Pagamento não realizado",
  incomplete: "Incompleta",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { profile, tenant } = await requireProfile();
  const { success } = await searchParams;
  const supabase = await createSupabaseClient();
  const subscription = await getTenantSubscription(supabase, tenant.id);
  const locked = isSubscriptionLocked(subscription);
  const daysLeft = trialDaysRemaining(subscription);
  const isOwner = profile.role === "owner";

  const hasSubscription = subscription?.stripe_customer_id && subscription.status !== "trialing";

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
        <p className="text-sm text-muted-foreground">{tenant.name}</p>
      </div>

      {success === "1" && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          Assinatura confirmada — pode levar alguns segundos para atualizar aqui.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status</CardTitle>
            <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
              {STATUS_LABELS[subscription?.status ?? ""] ?? "Sem assinatura"}
            </Badge>
          </div>
          <CardDescription>
            {subscription?.status === "trialing" &&
              (daysLeft > 0
                ? `${daysLeft} dia(s) restante(s) no teste grátis.`
                : "Seu teste grátis acabou.")}
            {subscription?.status === "active" &&
              subscription.current_period_end &&
              `Renova em ${new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}.`}
            {(subscription?.status === "past_due" || subscription?.status === "unpaid") &&
              "Verifique a forma de pagamento para não perder o acesso."}
            {subscription?.status === "canceled" && "Sua assinatura foi cancelada."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isOwner ? (
            <p className="text-sm text-muted-foreground">
              {locked
                ? "O acesso da corretora está bloqueado. Peça para o Admin da equipe assinar."
                : "Só o Admin da corretora pode gerenciar a assinatura."}
            </p>
          ) : hasSubscription ? (
            <ManageSubscriptionButton />
          ) : (
            <SubscribeButton />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
