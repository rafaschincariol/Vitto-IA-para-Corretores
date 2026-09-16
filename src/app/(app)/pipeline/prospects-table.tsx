"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProspectFormDialog } from "./prospect-form-dialog";
import type { PipelineStage, Profile, ProspectWithStage } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProspectsTable({
  prospects,
  stages,
  isOwner = false,
  teamMembers = [],
}: {
  prospects: ProspectWithStage[];
  stages: PipelineStage[];
  isOwner?: boolean;
  teamMembers?: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [query, setQuery] = useState("");
  const memberNames = Object.fromEntries(teamMembers.map((m) => [m.id, m.full_name ?? m.email]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) =>
      [p.name, p.cpf_cnpj, p.email, p.phone, p.stage.name].some((field) => field?.toLowerCase().includes(q))
    );
  }, [prospects, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, contato ou etapa..."
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Valor estimado</TableHead>
              {isOwner && <TableHead>Responsável</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 5 : 4} className="text-center text-muted-foreground">
                  Nenhum prospect encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell className="font-medium">
                  <ProspectFormDialog
                    stages={stages}
                    prospect={prospect}
                    isOwner={isOwner}
                    teamMembers={teamMembers}
                    trigger={<button type="button" className="hover:underline">{prospect.name}</button>}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={prospect.stage.is_won ? "default" : prospect.stage.is_lost ? "destructive" : "outline"}
                    className={prospect.stage.is_won ? "bg-emerald-600 text-white" : undefined}
                  >
                    {prospect.stage.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{prospect.email ?? prospect.phone ?? "—"}</TableCell>
                <TableCell>
                  {prospect.estimated_value !== null ? currencyFormatter.format(prospect.estimated_value) : "—"}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-muted-foreground">
                    {(prospect.assigned_to && memberNames[prospect.assigned_to]) ?? "—"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
