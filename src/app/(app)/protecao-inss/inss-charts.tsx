"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/protecao-inss/calculator";
import type { InssGapResult } from "@/lib/protecao-inss/types";

// Gráfico de verdade (Recharts) em cima da mesma leitura das barras
// proporcionais do InssBreakdown — renda hoje x pensão do INSS x gap mensal,
// lado a lado, pra bater o olho no tamanho do buraco antes de ler os números.
export function InssCharts({
  result,
  familyMonthlyIncome,
}: {
  result: InssGapResult;
  familyMonthlyIncome: number;
}) {
  const data = [
    { name: "Renda familiar hoje", value: familyMonthlyIncome, fill: "var(--muted-foreground)" },
    { name: "Pensão estimada do INSS", value: result.estimatedPension, fill: "var(--primary)" },
    { name: "Gap mensal", value: result.monthlyGap, fill: "var(--destructive)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renda × pensão do INSS × gap</CardTitle>
        <CardDescription>Comparativo mensal — a diferença é o que o seguro de vida precisa cobrir.</CardDescription>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} className="text-xs" width={130} />
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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
