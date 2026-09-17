import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/sucessao/calculator";
import type { ItcmdBracketBreakdown } from "@/lib/sucessao/types";

// Painel de transparência: mostra a conta do ITCMD faixa a faixa, em vez de
// só entregar o total — mesmo padrão de "memória de cálculo" já usado no
// simulador de gap de proteção (INSS). Ajuda o corretor a justificar o
// número pro cliente (ou pro contador dele) sem precisar refazer a conta.
export function ItcmdBreakdown({
  brackets,
  taxableBase,
  itcmdTotal,
}: {
  brackets: ItcmdBracketBreakdown[];
  taxableBase: number;
  itcmdTotal: number;
}) {
  if (brackets.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como chegamos no ITCMD</CardTitle>
        <CardDescription>
          Cálculo progressivo por faixa — igual ao imposto de renda, cada faixa paga sua própria alíquota.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Faixa</TableHead>
                <TableHead>Alíquota</TableHead>
                <TableHead className="text-right">Base na faixa</TableHead>
                <TableHead className="text-right">Imposto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brackets.map((bracket, i) => {
                const previousLimit = i === 0 ? 0 : brackets[i - 1].limit;
                const label =
                  bracket.limit === Infinity
                    ? `Acima de ${formatCurrency(previousLimit)}`
                    : `${formatCurrency(previousLimit)} a ${formatCurrency(bracket.limit)}`;
                return (
                  <TableRow key={bracket.limit} className="hover:bg-transparent">
                    <TableCell className="whitespace-normal">{label}</TableCell>
                    <TableCell>{(bracket.rate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(bracket.amountInBracket)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(bracket.taxInBracket)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2} className="whitespace-normal">
                  Base tributável: {formatCurrency(taxableBase)}
                </TableCell>
                <TableCell colSpan={2} className="text-right">
                  Total ITCMD: {formatCurrency(itcmdTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
