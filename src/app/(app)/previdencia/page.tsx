import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPrevidenciaSimulacoes } from "@/lib/data/previdencia";
import { formatCurrency } from "@/lib/previdencia/calculator";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PLAN_LABELS = { pgbl: "PGBL", vgbl: "VGBL" };
const REGIME_LABELS = { regressivo: "Regressivo", progressivo: "Progressivo" };

export default async function PrevidenciaPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const simulacoes = await getPrevidenciaSimulacoes(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Previdência Privada</h1>
          <p className="text-sm text-muted-foreground">
            Projeção de acumulação e comparação PGBL × VGBL, regressivo × progressivo.
          </p>
        </div>
        <Button asChild>
          <Link href="/previdencia/nova">
            <Plus className="size-4" />
            Nova simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma simulação ainda. Crie a primeira pra mostrar quanto o cliente acumula e qual combinação de plano e
          regime de tributação deixa mais dinheiro no bolso dele no resgate.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Aporte mensal</TableHead>
                <TableHead>Plano / regime</TableHead>
                <TableHead>Saldo projetado</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulacoes.map((sim) => (
                <TableRow key={sim.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/previdencia/${sim.id}`} className="hover:underline">
                      {sim.client_name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(sim.monthly_contribution)}</TableCell>
                  <TableCell>
                    {PLAN_LABELS[sim.plan_type]} · {REGIME_LABELS[sim.tax_regime]}
                  </TableCell>
                  <TableCell className="font-medium text-primary">{formatCurrency(sim.result.futureValue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(sim.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
