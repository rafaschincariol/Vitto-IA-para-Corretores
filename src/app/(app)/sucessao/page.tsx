import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getSucessaoSimulacoes } from "@/lib/data/sucessao";
import { formatCurrency } from "@/lib/sucessao/calculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SucessaoPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();
  const simulacoes = await getSucessaoSimulacoes(supabase, tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simulador de Sucessão</h1>
          <p className="text-sm text-muted-foreground">
            Custo de inventário e capital de seguro sugerido pra cobrir a família.
          </p>
        </div>
        <Button asChild>
          <Link href="/sucessao/nova">
            <Plus className="size-4" />
            Nova simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma simulação ainda. Crie a primeira pra mostrar ao cliente o custo real de não se proteger.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Capital sugerido</TableHead>
                <TableHead>Cenário</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulacoes.map((sim) => (
                <TableRow key={sim.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/sucessao/${sim.id}`} className="hover:underline">
                      {sim.client_name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(sim.result.totalAssets)}</TableCell>
                  <TableCell className="font-medium text-primary">
                    {formatCurrency(sim.result.suggestedCoverage[sim.scenario])}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sim.scenario === "max" ? "destructive" : "outline"}>
                      {sim.scenario === "max" ? "Judicial" : "Administrativa"}
                    </Badge>
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
