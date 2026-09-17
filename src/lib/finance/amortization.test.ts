import { describe, it, expect } from "vitest";
import { pricePmt, remainingBalance, installmentAtMonth } from "./amortization";

describe("remainingBalance", () => {
  it("sem taxa de juros, cai linearmente até o fim do prazo", () => {
    expect(remainingBalance(100_000, 0, 10, "sac", 0)).toBe(100_000);
    expect(remainingBalance(100_000, 0, 10, "price", 5)).toBeCloseTo(50_000, 2);
    expect(remainingBalance(100_000, 0, 10, "price", 10)).toBeCloseTo(0, 2);
  });

  it("SAC amortiza o principal linearmente, mesmo com juros", () => {
    // fixedAmortization = 120_000/120 = 1000/mês
    expect(remainingBalance(120_000, 12, 10, "sac", 1)).toBeCloseTo(108_000, 2);
    expect(remainingBalance(120_000, 12, 10, "sac", 5)).toBeCloseTo(60_000, 2);
    expect(remainingBalance(120_000, 12, 10, "sac", 10)).toBeCloseTo(0, 2);
  });

  it("Price tem amortização crescente — saldo no meio do prazo é maior que o linear", () => {
    const price = remainingBalance(120_000, 12, 10, "price", 5);
    const linear = remainingBalance(120_000, 0, 10, "price", 5);
    expect(price).toBeGreaterThan(linear);
    expect(remainingBalance(120_000, 12, 10, "price", 0)).toBeCloseTo(120_000, 0);
    expect(remainingBalance(120_000, 12, 10, "price", 10)).toBeCloseTo(0, 0);
  });

  it("prazo zerado ou já quitado retorna saldo zero", () => {
    expect(remainingBalance(100_000, 10, 0, "sac", 0)).toBe(0);
    expect(remainingBalance(100_000, 10, 10, "sac", 10)).toBe(0);
    expect(remainingBalance(100_000, 10, 10, "sac", 15)).toBe(0);
  });
});

describe("pricePmt", () => {
  it("com taxa zero, é só o valor dividido pelos meses", () => {
    expect(pricePmt(120_000, 0, 10)).toBeCloseTo(1_000, 2);
  });

  it("parcela Price é constante — mesmo valor em qualquer mês", () => {
    const pmt = pricePmt(120_000, 12, 10);
    expect(installmentAtMonth(120_000, 12, 10, "price", 0)).toBeCloseTo(pmt, 2);
    expect(installmentAtMonth(120_000, 12, 10, "price", 60)).toBeCloseTo(pmt, 2);
  });
});

describe("installmentAtMonth", () => {
  it("parcela SAC cai mês a mês conforme o saldo diminui", () => {
    const first = installmentAtMonth(120_000, 12, 10, "sac", 0);
    const later = installmentAtMonth(120_000, 12, 10, "sac", 60);
    expect(later).toBeLessThan(first);
  });

  it("primeira parcela SAC = amortização fixa + juros sobre o saldo total", () => {
    // amortização fixa = 1000; juros do 1º mês = 120000 * (0.12/12) = 1200
    expect(installmentAtMonth(120_000, 12, 10, "sac", 0)).toBeCloseTo(2_200, 2);
  });
});
