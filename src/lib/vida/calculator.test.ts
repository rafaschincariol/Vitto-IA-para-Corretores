import { describe, it, expect } from "vitest";
import { calculateVidaNeed } from "./calculator";
import type { VidaInput } from "./types";

function baseInput(overrides: Partial<VidaInput> = {}): VidaInput {
  return {
    monthlyIncome: 5000,
    dependencyYears: 10,
    debts: [],
    children: [],
    currentInvestments: 0,
    monthlyContribution: 0,
    existingInsurance: 0,
    realReturnRate: 0.04,
    finalCosts: 15_000,
    ...overrides,
  };
}

describe("calculateVidaNeed", () => {
  it("sem dívidas, filhos ou patrimônio: necessidade é renda × anos + custos finais", () => {
    const result = calculateVidaNeed(baseInput());
    expect(result.totalNeed).toBeCloseTo(5000 * 12 * 10 + 15_000, 2);
    expect(result.suggestedCoverage).toBeCloseTo(result.totalNeed, 2);
  });

  it("dívidas somam direto na necessidade total", () => {
    const result = calculateVidaNeed(
      baseInput({ debts: [{ id: "1", description: "Financiamento", balance: 200_000, payoffYears: 20 }] })
    );
    expect(result.totalDebts).toBe(200_000);
    expect(result.totalNeed).toBeCloseTo(5000 * 12 * 10 + 200_000 + 15_000, 2);
  });

  it("filho sem plano de faculdade não soma custo de faculdade", () => {
    const result = calculateVidaNeed(
      baseInput({ children: [{ id: "1", name: "Ana", currentAge: 5, collegeAnnualCost: 0 }] })
    );
    expect(result.totalCollegeCost).toBe(0);
  });

  it("filho com plano de faculdade que ainda não começou soma os 5 anos completos", () => {
    const result = calculateVidaNeed(
      baseInput({ children: [{ id: "1", name: "Ana", currentAge: 10, collegeAnnualCost: 20_000 }] })
    );
    // 10 anos hoje, faculdade começa aos 18 — ainda não começou, soma os 5 anos inteiros
    expect(result.totalCollegeCost).toBe(100_000);
  });

  it("filho já cursando faculdade soma só os anos restantes", () => {
    const result = calculateVidaNeed(
      baseInput({ children: [{ id: "1", name: "Ana", currentAge: 20, collegeAnnualCost: 20_000 }] })
    );
    // Começou aos 18, tem 20 — já passaram 2 anos dos 5, restam 3
    expect(result.totalCollegeCost).toBe(60_000);
  });

  it("filho que já formou não soma custo de faculdade", () => {
    const result = calculateVidaNeed(
      baseInput({ children: [{ id: "1", name: "Ana", currentAge: 25, collegeAnnualCost: 20_000 }] })
    );
    expect(result.totalCollegeCost).toBe(0);
  });

  it("patrimônio e seguro já existentes reduzem a cobertura sugerida, sem ficar negativa", () => {
    const semProtecao = calculateVidaNeed(baseInput({ monthlyIncome: 10_000, dependencyYears: 5 }));
    const comProtecao = calculateVidaNeed(
      baseInput({ monthlyIncome: 10_000, dependencyYears: 5, currentInvestments: 100_000, existingInsurance: 50_000 })
    );
    expect(comProtecao.suggestedCoverage).toBeCloseTo(semProtecao.totalNeed - 150_000, 2);

    const protecaoTotal = calculateVidaNeed(
      baseInput({ monthlyIncome: 1000, dependencyYears: 1, existingInsurance: 999_999_999 })
    );
    expect(protecaoTotal.suggestedCoverage).toBe(0);
  });

  it("linha da vida: patrimônio cresce por juros compostos + aportes, necessidade cai com o tempo", () => {
    const result = calculateVidaNeed(
      baseInput({
        monthlyIncome: 5000,
        dependencyYears: 5,
        currentInvestments: 10_000,
        monthlyContribution: 500,
        realReturnRate: 0.05,
      })
    );
    expect(result.timeline).toHaveLength(6); // anos 0 a 5

    expect(result.timeline[0].assets).toBe(10_000);
    // ano 1: 10_000 * 1.05 + 500*12 = 10_500 + 6_000 = 16_500
    expect(result.timeline[1].assets).toBeCloseTo(16_500, 2);

    // necessidade cai a cada ano (menos anos de dependência restantes)
    expect(result.timeline[1].need).toBeLessThan(result.timeline[0].need);
    expect(result.timeline[5].need).toBeLessThan(result.timeline[4].need);
  });

  it("gap nunca fica negativo mesmo quando o patrimônio já cobre a necessidade", () => {
    const result = calculateVidaNeed(
      baseInput({ monthlyIncome: 1000, dependencyYears: 3, currentInvestments: 999_999_999 })
    );
    expect(result.timeline.every((point) => point.gap === 0)).toBe(true);
  });

  it("dívida quitada linearmente some do saldo devedor no ano da quitação", () => {
    const result = calculateVidaNeed(
      baseInput({
        monthlyIncome: 0,
        dependencyYears: 4,
        finalCosts: 0,
        debts: [{ id: "1", description: "Empréstimo", balance: 40_000, payoffYears: 4 }],
      })
    );
    // ano 0: saldo cheio; ano 2: metade; ano 4: quitado
    expect(result.timeline[0].need).toBeCloseTo(40_000, 2);
    expect(result.timeline[2].need).toBeCloseTo(20_000, 2);
    expect(result.timeline[4].need).toBeCloseTo(0, 2);
  });

  it("dívida SAC amortiza o principal de forma linear (mesma curva da simplificação linear)", () => {
    const result = calculateVidaNeed(
      baseInput({
        monthlyIncome: 0,
        dependencyYears: 10,
        finalCosts: 0,
        debts: [
          {
            id: "1",
            description: "Financiamento SAC",
            balance: 120_000,
            payoffYears: 10,
            annualInterestRate: 12,
            amortizationType: "sac",
          },
        ],
      })
    );
    // SAC amortiza o principal em parcelas fixas — o saldo devedor cai de forma
    // linear no tempo, igual à simplificação padrão, mesmo com juros informados.
    expect(result.timeline[5].need).toBeCloseTo(60_000, 0);
    expect(result.timeline[10].need).toBeCloseTo(0, 2);
  });

  it("dívida Price deixa a família mais desprotegida no meio do prazo do que a simplificação linear sugere", () => {
    const linear = calculateVidaNeed(
      baseInput({
        monthlyIncome: 0,
        dependencyYears: 10,
        finalCosts: 0,
        debts: [{ id: "1", description: "Financiamento", balance: 120_000, payoffYears: 10 }],
      })
    );
    const price = calculateVidaNeed(
      baseInput({
        monthlyIncome: 0,
        dependencyYears: 10,
        finalCosts: 0,
        debts: [
          {
            id: "1",
            description: "Financiamento Price",
            balance: 120_000,
            payoffYears: 10,
            annualInterestRate: 12,
            amortizationType: "price",
          },
        ],
      })
    );
    // Na tabela Price, os primeiros pagamentos são majoritariamente juros — o
    // saldo devedor real no meio do prazo é maior do que a queda linear supõe.
    expect(price.timeline[5].need).toBeGreaterThan(linear.timeline[5].need);
    expect(price.timeline[0].need).toBeCloseTo(120_000, 0);
    expect(price.timeline[10].need).toBeCloseTo(0, 0);
  });

  it("sem taxa de juros informada, amortização Price/SAC volta pra linear (não sabemos o contrato)", () => {
    const semTaxa = calculateVidaNeed(
      baseInput({
        monthlyIncome: 0,
        dependencyYears: 10,
        finalCosts: 0,
        debts: [{ id: "1", description: "Financiamento", balance: 100_000, payoffYears: 10, amortizationType: "price" }],
      })
    );
    expect(semTaxa.timeline[5].need).toBeCloseTo(50_000, 0);
  });
});
