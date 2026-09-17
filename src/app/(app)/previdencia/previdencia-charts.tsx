"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/previdencia/calculator";
import type { PrevidenciaYearPoint } from "@/lib/previdencia/types";

export function PrevidenciaCharts({ timeline }: { timeline: PrevidenciaYearPoint[] }) {
  const data = timeline.map((point) => ({
    ano: point.year === 0 ? "Hoje" : `Ano ${point.year}`,
    "Saldo acumulado": point.balance,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo acumulado projetado</CardTitle>
        <CardDescription>Juros compostos sobre o saldo existente mais os aportes mensais.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="saldoAcumuladoGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="ano" tickLine={false} axisLine={false} className="text-xs" interval="preserveStartEnd" />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-xs"
              width={56}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="Saldo acumulado"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#saldoAcumuladoGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
