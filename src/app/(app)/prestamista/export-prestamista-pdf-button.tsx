"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrestamistaSimulacao } from "@/lib/types";

export function ExportPrestamistaPdfButton({
  simulacao,
  advisorName,
}: {
  simulacao: PrestamistaSimulacao;
  advisorName: string;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { generatePrestamistaPDF } = await import("@/lib/prestamista/pdf-generator");
      const doc = generatePrestamistaPDF(simulacao.result, {
        clientName: simulacao.client_name,
        advisorName,
        notes: simulacao.notes,
        financedAmount: simulacao.financed_amount,
        annualInterestRate: simulacao.annual_interest_rate,
        termYears: simulacao.term_years,
        amortizationSystem: simulacao.amortization_system,
        yearsElapsed: simulacao.years_elapsed,
      });
      const fileName = `Seguro_Prestamista_${simulacao.client_name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.pdf`;
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
