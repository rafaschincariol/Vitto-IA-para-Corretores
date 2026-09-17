import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getVidaSimulacoes } from "@/lib/data/vida";
import { formatCurrency } from "@/lib/vida/calculator";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function VidaPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const simulacoes = await getVidaSimulacoes(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Necessidade de Seguro de Vida</h1>
          <p className="text-sm text-muted-foreground">
            Capital sugerido (método DIME) e a trajetória de proteção ao longo dos anos — a &quot;Linha da Vida&quot;.
          </p>
        </div>
        <Button asChild>
          <Link href="/vida/nova">
            <Plus className="size-4" />
            Nova simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma simulação ainda. Crie a primeira pra transformar &quot;quanto de seguro você quer&quot; num número
          calculado a partir da vida real do cliente.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Renda mensal</TableHead>
                <TableHead>Anos de dependência</TableHead>
                <TableHead>Capital sugerido</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulacoes.map((sim) => (
                <TableRow key={sim.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/vida/${sim.id}`} className="hover:underline">
                      {sim.client_name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(sim.monthly_income)}</TableCell>
                  <TableCell>{sim.dependency_years} anos</TableCell>
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
