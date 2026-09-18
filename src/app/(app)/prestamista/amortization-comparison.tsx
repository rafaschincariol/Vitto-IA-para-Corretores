"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/prestamista/calculator";
import type { AmortizationSystem, PrestamistaResult } from "@/lib/prestamista/types";

// SAC x Price lado a lado — sempre calculados os dois, independente do
// sistema escolhido na simulação, pra deixar claro o trade-off: Price tem
// parcela inicial menor mas paga mais juros no total, e deixa mais saldo
// devedor (logo, mais risco) no meio do prazo — o argumento comercial mais
// forte pra reforçar o prestamista em financiamentos Price.
export function AmortizationComparison({
  comparison,
  selected,
}: {
  comparison: PrestamistaResult["comparison"];
  selected: AmortizationSystem;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SAC × Price</CardTitle>
        <CardDescription>Os dois sistemas, lado a lado, pro mesmo valor financiado e prazo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "1ª parcela", SAC: comparison.sac.firstInstallment, Price: comparison.price.firstInstallment },
                { name: "Última parcela", SAC: comparison.sac.lastInstallment, Price: comparison.price.lastInstallment },
                { name: "Total de juros", SAC: comparison.sac.totalInterest, Price: comparison.price.totalInterest },
              ]}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={56}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="SAC" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Price" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className={selected === "sac" ? "text-primary" : ""}>SAC{selected === "sac" ? " (selecionado)" : ""}</TableHead>
                <TableHead className={selected === "price" ? "text-primary" : ""}>
                  Price{selected === "price" ? " (selecionado)" : ""}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">1ª parcela</TableCell>
                <TableCell>{formatCurrency(comparison.sac.firstInstallment)}</TableCell>
                <TableCell>{formatCurrency(comparison.price.firstInstallment)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Última parcela</TableCell>
                <TableCell>{formatCurrency(comparison.sac.lastInstallment)}</TableCell>
                <TableCell>{formatCurrency(comparison.price.lastInstallment)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Total de juros no financiamento</TableCell>
                <TableCell className="font-medium">{formatCurrency(comparison.sac.totalInterest)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(comparison.price.totalInterest)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Price costuma ter parcela inicial menor, mas paga mais juros no total e mantém o saldo devedor mais alto
          por mais tempo — mais motivo pra ter o prestamista em dia enquanto o financiamento é recente.
        </p>
      </CardContent>
    </Card>
  );
}
