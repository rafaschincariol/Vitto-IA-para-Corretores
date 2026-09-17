"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/prestamista/calculator";
import type { PrestamistaYearPoint } from "@/lib/prestamista/types";

export function PrestamistaCharts({ timeline }: { timeline: PrestamistaYearPoint[] }) {
  const data = timeline.map((point) => ({
    ano: point.year === 0 ? "Hoje" : `Ano ${point.year}`,
    "Saldo devedor": point.balance,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo devedor projetado</CardTitle>
        <CardDescription>
          A cobertura ideal do seguro prestamista acompanha essa curva — decrescente, não um capital fixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="saldoDevedorGradient" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="Saldo devedor"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#saldoDevedorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
