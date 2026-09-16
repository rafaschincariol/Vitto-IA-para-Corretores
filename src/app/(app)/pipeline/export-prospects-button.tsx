"use client";

import { ExportSpreadsheetButton } from "@/components/export-spreadsheet-button";
import type { ProspectWithStage } from "@/lib/types";

export function ExportProspectsButton({ prospects }: { prospects: ProspectWithStage[] }) {
  const rows = prospects.map((p) => ({
    Nome: p.name,
    Etapa: p.stage.name,
    "CPF/CNPJ": p.cpf_cnpj ?? "",
    "E-mail": p.email ?? "",
    Telefone: p.phone ?? "",
    "Valor estimado": p.estimated_value ?? "",
    "Tipo de seguro": p.insurance_type ?? "",
    Notas: p.notes ?? "",
  }));

  return <ExportSpreadsheetButton filename="prospects.xlsx" rows={rows} label="Exportar" />;
}
