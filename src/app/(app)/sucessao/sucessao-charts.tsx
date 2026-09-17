"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/sucessao/calculator";
import type { SimulationResult } from "@/lib/sucessao/types";

const CATEGORY_LABELS: Record<keyof SimulationResult["costs"], string> = {
  itcmd: "ITCMD",
  notary: "Cartório",
  registry: "Registro",
  attorney: "Advogado",
  court: "Certidões",
};

export function SucessaoCharts({ result }: { result: SimulationResult }) {
  const data = (Object.keys(result.costs) as (keyof SimulationResult["costs"])[]).map((key) => ({
    name: CATEGORY_LABELS[key],
    administrativa: result.costs[key].min,
    judicial: result.costs[key].max,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo por categoria de custo</CardTitle>
        <CardDescription>Via administrativa × via judicial, categoria a categoria.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
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
            <Bar dataKey="administrativa" name="Administrativa" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="judicial" name="Judicial" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
