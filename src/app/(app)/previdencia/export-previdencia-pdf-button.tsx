"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrevidenciaSimulacao } from "@/lib/types";

export function ExportPrevidenciaPdfButton({
  simulacao,
  advisorName,
}: {
  simulacao: PrevidenciaSimulacao;
  advisorName: string;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { generatePrevidenciaPDF } = await import("@/lib/previdencia/pdf-generator");
      const doc = generatePrevidenciaPDF(simulacao.result, {
        clientName: simulacao.client_name,
        advisorName,
        notes: simulacao.notes,
        monthlyContribution: simulacao.monthly_contribution,
        existingBalance: simulacao.existing_balance,
        yearsToRetirement: simulacao.years_to_retirement,
        annualReturnRate: simulacao.annual_return_rate,
        annualTaxableIncome: simulacao.annual_taxable_income,
        filesCompleteDeclaration: simulacao.files_complete_declaration,
        planType: simulacao.plan_type,
        taxRegime: simulacao.tax_regime,
      });
      const fileName = `Previdencia_${simulacao.client_name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.pdf`;
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
