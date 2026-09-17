import { describe, it, expect } from "vitest";
import { calculatePrestamista } from "./calculator";
import type { PrestamistaInput } from "./types";

function baseInput(overrides: Partial<PrestamistaInput> = {}): PrestamistaInput {
  return {
    financedAmount: 120_000,
    annualInterestRate: 12,
    termYears: 10,
    amortizationSystem: "sac",
    yearsElapsed: 0,
    ...overrides,
  };
}

describe("calculatePrestamista", () => {
  it("sem anos pagos, saldo devedor hoje é o valor financiado inteiro", () => {
    const result = calculatePrestamista(baseInput());
    expect(result.currentBalance).toBeCloseTo(120_000, 0);
    expect(result.suggestedCoverage).toBeCloseTo(120_000, 0);
  });

  it("capital sugerido cai conforme os anos já pagos aumentam (SAC)", () => {
    const semPagar = calculatePrestamista(baseInput({ yearsElapsed: 0 }));
    const metadeDoPrazo = calculatePrestamista(baseInput({ yearsElapsed: 5 }));
    expect(metadeDoPrazo.suggestedCoverage).toBeLessThan(semPagar.suggestedCoverage);
    expect(metadeDoPrazo.suggestedCoverage).toBeCloseTo(60_000, 0);
  });

  it("financiamento já quitado não sugere nenhuma cobertura", () => {
    const result = calculatePrestamista(baseInput({ yearsElapsed: 10 }));
    expect(result.suggestedCoverage).toBe(0);
    expect(result.timeline.every((p) => p.balance === 0)).toBe(true);
  });

  it("timeline vai de hoje até o fim do prazo restante, saldo sempre decrescente", () => {
    const result = calculatePrestamista(baseInput({ yearsElapsed: 2, termYears: 10 }));
    expect(result.timeline[0].year).toBe(0);
    expect(result.timeline.at(-1)?.balance).toBeCloseTo(0, 0);
    for (let i = 1; i < result.timeline.length; i++) {
      expect(result.timeline[i].balance).toBeLessThanOrEqual(result.timeline[i - 1].balance);
    }
  });

  it("parcela Price é constante; parcela SAC cai mês a mês", () => {
    const result = calculatePrestamista(baseInput());
    expect(result.comparison.price.firstInstallment).toBeCloseTo(result.comparison.price.lastInstallment, 2);
    expect(result.comparison.sac.lastInstallment).toBeLessThan(result.comparison.sac.firstInstallment);
  });

  it("Price paga mais juros totais que SAC pro mesmo financiamento", () => {
    const result = calculatePrestamista(baseInput());
    expect(result.comparison.price.totalInterest).toBeGreaterThan(result.comparison.sac.totalInterest);
  });

  it("parcela atual reflete os anos já pagos (SAC decrescente)", () => {
    const result = calculatePrestamista(baseInput({ yearsElapsed: 5 }));
    expect(result.currentInstallment).toBeLessThan(result.firstInstallment);
  });
});
