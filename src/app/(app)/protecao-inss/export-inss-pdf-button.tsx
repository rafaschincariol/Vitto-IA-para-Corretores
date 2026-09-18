"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProtecaoInssSimulacao } from "@/lib/types";

export function ExportInssPdfButton({
  simulacao,
  advisorName,
}: {
  simulacao: ProtecaoInssSimulacao;
  advisorName: string;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { generateInssPDF } = await import("@/lib/protecao-inss/pdf-generator");
      const doc = generateInssPDF(simulacao.result, {
        clientName: simulacao.client_name,
        advisorName,
        notes: simulacao.notes,
        contributionSalary: simulacao.contribution_salary,
        dependentsCount: simulacao.dependents_count,
        familyMonthlyIncome: simulacao.family_monthly_income,
        dependencyYears: simulacao.dependency_years,
        existingInsurance: simulacao.existing_insurance,
      });
      const fileName = `Gap_INSS_${simulacao.client_name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.pdf`;
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
