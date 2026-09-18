import { ReportBuilder, formatEmissionDate } from "@/lib/pdf/report-builder";
import { formatCurrency } from "./calculator";
import type { Child, Debt, VidaResult } from "./types";

export type VidaPdfOptions = {
  clientName: string;
  advisorName: string;
  notes: string | null;
  monthlyIncome: number;
  dependencyYears: number;
  debts: Debt[];
  children: Child[];
  currentInvestments: number;
  monthlyContribution: number;
  existingInsurance: number;
  realReturnRate: number;
  finalCosts: number;
};

const AMORTIZATION_LABELS = { linear: "Linear", sac: "SAC", price: "Price" };

export function generateVidaPDF(result: VidaResult, options: VidaPdfOptions) {
  const report = new ReportBuilder(
    "NECESSIDADE DE SEGURO DE VIDA",
    "Método DIME (Dívidas + Renda + Faculdade + Custos finais) e Linha da Vida",
    `Emissão: ${formatEmissionDate()} | Horizonte: ${options.dependencyYears} anos de dependência`
  );

  report.metaRow([
    { label: "Titular / Família", value: options.clientName },
    { label: "Corretor", value: options.advisorName },
  ]);

  report.kpiCards([
    { label: "NECESSIDADE TOTAL (DIME)", value: formatCurrency(result.totalNeed), note: `${options.dependencyYears} anos de renda + dívidas + faculdade + custos finais` },
    {
      label: "CAPITAL DE SEGURO SUGERIDO",
      value: formatCurrency(result.suggestedCoverage),
      note: "Já descontado patrimônio investido e seguro existente",
      highlight: true,
    },
  ]);

  report.sectionTitle("1. Composição da Necessidade (Método DIME)");
  report.table(
    ["Componente", "Valor"],
    [
      ["Dívidas (financiamentos, empréstimos)", formatCurrency(result.totalDebts)],
      [`Renda × ${options.dependencyYears} anos de dependência`, formatCurrency(options.monthlyIncome * 12 * options.dependencyYears)],
      ["Faculdade dos filhos (restante a pagar)", formatCurrency(result.totalCollegeCost)],
      ["Custos finais (funeral, documentação, inventário)", formatCurrency(options.finalCosts)],
      ["NECESSIDADE TOTAL", formatCurrency(result.totalNeed)],
    ],
    { boldLastRow: true }
  );

  report.sectionTitle("2. Patrimônio e Proteção Já Existentes");
  report.table(
    ["Item", "Valor"],
    [
      ["Necessidade total", formatCurrency(result.totalNeed)],
      ["Patrimônio já investido", `− ${formatCurrency(options.currentInvestments)}`],
      ["Seguro de vida já contratado", `− ${formatCurrency(options.existingInsurance)}`],
      ["CAPITAL DE SEGURO SUGERIDO", formatCurrency(result.suggestedCoverage)],
    ],
    { boldLastRow: true }
  );

  if (options.debts.length > 0) {
    report.ensureSpace(50);
    report.sectionTitle("3. Dívidas Consideradas");
    report.table(
      ["Descrição", "Saldo devedor", "Anos até quitar", "Sistema"],
      options.debts.map((debt) => [
        debt.description,
        formatCurrency(debt.balance),
        String(debt.payoffYears),
        AMORTIZATION_LABELS[debt.amortizationType ?? "linear"],
      ])
    );
  }

  if (options.children.length > 0) {
    report.ensureSpace(50);
    report.sectionTitle(`${options.debts.length > 0 ? "4" : "3"}. Filhos Considerados`);
    report.table(
      ["Nome", "Idade atual", "Faculdade (R$/ano)"],
      options.children.map((child) => [child.name, String(child.currentAge), formatCurrency(child.collegeAnnualCost)])
    );
  }

  report.calloutBox("PREMISSAS DA PROJEÇÃO", [
    `• Rentabilidade real assumida sobre os investimentos: ${(options.realReturnRate * 100).toFixed(1)}% ao ano — parâmetro editável, nunca uma promessa de rentabilidade.`,
    "• A necessidade de proteção cai conforme dívidas são quitadas e os filhos crescem; o patrimônio sobe com os aportes e o rendimento.",
    "• O capital sugerido cobre a distância entre essas duas curvas hoje — reveja a simulação periodicamente.",
  ]);

  if (options.notes?.trim()) {
    report.notesBox(options.notes);
  }

  return report.finish();
}
