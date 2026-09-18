"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VidaSimulacao } from "@/lib/types";

export function ExportVidaPdfButton({ simulacao, advisorName }: { simulacao: VidaSimulacao; advisorName: string }) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { generateVidaPDF } = await import("@/lib/vida/pdf-generator");
      const doc = generateVidaPDF(simulacao.result, {
        clientName: simulacao.client_name,
        advisorName,
        notes: simulacao.notes,
        monthlyIncome: simulacao.monthly_income,
        dependencyYears: simulacao.dependency_years,
        debts: simulacao.debts,
        children: simulacao.children,
        currentInvestments: simulacao.current_investments,
        monthlyContribution: simulacao.monthly_contribution,
        existingInsurance: simulacao.existing_insurance,
        realReturnRate: simulacao.real_return_rate,
        finalCosts: simulacao.final_costs,
      });
      const fileName = `Necessidade_Seguro_Vida_${simulacao.client_name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.pdf`;
      doc.save(fileName);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport} disabled={generating}>
      {generating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {generating ? "Gerando PDF..." : "Exportar PDF"}
    </Button>
  );
}
