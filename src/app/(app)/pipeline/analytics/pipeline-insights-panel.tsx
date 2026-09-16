"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getPipelineInsightsAction } from "../analytics-actions";
import type { PipelineInsights } from "@/lib/ai/pipeline-insights";

export function PipelineInsightsPanel() {
  const [insights, setInsights] = useState<PipelineInsights | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await getPipelineInsightsAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setInsights(result.insights);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Insights de IA</CardTitle>
          <CardDescription>Análise do funil gerada sob demanda, direto dos seus números.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={handleGenerate} disabled={pending}>
          <Sparkles className="size-4" />
          {pending ? "Gerando..." : insights ? "Gerar de novo" : "Gerar insights"}
        </Button>
      </CardHeader>
      {insights && (
        <CardContent className="space-y-4">
          <p className="text-sm font-medium">{insights.headline}</p>

          {insights.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Observações</p>
              <div className="space-y-2">
                {insights.insights.map((item, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Recomendações</p>
              <div className="space-y-2">
                {insights.recommendations.map((item, i) => (
                  <div key={i} className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
