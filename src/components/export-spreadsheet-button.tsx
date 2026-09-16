"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Export genérico client-side: nenhuma tela do app tinha isso antes. Usa a
// mesma lib (xlsx/SheetJS) já usada pra importação em clients/pipeline, só
// que na direção contrária (json_to_sheet + writeFile), sem passar pelo
// servidor — os dados já estão carregados na tela.
export function ExportSpreadsheetButton({
  filename,
  rows,
  label = "Exportar",
}: {
  filename: string;
  rows: Record<string, unknown>[];
  label?: string;
}) {
  async function handleExport() {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
    XLSX.writeFile(workbook, filename);
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="size-4" />
      {label}
    </Button>
  );
}
