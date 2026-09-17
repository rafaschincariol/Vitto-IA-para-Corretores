import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/previdencia/calculator";
import type { PlanTaxSummary, PlanType, PrevidenciaResult, TaxRegime } from "@/lib/previdencia/types";

const ROWS: { plan: PlanType; regime: TaxRegime; key: keyof PrevidenciaResult["comparison"]; label: string }[] = [
  { plan: "pgbl", regime: "regressivo", key: "pgbl_regressivo", label: "PGBL · Regressivo" },
  { plan: "pgbl", regime: "progressivo", key: "pgbl_progressivo", label: "PGBL · Progressivo" },
  { plan: "vgbl", regime: "regressivo", key: "vgbl_regressivo", label: "VGBL · Regressivo" },
  { plan: "vgbl", regime: "progressivo", key: "vgbl_progressivo", label: "VGBL · Progressivo" },
];

// As 4 combinações são sempre calculadas, independente da que o corretor
// selecionou no formulário — é o comparativo que ajuda a decidir qual plano e
// regime recomendar, igual ao comparativo SAC x Price do Prestamista.
export function ComparisonTable({
  comparison,
  selectedPlan,
  selectedRegime,
}: {
  comparison: PrevidenciaResult["comparison"];
  selectedPlan: PlanType;
  selectedRegime: TaxRegime;
}) {
  const best = ROWS.reduce((acc, row) => {
    const summary = comparison[row.key];
    const bestSummary = comparison[acc.key];
    return summary.netProceeds > bestSummary.netProceeds ? row : acc;
  }, ROWS[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">PGBL × VGBL, regressivo × progressivo</CardTitle>
        <CardDescription>
          Mesmo saldo acumulado, 4 formas de tributar no resgate — qual deixa mais dinheiro líquido pro cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Combinação</TableHead>
                <TableHead>Base tributável</TableHead>
                <TableHead>Alíquota</TableHead>
                <TableHead>IR devido</TableHead>
                <TableHead className="text-right">Líquido no resgate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => {
                const summary: PlanTaxSummary = comparison[row.key];
                const isSelected = row.plan === selectedPlan && row.regime === selectedRegime;
                const isBest = row.key === best.key;
                return (
                  <TableRow key={row.key} className={isSelected ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">
                      {row.label}
                      {isSelected && <span className="ml-1.5 text-xs text-primary">(selecionado)</span>}
                      {isBest && <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">· melhor líquido</span>}
                    </TableCell>
                    <TableCell>{formatCurrency(summary.taxableBase)}</TableCell>
                    <TableCell>{(summary.taxRate * 100).toFixed(1)}%</TableCell>
                    <TableCell>{formatCurrency(summary.taxOwed)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(summary.netProceeds)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          PGBL tributa o resgate inteiro (principal + ganhos), mas a contribuição é dedutível do IR hoje. VGBL só
          tributa os ganhos no resgate, sem dedução na contribuição. A tabela regressiva usa o horizonte total da
          simulação como tempo de acumulação — uma simplificação pra um resgate único no fim do prazo.
        </p>
      </CardContent>
    </Card>
  );
}
