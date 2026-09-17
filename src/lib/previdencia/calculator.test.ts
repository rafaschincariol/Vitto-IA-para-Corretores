import { describe, expect, it } from "vitest";
import { calculatePrevidencia } from "./calculator";
import type { PrevidenciaInput } from "./types";

const baseInput: PrevidenciaInput = {
  monthlyContribution: 1000,
  existingBalance: 0,
  yearsToRetirement: 10,
  annualReturnRate: 6,
  annualTaxableIncome: 120_000,
  filesCompleteDeclaration: true,
  planType: "pgbl",
  taxRegime: "regressivo",
};

describe("calculatePrevidencia", () => {
  it("acumula o saldo com juros compostos mensais sobre os aportes", () => {
    const result = calculatePrevidencia(baseInput);
    const totalContributed = 1000 * 12 * 10;
    expect(result.totalContributed).toBeCloseTo(totalContributed, 2);
    expect(result.futureValue).toBeGreaterThan(totalContributed);
    expect(result.totalGain).toBeCloseTo(result.futureValue - totalContributed, 2);
  });

  it("sem rentabilidade, o saldo futuro é só a soma dos aportes", () => {
    const result = calculatePrevidencia({ ...baseInput, annualReturnRate: 0 });
    expect(result.futureValue).toBeCloseTo(1000 * 12 * 10, 2);
    expect(result.totalGain).toBeCloseTo(0, 2);
  });

  it("PGBL tributa o resgate inteiro; VGBL só os ganhos", () => {
    const result = calculatePrevidencia(baseInput);
    expect(result.comparison.pgbl_regressivo.taxableBase).toBeCloseTo(result.futureValue, 2);
    expect(result.comparison.vgbl_regressivo.taxableBase).toBeCloseTo(result.totalGain, 2);
    expect(result.comparison.vgbl_regressivo.taxableBase).toBeLessThan(result.comparison.pgbl_regressivo.taxableBase);
  });

  it("a alíquota regressiva cai com o horizonte", () => {
    const curto = calculatePrevidencia({ ...baseInput, yearsToRetirement: 1 });
    const longo = calculatePrevidencia({ ...baseInput, yearsToRetirement: 12 });
    expect(curto.comparison.pgbl_regressivo.taxRate).toBeCloseTo(0.35, 5);
    expect(longo.comparison.pgbl_regressivo.taxRate).toBeCloseTo(0.1, 5);
  });

  it("todas as combinações devolvem o mesmo saldo bruto, líquido do imposto de cada uma", () => {
    const result = calculatePrevidencia(baseInput);
    for (const summary of Object.values(result.comparison)) {
      expect(summary.netProceeds).toBeCloseTo(result.futureValue - summary.taxOwed, 2);
    }
  });

  it("PGBL com declaração completa gera dedução limitada a 12% da renda tributável", () => {
    const result = calculatePrevidencia({ ...baseInput, monthlyContribution: 5000, annualTaxableIncome: 100_000 });
    expect(result.pgblDeductibleAnnualContribution).toBeCloseTo(100_000 * 0.12, 2);
    expect(result.pgblAnnualTaxSavings).toBeGreaterThan(0);
  });

  it("sem declaração completa, não há dedução nem economia de IR", () => {
    const result = calculatePrevidencia({ ...baseInput, filesCompleteDeclaration: false });
    expect(result.pgblDeductibleAnnualContribution).toBe(0);
    expect(result.pgblAnnualTaxSavings).toBe(0);
  });

  it("resgate menor que a contribuição total é isento na tabela progressiva", () => {
    const result = calculatePrevidencia({
      ...baseInput,
      monthlyContribution: 50,
      yearsToRetirement: 1,
      annualReturnRate: 0,
      taxRegime: "progressivo",
      planType: "vgbl",
    });
    expect(result.comparison.vgbl_progressivo.taxOwed).toBeCloseTo(0, 2);
  });

  it("selected reflete a combinação de planType/taxRegime escolhida", () => {
    const result = calculatePrevidencia({ ...baseInput, planType: "vgbl", taxRegime: "progressivo" });
    expect(result.selected).toEqual(result.comparison.vgbl_progressivo);
  });
});
