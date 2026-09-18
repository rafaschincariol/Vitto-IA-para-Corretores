import { ReportBuilder, formatEmissionDate } from "@/lib/pdf/report-builder";
import { formatCurrency } from "./calculator";
import type { AmortizationSystem, PrestamistaResult } from "./types";

export type PrestamistaPdfOptions = {
  clientName: string;
  advisorName: string;
  notes: string | null;
  financedAmount: number;
  annualInterestRate: number;
  termYears: number;
  amortizationSystem: AmortizationSystem;
  yearsElapsed: number;
};

const SYSTEM_LABELS: Record<AmortizationSystem, string> = { sac: "SAC", price: "Price" };

export function generatePrestamistaPDF(result: PrestamistaResult, options: PrestamistaPdfOptions) {
  const report = new ReportBuilder(
    "SEGURO PRESTAMISTA",
    "Capital de cobertura pra quitar o saldo devedor de um financiamento imobiliário",
    `Emissão: ${formatEmissionDate()} | Sistema: ${SYSTEM_LABELS[options.amortizationSystem]} | Prazo: ${options.termYears} anos`
  );

  report.metaRow([
    { label: "Titular", value: options.clientName },
    { label: "Corretor", value: options.advisorName },
  ]);

  report.kpiCards([
    {
      label: "SALDO DEVEDOR HOJE",
      value: formatCurrency(result.currentBalance),
      note: options.yearsElapsed > 0 ? `${options.yearsElapsed} ano(s) já pagos` : "Financiamento novo",
    },
    {
      label: "CAPITAL DE SEGURO SUGERIDO",
      value: formatCurrency(result.suggestedCoverage),
      note: "Cobertura decrescente — acompanha a queda do saldo devedor",
      highlight: true,
    },
  ]);

  report.sectionTitle("1. Dados do Financiamento");
  report.table(
    ["Item", "Valor"],
    [
      ["Valor financiado", formatCurrency(options.financedAmount)],
      ["Taxa de juros anual", `${options.annualInterestRate.toFixed(2)}%`],
      ["Prazo total", `${options.termYears} anos`],
      ["Sistema de amortização", SYSTEM_LABELS[options.amortizationSystem]],
      ["Anos já pagos", `${options.yearsElapsed}`],
      ["Parcela atual", formatCurrency(result.currentInstallment)],
      ["Total de juros no financiamento", formatCurrency(result.totalInterest)],
    ]
  );

  report.sectionTitle("2. SAC × Price — Comparativo");
  report.table(
    ["", "SAC", "Price"],
    [
      ["1ª parcela", formatCurrency(result.comparison.sac.firstInstallment), formatCurrency(result.comparison.price.firstInstallment)],
      ["Última parcela", formatCurrency(result.comparison.sac.lastInstallment), formatCurrency(result.comparison.price.lastInstallment)],
      ["Total de juros no financiamento", formatCurrency(result.comparison.sac.totalInterest), formatCurrency(result.comparison.price.totalInterest)],
    ]
  );

  report.sectionTitle("3. Saldo Devedor Projetado");
  report.table(
    ["Ano", "Saldo devedor"],
    result.timeline.map((point) => [point.year === 0 ? "Hoje" : `Ano ${point.year}`, formatCurrency(point.balance)])
  );

  report.calloutBox("PONTOS DE ATENÇÃO", [
    "• A cobertura ideal do seguro prestamista é decrescente — diferente de um seguro de vida com capital fixo, ela acompanha a queda do saldo devedor.",
    "• Financiamentos Price mantêm o saldo devedor mais alto por mais tempo — mais motivo pra manter o prestamista em dia enquanto o financiamento é recente.",
    "• Estimativa educativa a partir da taxa e do sistema informados — não substitui o extrato oficial do financiamento.",
  ]);

  if (options.notes?.trim()) {
    report.notesBox(options.notes);
  }

  return report.finish();
}
