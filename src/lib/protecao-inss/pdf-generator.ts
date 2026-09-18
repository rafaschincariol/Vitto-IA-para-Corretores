import { ReportBuilder, formatEmissionDate } from "@/lib/pdf/report-builder";
import { formatCurrency } from "./calculator";
import { INSS_CEILING_2026 } from "./constants";
import type { InssGapResult } from "./types";

export type InssPdfOptions = {
  clientName: string;
  advisorName: string;
  notes: string | null;
  contributionSalary: number;
  dependentsCount: number;
  familyMonthlyIncome: number;
  dependencyYears: number;
  existingInsurance: number;
};

export function generateInssPDF(result: InssGapResult, options: InssPdfOptions) {
  const exceedsCeiling = options.contributionSalary > result.inssCeiling;

  const report = new ReportBuilder(
    "GAP DE PROTEÇÃO PREVIDENCIÁRIA (INSS)",
    "Diferença entre a renda familiar hoje e a pensão por morte estimada do INSS",
    `Emissão: ${formatEmissionDate()} | Teto do INSS considerado: ${formatCurrency(INSS_CEILING_2026)}`
  );

  report.metaRow(
    [
      { label: "Titular / Família", value: options.clientName },
      { label: "Corretor", value: options.advisorName },
    ],
    `${options.dependentsCount} dependente(s) habilitado(s) — pensão de ${(result.pensionFraction * 100).toFixed(0)}% do benefício. Relatório emitido para subsidiar a indicação de seguro de vida.`
  );

  report.kpiCards([
    { label: "RENDA FAMILIAR HOJE", value: formatCurrency(options.familyMonthlyIncome), note: "Por mês" },
    {
      label: "PENSÃO ESTIMADA DO INSS",
      value: formatCurrency(result.estimatedPension),
      note: `${(result.pensionFraction * 100).toFixed(0)}% do benefício`,
    },
  ]);
  report.kpiCards([
    { label: "GAP MENSAL", value: formatCurrency(result.monthlyGap), note: "O que falta todo mês pra família" },
    {
      label: "CAPITAL DE SEGURO SUGERIDO",
      value: formatCurrency(result.suggestedCoverage),
      note:
        options.existingInsurance > 0
          ? `Já descontado seguro existente de ${formatCurrency(options.existingInsurance)}`
          : `Gap × 12 × ${options.dependencyYears} anos de dependência`,
      highlight: true,
    },
  ]);

  report.sectionTitle("1. Memória de Cálculo da Pensão por Morte");
  const rows: string[][] = [
    ["Salário de contribuição informado", formatCurrency(options.contributionSalary)],
  ];
  if (exceedsCeiling) {
    rows.push(["Capado no teto do INSS", formatCurrency(result.inssCeiling)]);
  }
  rows.push(
    ["Base de cálculo do benefício", formatCurrency(result.benefitBase)],
    [`Fração de pensão (50% + ${options.dependentsCount} × 10%, no máx. 100%)`, `${(result.pensionFraction * 100).toFixed(0)}%`],
    ["Pensão por morte estimada", formatCurrency(result.estimatedPension)]
  );
  report.table(["Item", "Valor"], rows, { boldLastRow: true });

  report.sectionTitle("2. Meta de Capital");
  report.table(
    ["Item", "Valor"],
    [
      ["Renda familiar total hoje (mensal)", formatCurrency(options.familyMonthlyIncome)],
      ["Pensão por morte estimada do INSS (mensal)", formatCurrency(result.estimatedPension)],
      ["Gap mensal", formatCurrency(result.monthlyGap)],
      ["Anos de dependência considerados", `${options.dependencyYears} anos`],
      ["Gap anualizado no período", formatCurrency(result.annualGap * options.dependencyYears)],
      ["Seguro de vida já contratado", formatCurrency(options.existingInsurance)],
      ["CAPITAL DE SEGURO SUGERIDO", formatCurrency(result.suggestedCoverage)],
    ],
    { boldLastRow: true }
  );

  const bullets = [
    "• A pensão por morte do INSS substitui só uma fração da renda familiar — nunca 100%, mesmo com o máximo de dependentes.",
    exceedsCeiling
      ? "• O salário informado está acima do teto do INSS — toda a renda acima do teto fica sem nenhuma cobertura pública."
      : "• Quanto maior o salário de contribuição (até o teto), maior a pensão — mas o teto do INSS limita esse crescimento.",
    "• O capital de um seguro de vida fecha essa diferença de imediato, sem depender de análise ou fila do INSS.",
  ];
  report.calloutBox("PONTOS DE ATENÇÃO", bullets);

  if (options.notes?.trim()) {
    report.notesBox(options.notes);
  }

  return report.finish();
}
