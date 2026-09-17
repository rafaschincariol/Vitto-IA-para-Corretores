import { COLLEGE_START_AGE, COLLEGE_DURATION_YEARS } from "./constants";
import type { Child, Debt, VidaInput, VidaResult, VidaYearPoint } from "./types";

// Custo de faculdade ainda não pago pra um filho, daqui a `yearsFromNow` anos
// (0 = hoje) — assume início aos COLLEGE_START_AGE e duração fixa de
// COLLEGE_DURATION_YEARS (ver constants.ts).
function remainingCollegeCost(child: Child, yearsFromNow: number): number {
  if (child.collegeAnnualCost <= 0) return 0;
  const ageAtT = child.currentAge + yearsFromNow;
  const collegeEndAge = COLLEGE_START_AGE + COLLEGE_DURATION_YEARS;
  if (ageAtT >= collegeEndAge) return 0;
  const remainingYears = ageAtT >= COLLEGE_START_AGE ? collegeEndAge - ageAtT : COLLEGE_DURATION_YEARS;
  return child.collegeAnnualCost * remainingYears;
}

// Saldo devedor projetado de uma dívida daqui a `yearsFromNow` anos.
//
// Sem taxa de juros informada (ou tipo "linear"): amortização linear — a
// mesma simplificação de sempre, usada porque a maioria dos clientes não
// sabe de cabeça a taxa exata do contrato.
//
// Com taxa informada, dois sistemas reais de amortização brasileiros:
// - SAC: amortização mensal fixa (financiado/meses), saldo cai mais rápido
//   nos primeiros anos.
// - Price (tabela Price): parcela mensal fixa, amortização crescente — o
//   saldo cai mais devagar no início (os primeiros pagamentos são quase só
//   juros), fórmula fechada do valor presente das parcelas restantes.
// Isso muda a forma da Linha da Vida nos primeiros anos: uma dívida Price
// deixa a família mais desprotegida do que a linha linear sugere, e uma SAC
// menos.
function remainingDebtBalance(debt: Debt, yearsFromNow: number): number {
  if (debt.payoffYears <= 0) return 0;
  if (yearsFromNow >= debt.payoffYears) return 0;

  const rate = debt.annualInterestRate ?? 0;
  if (rate <= 0 || !debt.amortizationType || debt.amortizationType === "linear") {
    const fractionPaid = Math.min(1, yearsFromNow / debt.payoffYears);
    return debt.balance * (1 - fractionPaid);
  }

  const monthlyRate = rate / 100 / 12;
  const numMonths = Math.round(debt.payoffYears * 12);
  const monthsElapsed = Math.round(yearsFromNow * 12);

  if (debt.amortizationType === "sac") {
    const fixedAmortization = debt.balance / numMonths;
    return Math.max(0, debt.balance - fixedAmortization * monthsElapsed);
  }

  // Price: PMT fixo, saldo remanescente = valor presente das parcelas que faltam.
  const remainingMonths = numMonths - monthsElapsed;
  const pmt =
    (debt.balance * monthlyRate * Math.pow(1 + monthlyRate, numMonths)) /
    (Math.pow(1 + monthlyRate, numMonths) - 1);
  return Math.max(0, (pmt * (1 - Math.pow(1 + monthlyRate, -remainingMonths))) / monthlyRate);
}

export function calculateVidaNeed(input: VidaInput): VidaResult {
  const totalDebts = input.debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
  const totalCollegeCost = input.children.reduce((sum, c) => sum + remainingCollegeCost(c, 0), 0);

  const totalNeed =
    totalDebts +
    input.monthlyIncome * 12 * input.dependencyYears +
    totalCollegeCost +
    input.finalCosts;

  const suggestedCoverage = Math.max(0, totalNeed - input.currentInvestments - input.existingInsurance);

  const timeline: VidaYearPoint[] = [];
  let assets = input.currentInvestments;
  for (let year = 0; year <= input.dependencyYears; year++) {
    if (year > 0) {
      assets = assets * (1 + input.realReturnRate) + input.monthlyContribution * 12;
    }

    const debtsAtYear = input.debts.reduce((sum, d) => sum + remainingDebtBalance(d, year), 0);
    const collegeAtYear = input.children.reduce((sum, c) => sum + remainingCollegeCost(c, year), 0);
    const incomeNeedAtYear = input.monthlyIncome * 12 * (input.dependencyYears - year);
    const need = debtsAtYear + incomeNeedAtYear + collegeAtYear + input.finalCosts;
    const gap = Math.max(0, need - assets - input.existingInsurance);

    timeline.push({ year, need, assets, gap });
  }

  return { totalDebts, totalCollegeCost, totalNeed, suggestedCoverage, timeline };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
