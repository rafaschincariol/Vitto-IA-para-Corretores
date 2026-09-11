"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminTenantRow } from "@/lib/data/admin";
import type { SubscriptionStatus } from "@/lib/types";

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  unpaid: "Não paga",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

export const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "outline" | "destructive" | "secondary"> = {
  trialing: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  unpaid: "destructive",
  incomplete: "outline",
  incomplete_expired: "outline",
  paused: "outline",
};

const PAGE_SIZE = 10;

export function TenantsTable({ tenants }: { tenants: AdminTenantRow[] }) {
  const [query, setQuery] = useState("");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [page, setPage] = useState(0);

  const incompleteCount = useMemo(() => tenants.filter((t) => !t.owner_email_confirmed).length, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (incompleteOnly && t.owner_email_confirmed) return false;
      if (!q) return true;
      return [t.tenant_name, t.owner_full_name, t.owner_email].some((field) =>
        field?.toLowerCase().includes(q)
      );
    });
  }, [tenants, query, incompleteOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por corretora, responsável ou e-mail..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        {incompleteCount > 0 && (
          <Button
            type="button"
            variant={incompleteOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIncompleteOnly((v) => !v);
              setPage(0);
            }}
          >
            Cadastros incompletos ({incompleteCount})
          </Button>
        )}
      </div>

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
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {tenants.length === 0 ? "Nenhuma corretora cadastrada ainda." : "Nenhuma corretora encontrada."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((t) => (
              <TableRow key={t.tenant_id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/tenants/${t.tenant_id}`} className="underline-offset-4 hover:underline">
                    {t.tenant_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{t.owner_full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{t.owner_email ?? "—"}</span>
                  </div>
                  {!t.owner_email_confirmed && (
                    <Badge variant="outline" className="mt-1 border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      Cadastro incompleto
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                  {t.pending_deletion_at && (
                    <Badge variant="destructive" className="ml-1">
                      Exclusão {new Date(t.pending_deletion_at).toLocaleDateString("pt-BR")}
                    </Badge>
                  )}
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

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {currentPage + 1} de {pageCount} ({filtered.length} corretora{filtered.length === 1 ? "" : "s"})
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
