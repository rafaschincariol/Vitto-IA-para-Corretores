"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SucessaoSimulacao } from "@/lib/types";

export function ExportSucessaoPdfButton({
  simulacao,
  advisorName,
  scenario,
  customDuration,
  liquidityGoal,
  suggestedCoverage,
}: {
  simulacao: SucessaoSimulacao;
  advisorName: string;
  scenario: "min" | "max";
  customDuration: number;
  liquidityGoal: number;
  suggestedCoverage: number;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { generateSucessaoPDF } = await import("@/lib/sucessao/pdf-generator");
      const doc = generateSucessaoPDF(simulacao.assets, simulacao.result, {
        clientName: simulacao.client_name,
        advisorName,
        notes: simulacao.notes,
        scenario,
        maritalRegime: simulacao.marital_regime,
        existingProtection: simulacao.existing_protection,
        customDuration,
        monthlyMaintenance: simulacao.monthly_maintenance,
        liquidityGoal,
        suggestedCoverage,
      });
      const fileName = `Diagnostico_Sucessorio_${simulacao.client_name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.pdf`;
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
