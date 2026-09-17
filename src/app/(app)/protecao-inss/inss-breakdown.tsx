import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/protecao-inss/calculator";
import type { InssGapResult } from "@/lib/protecao-inss/types";

function ProportionalBar({
  label,
  value,
  max,
  barClassName,
}: {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Painel de transparência: mostra a conta por trás do número, em vez de só
// entregar o resultado — mesmo espírito da "memória de cálculo" que
// corretores já usam pra explicar imposto pro cliente. Barras proporcionais
// dão uma leitura visual rápida do tamanho do buraco antes mesmo de ler os
// números.
export function InssBreakdown({
  result,
  contributionSalary,
  dependentsCount,
  familyMonthlyIncome,
}: {
  result: InssGapResult;
  contributionSalary: number;
  dependentsCount: number;
  familyMonthlyIncome: number;
}) {
  const exceedsCeiling = contributionSalary > result.inssCeiling;
  const barMax = Math.max(familyMonthlyIncome, result.estimatedPension, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como chegamos nesse número</CardTitle>
        <CardDescription>Memória de cálculo da pensão por morte do INSS.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <ProportionalBar
            label="Renda familiar hoje"
            value={familyMonthlyIncome}
            max={barMax}
            barClassName="bg-muted-foreground/50"
          />
          <ProportionalBar
            label={`Pensão estimada do INSS (${(result.pensionFraction * 100).toFixed(0)}% do benefício)`}
            value={result.estimatedPension}
            max={barMax}
            barClassName="bg-primary"
          />
          <ProportionalBar label="Gap mensal" value={result.monthlyGap} max={barMax} barClassName="bg-destructive" />
        </div>

        <div className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salário de contribuição informado</span>
            <span>{formatCurrency(contributionSalary)}</span>
          </div>
          {exceedsCeiling && (
            <div className="flex justify-between text-amber-700 dark:text-amber-400">
              <span>Capado no teto do INSS</span>
              <span>{formatCurrency(result.inssCeiling)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              × fração de pensão (50% + {dependentsCount} × 10%, no máx. 100%)
            </span>
            <span>{(result.pensionFraction * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between border-t pt-1.5 font-medium">
            <span>Pensão por morte estimada</span>
            <span>{formatCurrency(result.estimatedPension)}</span>
          </div>
        </div>

        {exceedsCeiling && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/15 p-3 text-xs text-amber-700 dark:text-amber-400">
            O salário informado está acima do teto do INSS — a contribuição e o benefício não crescem mais a partir
            desse ponto. Toda a renda acima do teto fica sem nenhuma cobertura pública, o que reforça a necessidade
            de proteção privada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
