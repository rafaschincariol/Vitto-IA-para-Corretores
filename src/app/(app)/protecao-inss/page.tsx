import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getProtecaoInssSimulacoes } from "@/lib/data/protecao-inss";
import { formatCurrency } from "@/lib/protecao-inss/calculator";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ProtecaoInssPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const simulacoes = await getProtecaoInssSimulacoes(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gap de Proteção Previdenciária</h1>
          <p className="text-sm text-muted-foreground">
            Quanto o INSS realmente cobre da renda da família e o que falta pra fechar esse buraco.
          </p>
        </div>
        <Button asChild>
          <Link href="/protecao-inss/nova">
            <Plus className="size-4" />
            Nova simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma simulação ainda. Crie a primeira pra mostrar que &quot;já ter INSS&quot; não é a mesma coisa
          que estar protegido.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Renda familiar</TableHead>
                <TableHead>Gap mensal</TableHead>
                <TableHead>Capital sugerido</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulacoes.map((sim) => (
                <TableRow key={sim.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/protecao-inss/${sim.id}`} className="hover:underline">
                      {sim.client_name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(sim.family_monthly_income)}</TableCell>
                  <TableCell>{formatCurrency(sim.result.monthlyGap)}</TableCell>
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
