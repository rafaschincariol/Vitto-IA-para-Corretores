"use client";

import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/vida/calculator";
import type { VidaYearPoint } from "@/lib/vida/types";

export function VidaCharts({ timeline }: { timeline: VidaYearPoint[] }) {
  const data = timeline.map((point) => ({
    ano: point.year === 0 ? "Hoje" : `Ano ${point.year}`,
    Necessidade: point.need,
    Patrimônio: point.assets,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha da Vida</CardTitle>
        <CardDescription>
          A necessidade de proteção cai conforme dívidas são quitadas e os filhos crescem; o patrimônio sobe com os
          aportes e o rendimento. O seguro cobre a distância entre as duas curvas.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Necessidade"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Patrimônio"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
