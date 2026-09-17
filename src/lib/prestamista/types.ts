import type { AmortizationSystem } from "@/lib/finance/amortization";

export type { AmortizationSystem };

export type PrestamistaInput = {
  financedAmount: number;
  annualInterestRate: number;
  termYears: number;
  amortizationSystem: AmortizationSystem;
  /** Anos já pagos do financiamento — 0 se é uma simulação de um financiamento novo. */
  yearsElapsed: number;
};

export type PrestamistaYearPoint = {
  /** Anos a partir de hoje (0 = hoje), não do início do financiamento. */
  year: number;
  balance: number;
};

export type AmortizationSystemSummary = {
  firstInstallment: number;
  lastInstallment: number;
  totalInterest: number;
};

export interface PrestamistaResult {
  /** Saldo devedor hoje, considerando os anos já pagos. */
  currentBalance: number;
  /** Capital de seguro prestamista sugerido — o saldo devedor de hoje, já que é isso que o seguro precisa cobrir. */
  suggestedCoverage: number;
  firstInstallment: number;
  currentInstallment: number;
  totalInterest: number;
  /** Saldo devedor projetado de hoje até o fim do prazo. */
  timeline: PrestamistaYearPoint[];
  comparison: {
    sac: AmortizationSystemSummary;
    price: AmortizationSystemSummary;
  };
}
