"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GROWTH_STAGE_LABELS, GROWTH_SUSEP_STATUS_LABELS, type GrowthLead, type GrowthLeadStage } from "@/lib/types";

const STAGE_VARIANT: Record<GrowthLeadStage, "default" | "outline" | "destructive" | "secondary"> = {
  novo: "secondary",
  qualificado: "default",
  descartado: "outline",
  convertido: "default",
};

const PAGE_SIZE = 15;

// Mesmo padrão de admin/tenants-table.tsx: fetch único server-side, busca e
// paginação 100% client-side, sem lib de tabela.
export function LeadsTable({ leads }: { leads: GrowthLead[] }) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<GrowthLeadStage | "all">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (stageFilter !== "all" && lead.stage !== stageFilter) return false;
      if (!q) return true;
      return [lead.contact_name, lead.company_name, lead.email].some((field) => field?.toLowerCase().includes(q));
    });
  }, [leads, query, stageFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        {(Object.keys(GROWTH_STAGE_LABELS) as GrowthLeadStage[]).map((stage) => (
          <Button
            key={stage}
            type="button"
            variant={stageFilter === stage ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStageFilter((v) => (v === stage ? "all" : stage));
              setPage(0);
            }}
          >
            {GROWTH_STAGE_LABELS[stage]}
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>SUSEP</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Importado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {leads.length === 0 ? "Nenhum lead importado ainda." : "Nenhum lead encontrado."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/growth/${lead.id}`} className="underline-offset-4 hover:underline">
                    {lead.contact_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                </TableCell>
                <TableCell>{lead.company_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {GROWTH_SUSEP_STATUS_LABELS[lead.susep_status]}
                </TableCell>
                <TableCell>
                  <Badge variant={STAGE_VARIANT[lead.stage]}>{GROWTH_STAGE_LABELS[lead.stage]}</Badge>
                </TableCell>
                <TableCell className="text-right">{lead.qualification_score ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[lead.city, lead.state].filter(Boolean).join("/") || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {currentPage + 1} de {pageCount} ({filtered.length} lead{filtered.length === 1 ? "" : "s"})
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
