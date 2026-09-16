"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function PipelineFunnelChart({
  data,
}: {
  data: { stageName: string; reachedCount: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de conversão</CardTitle>
        <CardDescription>Quantos prospects distintos já alcançaram cada etapa.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
            <YAxis
              type="category"
              dataKey="stageName"
              tickLine={false}
              axisLine={false}
              width={120}
              className="text-xs"
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="reachedCount" name="Prospects" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
