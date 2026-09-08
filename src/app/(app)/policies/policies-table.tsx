"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PolicyStatusBadge } from "@/components/policy-status-badge";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PolicyFormDialog } from "./policy-form-dialog";
import { deletePolicyRecord } from "./actions";
import type { PolicyWithClient } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PoliciesTable({
  policies,
  clients,
  showClientColumn = true,
}: {
  policies: PolicyWithClient[];
  clients: { id: string; name: string }[];
  showClientColumn?: boolean;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showClientColumn && <TableHead>Cliente</TableHead>}
            <TableHead>Seguradora</TableHead>
            <TableHead>Apólice</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Prêmio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.length === 0 && (
            <TableRow>
              <TableCell colSpan={showClientColumn ? 7 : 6} className="text-center text-muted-foreground">
                Nenhuma apólice cadastrada.
              </TableCell>
            </TableRow>
          )}
          {policies.map((policy) => (
            <TableRow key={policy.id}>
              {showClientColumn && (
                <TableCell className="font-medium">
                  <Link href={`/clients/${policy.client_id}`} className="hover:underline">
                    {policy.client.name}
                  </Link>
                </TableCell>
              )}
              <TableCell>{policy.insurer}</TableCell>
              <TableCell className="text-muted-foreground">{policy.policy_number}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(`${policy.start_date}T00:00:00`), "dd/MM/yy", { locale: ptBR })} –{" "}
                {format(new Date(`${policy.end_date}T00:00:00`), "dd/MM/yy", { locale: ptBR })}
              </TableCell>
              <TableCell>{policy.premium_total ? currencyFormatter.format(policy.premium_total) : "—"}</TableCell>
              <TableCell>
                <PolicyStatusBadge status={policy.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <PolicyFormDialog clients={clients} policy={policy} />
                  <ConfirmDeleteButton id={policy.id} label="apólice" action={deletePolicyRecord} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
