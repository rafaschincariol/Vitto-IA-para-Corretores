import { installmentAtMonth, remainingBalance } from "@/lib/finance/amortization";
import type { AmortizationSystem } from "@/lib/finance/amortization";
import type { AmortizationSystemSummary, PrestamistaInput, PrestamistaResult, PrestamistaYearPoint } from "./types";

function totalInterestPaid(
  balance: number,
  annualInterestRate: number,
  termYears: number,
  system: AmortizationSystem
): number {
  const numMonths = Math.round(termYears * 12);
  if (numMonths <= 0 || annualInterestRate <= 0) return 0;

  let totalPaid = 0;
  for (let month = 0; month < numMonths; month++) {
    totalPaid += installmentAtMonth(balance, annualInterestRate, termYears, system, month);
  }
  return Math.max(0, totalPaid - balance);
}

function summarizeSystem(
  financedAmount: number,
  annualInterestRate: number,
  termYears: number,
  system: AmortizationSystem
): AmortizationSystemSummary {
  const numMonths = Math.round(termYears * 12);
  return {
    firstInstallment: installmentAtMonth(financedAmount, annualInterestRate, termYears, system, 0),
    lastInstallment: installmentAtMonth(financedAmount, annualInterestRate, termYears, system, Math.max(0, numMonths - 1)),
    totalInterest: totalInterestPaid(financedAmount, annualInterestRate, termYears, system),
  };
}

// Simulador de Seguro Prestamista: quanto de cobertura o cliente precisa pra
// que a família (e o banco) não fiquem com o saldo devedor do financiamento
// em caso de morte ou invalidez. Diferente do seguro de vida "capital fixo",
// a cobertura ideal aqui é decrescente — acompanha a queda do saldo devedor
// (ver timeline).
export function calculatePrestamista(input: PrestamistaInput): PrestamistaResult {
  const { financedAmount, annualInterestRate, termYears, amortizationSystem, yearsElapsed } = input;

  const currentBalance = remainingBalance(
    financedAmount,
    annualInterestRate,
    termYears,
    amortizationSystem,
    yearsElapsed
  );
  const monthsElapsed = Math.round(yearsElapsed * 12);
  const numMonths = Math.round(termYears * 12);

  const firstInstallment = installmentAtMonth(financedAmount, annualInterestRate, termYears, amortizationSystem, 0);
  const currentInstallment = installmentAtMonth(
    financedAmount,
    annualInterestRate,
    termYears,
    amortizationSystem,
    Math.min(monthsElapsed, Math.max(0, numMonths - 1))
  );
  const totalInterest = totalInterestPaid(financedAmount, annualInterestRate, termYears, amortizationSystem);

  const remainingYears = Math.max(0, termYears - yearsElapsed);
  const timeline: PrestamistaYearPoint[] = [];
  for (let year = 0; year <= Math.ceil(remainingYears); year++) {
    timeline.push({
      year,
      balance: remainingBalance(financedAmount, annualInterestRate, termYears, amortizationSystem, yearsElapsed + year),
    });
  }

  return {
    currentBalance,
    suggestedCoverage: currentBalance,
    firstInstallment,
    currentInstallment,
    totalInterest,
    timeline,
    comparison: {
      sac: summarizeSystem(financedAmount, annualInterestRate, termYears, "sac"),
      price: summarizeSystem(financedAmount, annualInterestRate, termYears, "price"),
    },
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
