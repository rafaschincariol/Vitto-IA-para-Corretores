import { ReportBuilder, formatEmissionDate } from "@/lib/pdf/report-builder";
import { formatCurrency } from "./calculator";
import type { PlanType, PrevidenciaResult, TaxRegime } from "./types";

export type PrevidenciaPdfOptions = {
  clientName: string;
  advisorName: string;
  notes: string | null;
  monthlyContribution: number;
  existingBalance: number;
  yearsToRetirement: number;
  annualReturnRate: number;
  annualTaxableIncome: number;
  filesCompleteDeclaration: boolean;
  planType: PlanType;
  taxRegime: TaxRegime;
};

const PLAN_LABELS: Record<PlanType, string> = { pgbl: "PGBL", vgbl: "VGBL" };
const REGIME_LABELS: Record<TaxRegime, string> = { regressivo: "Regressivo", progressivo: "Progressivo" };

export function generatePrevidenciaPDF(result: PrevidenciaResult, options: PrevidenciaPdfOptions) {
  const report = new ReportBuilder(
    "PREVIDÊNCIA PRIVADA (PGBL/VGBL)",
    "Projeção de acumulação e comparação de plano × regime de tributação no resgate",
    `Emissão: ${formatEmissionDate()} | Horizonte: ${options.yearsToRetirement} anos | Plano atual: ${PLAN_LABELS[options.planType]} · ${REGIME_LABELS[options.taxRegime]}`
  );

  report.metaRow([
    { label: "Titular", value: options.clientName },
    { label: "Corretor", value: options.advisorName },
  ]);

  report.kpiCards([
    { label: "SALDO PROJETADO", value: formatCurrency(result.futureValue), note: `${formatCurrency(result.totalGain)} de ganho sobre os aportes` },
    {
      label: "LÍQUIDO NO RESGATE (PLANO ATUAL)",
      value: formatCurrency(result.selected.netProceeds),
      note: `${PLAN_LABELS[options.planType]} · ${REGIME_LABELS[options.taxRegime]}`,
      highlight: true,
    },
  ]);

  report.sectionTitle("1. Dados da Simulação");
  report.table(
    ["Item", "Valor"],
    [
      ["Aporte mensal", formatCurrency(options.monthlyContribution)],
      ["Saldo já acumulado", formatCurrency(options.existingBalance)],
      ["Horizonte até o resgate", `${options.yearsToRetirement} anos`],
      ["Rentabilidade anual esperada", `${options.annualReturnRate.toFixed(2)}%`],
      ["Renda bruta tributável anual", formatCurrency(options.annualTaxableIncome)],
      ["Total aportado no período", formatCurrency(result.totalContributed)],
      ["Saldo projetado", formatCurrency(result.futureValue)],
    ]
  );

  if (options.planType === "pgbl" && result.pgblAnnualTaxSavings > 0) {
    report.sectionTitle("2. Economia de IR na Declaração de Hoje (PGBL)");
    report.table(
      ["Item", "Valor"],
      [
        ["Contribuição anual dedutível (teto de 12% da renda tributável)", formatCurrency(result.pgblDeductibleAnnualContribution)],
        ["Economia de IR na declaração deste ano", formatCurrency(result.pgblAnnualTaxSavings)],
      ]
    );
  } else if (options.planType === "pgbl" && !options.filesCompleteDeclaration) {
    report.paragraph("Sem declaração completa do IRPF, a contribuição ao PGBL não gera dedução de IR.");
  }

  report.sectionTitle(`${options.planType === "pgbl" ? "3" : "2"}. PGBL × VGBL, Regressivo × Progressivo`);
  const combos: { key: keyof PrevidenciaResult["comparison"]; label: string }[] = [
    { key: "pgbl_regressivo", label: "PGBL · Regressivo" },
    { key: "pgbl_progressivo", label: "PGBL · Progressivo" },
    { key: "vgbl_regressivo", label: "VGBL · Regressivo" },
    { key: "vgbl_progressivo", label: "VGBL · Progressivo" },
  ];
  report.table(
    ["Combinação", "Base tributável", "Alíquota", "IR devido", "Líquido no resgate"],
    combos.map(({ key, label }) => {
      const summary = result.comparison[key];
      return [
        label,
        formatCurrency(summary.taxableBase),
        `${(summary.taxRate * 100).toFixed(1)}%`,
        formatCurrency(summary.taxOwed),
        formatCurrency(summary.netProceeds),
      ];
    })
  );

  report.calloutBox("PONTOS DE ATENÇÃO", [
    "• PGBL tributa o resgate inteiro (principal + ganhos), mas a contribuição é dedutível do IR hoje até 12% da renda tributável — só pra quem faz declaração completa.",
    "• VGBL não tem dedução na contribuição, mas só os ganhos são tributados no resgate.",
    "• A tabela regressiva usa o horizonte total da simulação como tempo de acumulação — simplificação pra um resgate único no fim do prazo. A progressiva trata o resgate como a única renda do ano.",
  ]);

  if (options.notes?.trim()) {
    report.notesBox(options.notes);
  }

  return report.finish();
}
