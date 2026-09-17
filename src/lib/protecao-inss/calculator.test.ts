import { describe, it, expect } from "vitest";
import { calculateInssGap } from "./calculator";
import { INSS_CEILING_2026 } from "./constants";
import type { InssGapInput } from "./types";

function baseInput(overrides: Partial<InssGapInput> = {}): InssGapInput {
  return {
    contributionSalary: 5000,
    dependentsCount: 2,
    familyMonthlyIncome: 10_000,
    dependencyYears: 15,
    existingInsurance: 0,
    ...overrides,
  };
}

describe("calculateInssGap", () => {
  it("sem dependentes, pensão é 50% do benefício", () => {
    const result = calculateInssGap(baseInput({ dependentsCount: 0, contributionSalary: 4000 }));
    expect(result.pensionFraction).toBe(0.5);
    expect(result.estimatedPension).toBe(2000);
  });

  it("cada dependente soma 10%, até o teto de 100% (5+ dependentes)", () => {
    const doisDependentes = calculateInssGap(baseInput({ dependentsCount: 2, contributionSalary: 4000 }));
    expect(doisDependentes.pensionFraction).toBeCloseTo(0.7, 5);
    expect(doisDependentes.estimatedPension).toBeCloseTo(2800, 2);

    const seteDependentes = calculateInssGap(baseInput({ dependentsCount: 7, contributionSalary: 4000 }));
    expect(seteDependentes.pensionFraction).toBe(1);
    expect(seteDependentes.estimatedPension).toBe(4000);
  });

  it("benefício do segurado é capado no teto do INSS", () => {
    const result = calculateInssGap(baseInput({ contributionSalary: 50_000, dependentsCount: 0 }));
    expect(result.benefitBase).toBe(INSS_CEILING_2026);
    expect(result.estimatedPension).toBeCloseTo(INSS_CEILING_2026 * 0.5, 2);
  });

  it("gap mensal é a diferença entre a renda familiar e a pensão estimada, nunca negativo", () => {
    const comGap = calculateInssGap(baseInput({ familyMonthlyIncome: 10_000, contributionSalary: 5000, dependentsCount: 2 }));
    // pensão = 5000 * 0.7 = 3500; gap = 10000 - 3500 = 6500
    expect(comGap.monthlyGap).toBeCloseTo(6500, 2);
    expect(comGap.annualGap).toBeCloseTo(78_000, 2);

    const semGap = calculateInssGap(baseInput({ familyMonthlyIncome: 1000, contributionSalary: 5000, dependentsCount: 5 }));
    // pensão = 5000 * 1.0 = 5000, maior que a renda familiar informada
    expect(semGap.monthlyGap).toBe(0);
    expect(semGap.suggestedCoverage).toBe(0);
  });

  it("capital sugerido é o gap anual multiplicado pelos anos de dependência", () => {
    const result = calculateInssGap(baseInput({ dependencyYears: 10 }));
    expect(result.suggestedCoverage).toBeCloseTo(result.annualGap * 10, 2);
  });

  it("seguro de vida já contratado reduz o capital sugerido, sem ficar negativo", () => {
    const semProtecao = calculateInssGap(baseInput({ dependencyYears: 10 }));
    const comProtecaoParcial = calculateInssGap(baseInput({ dependencyYears: 10, existingInsurance: 50_000 }));
    const comProtecaoTotal = calculateInssGap(baseInput({ dependencyYears: 10, existingInsurance: 999_999_999 }));

    expect(comProtecaoParcial.suggestedCoverage).toBeCloseTo(semProtecao.suggestedCoverage - 50_000, 2);
    expect(comProtecaoTotal.suggestedCoverage).toBe(0);
  });
});
