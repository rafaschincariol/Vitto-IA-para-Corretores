import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPrestamistaSimulacoes } from "@/lib/data/prestamista";
import { formatCurrency } from "@/lib/prestamista/calculator";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PrestamistaPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const simulacoes = await getPrestamistaSimulacoes(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seguro Prestamista</h1>
          <p className="text-sm text-muted-foreground">
            Quanto de cobertura cobre o saldo devedor de um financiamento imobiliário.
          </p>
        </div>
        <Button asChild>
          <Link href="/prestamista/nova">
            <Plus className="size-4" />
            Nova simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma simulação ainda. Crie a primeira pra mostrar que a família (e o banco) não deveriam ficar com o
          saldo devedor em caso de morte ou invalidez.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Valor financiado</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Cobertura sugerida hoje</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulacoes.map((sim) => (
                <TableRow key={sim.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/prestamista/${sim.id}`} className="hover:underline">
                      {sim.client_name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(sim.financed_amount)}</TableCell>
                  <TableCell className="uppercase">{sim.amortization_system}</TableCell>
                  <TableCell className="font-medium text-primary">
                    {formatCurrency(sim.result.suggestedCoverage)}
                  </TableCell>
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
