"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { markRenewalContacted } from "./actions";
import type { UpcomingRenewal } from "@/lib/data/dashboard";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Countdown({ days }: { days: number }) {
  const label = days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`;
  const urgency = days < 7 ? "bad" : days < 30 ? "warn" : "muted";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        urgency === "bad" && "bg-destructive/15 text-destructive",
        urgency === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        urgency === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="size-3.5" />
      {label}
    </span>
  );
}

function RenewalRow({ renewal }: { renewal: UpcomingRenewal }) {
  const [contacted, setContacted] = useState(Boolean(renewal.contactedAt));
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setContacted(checked);
    startTransition(async () => {
      const result = await markRenewalContacted(renewal.policyId, checked);
      if (result.error) {
        setContacted(!checked);
        toast.error(result.error);
        return;
      }
      if (checked) {
        toast.success("Marcado como contatado.", {
          description: "Assim que o cliente mandar a apólice nova, envie o PDF em Documentos para o Vitto atualizar sozinho.",
        });
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        contacted ? "bg-muted/40" : "bg-transparent"
      )}
    >
      <input
        type="checkbox"
        checked={contacted}
        disabled={pending}
        onChange={(e) => handleToggle(e.target.checked)}
        aria-label={`Marcar ${renewal.clientName} como contatado`}
        className="mt-1 size-4 shrink-0 rounded border-input accent-foreground"
      />

      <div className={cn("min-w-0 flex-1 space-y-1", contacted && "opacity-60")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/clients/${renewal.clientId}`}
            className={cn("truncate text-sm font-medium hover:underline", contacted && "line-through")}
          >
            {renewal.clientName}
          </Link>
          <Countdown days={renewal.daysUntil} />
        </div>

        <p className="text-sm text-muted-foreground">
          {renewal.insurer}
          {renewal.premiumTotal != null && <> · {currencyFormatter.format(renewal.premiumTotal)}</>}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {renewal.clientPhone && (
            <a href={`tel:${renewal.clientPhone}`} className="flex items-center gap-1 hover:text-foreground">
              <Phone className="size-3.5" />
              {renewal.clientPhone}
            </a>
          )}
          {renewal.clientEmail && (
            <a href={`mailto:${renewal.clientEmail}`} className="flex items-center gap-1 hover:text-foreground">
              <Mail className="size-3.5" />
              {renewal.clientEmail}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function RenewalsList({ renewals }: { renewals: UpcomingRenewal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Renovações próximas</CardTitle>
        <CardDescription>
          Apólices vencendo nos próximos 90 dias. Marque quando já tiver contatado o cliente ou renovado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma apólice vencendo nos próximos 90 dias.</p>
        ) : (
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {renewals.map((renewal) => (
              <RenewalRow key={renewal.policyId} renewal={renewal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
