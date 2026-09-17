import { IRPF_ANNUAL_BRACKETS, PGBL_DEDUCTION_CAP_RATE, REGRESSIVE_BRACKETS } from "./constants";
import type { PlanTaxSummary, PrevidenciaInput, PrevidenciaResult, PrevidenciaYearPoint } from "./types";

function futureValue(existingBalance: number, monthlyContribution: number, annualReturnRate: number, years: number) {
  const months = Math.round(years * 12);
  if (months <= 0) return existingBalance;

  const monthlyRate = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;
  if (monthlyRate === 0) return existingBalance + monthlyContribution * months;

  const growth = Math.pow(1 + monthlyRate, months);
  return existingBalance * growth + monthlyContribution * ((growth - 1) / monthlyRate);
}

function regressiveRate(years: number): number {
  return REGRESSIVE_BRACKETS.find((bracket) => years < bracket.maxYears)?.rate ?? REGRESSIVE_BRACKETS.at(-1)!.rate;
}

/** Imposto progressivo anual sobre uma renda, somando faixa a faixa (sem "parcela a deduzir"). */
function annualProgressiveTax(annualIncome: number): number {
  let tax = 0;
  let previousLimit = 0;
  for (const bracket of IRPF_ANNUAL_BRACKETS) {
    if (annualIncome <= previousLimit) break;
    const taxableInBracket = Math.min(annualIncome, bracket.limit) - previousLimit;
    tax += taxableInBracket * bracket.rate;
    previousLimit = bracket.limit;
  }
  return tax;
}

function summarize(taxableBase: number, taxOwed: number, grossProceeds: number): PlanTaxSummary {
  return {
    taxableBase,
    taxRate: taxableBase > 0 ? taxOwed / taxableBase : 0,
    taxOwed,
    netProceeds: grossProceeds - taxOwed,
  };
}

// Simulador de Previdência Privada (PGBL/VGBL): projeta o saldo acumulado e
// compara as 4 combinações de plano × regime de tributação no resgate, pra
// ajudar o corretor a indicar a mais vantajosa pro perfil do cliente.
//
// PGBL: contribuição dedutível do IR (até 12% da renda tributável, só pra
// quem faz declaração completa) — mas todo o resgate (principal + ganhos) é
// tributado. VGBL: contribuição não é dedutível, mas só os ganhos são
// tributados no resgate.
//
// Regressiva: alíquota cai com o tempo (35% a 10%), boa pra horizonte longo.
// Progressiva: tabela do IRPF normal, boa pra quem terá baixa renda tributável
// no ano do resgate. Aqui tratamos o resgate como a única renda do ano —
// simplificação deliberada, já que não coletamos a renda esperada na
// aposentadoria.
export function calculatePrevidencia(input: PrevidenciaInput): PrevidenciaResult {
  const {
    monthlyContribution,
    existingBalance,
    yearsToRetirement,
    annualReturnRate,
    annualTaxableIncome,
    filesCompleteDeclaration,
    planType,
    taxRegime,
  } = input;

  const fv = futureValue(existingBalance, monthlyContribution, annualReturnRate, yearsToRetirement);
  const totalContributed = existingBalance + monthlyContribution * Math.round(yearsToRetirement * 12);
  const totalGain = Math.max(0, fv - totalContributed);

  const timeline: PrevidenciaYearPoint[] = [];
  for (let year = 0; year <= Math.ceil(yearsToRetirement); year++) {
    timeline.push({
      year,
      balance: futureValue(existingBalance, monthlyContribution, annualReturnRate, Math.min(year, yearsToRetirement)),
    });
  }

  const pgblDeductibleAnnualContribution = filesCompleteDeclaration
    ? Math.min(monthlyContribution * 12, annualTaxableIncome * PGBL_DEDUCTION_CAP_RATE)
    : 0;
  const pgblAnnualTaxSavings =
    annualProgressiveTax(annualTaxableIncome) -
    annualProgressiveTax(Math.max(0, annualTaxableIncome - pgblDeductibleAnnualContribution));

  const regRate = regressiveRate(yearsToRetirement);

  const comparison = {
    pgbl_regressivo: summarize(fv, fv * regRate, fv),
    pgbl_progressivo: summarize(fv, annualProgressiveTax(fv), fv),
    vgbl_regressivo: summarize(totalGain, totalGain * regRate, fv),
    vgbl_progressivo: summarize(totalGain, annualProgressiveTax(totalGain), fv),
  };

  const selectedKey = `${planType}_${taxRegime}` as keyof typeof comparison;

  return {
    futureValue: fv,
    totalContributed,
    totalGain,
    timeline,
    pgblDeductibleAnnualContribution,
    pgblAnnualTaxSavings,
    selected: comparison[selectedKey],
    comparison,
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
