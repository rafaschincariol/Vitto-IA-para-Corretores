export type AmortizationType = "linear" | "sac" | "price";

export type Debt = {
  id: string;
  description: string;
  balance: number;
  /** Anos até quitar a dívida — usado pra projetar o saldo devedor decrescente na Linha da Vida. */
  payoffYears: number;
  /** Taxa de juros anual do financiamento (%) — opcional. Sem ela, a queda do saldo é sempre linear. */
  annualInterestRate?: number;
  /**
   * Sistema de amortização. SAC quita o principal em parcelas fixas (saldo cai mais rápido
   * nos primeiros anos); Price (tabela Price) tem parcela fixa mas amortização crescente
   * (saldo cai mais devagar no início). "linear" é a simplificação padrão — usada sempre
   * que a taxa de juros não é informada, já que a maioria dos clientes não sabe de cabeça
   * a taxa exata do contrato.
   */
  amortizationType?: AmortizationType;
};

export type Child = {
  id: string;
  name: string;
  currentAge: number;
  /** Custo anual de faculdade — 0 se não há plano de faculdade pra esse filho. */
  collegeAnnualCost: number;
};

export type VidaInput = {
  monthlyIncome: number;
  dependencyYears: number;
  debts: Debt[];
  children: Child[];
  currentInvestments: number;
  monthlyContribution: number;
  existingInsurance: number;
  /** Taxa de retorno real anual assumida (ex: 0.04 = 4% ao ano), parâmetro editável. */
  realReturnRate: number;
  finalCosts: number;
};

export type VidaYearPoint = {
  year: number;
  need: number;
  assets: number;
  gap: number;
};

export interface VidaResult {
  totalDebts: number;
  totalCollegeCost: number;
  /** Necessidade total (DIME): dívidas + renda×anos + faculdade restante + custos finais. */
  totalNeed: number;
  /** Necessidade menos patrimônio já investido e seguro já contratado — nunca negativo. */
  suggestedCoverage: number;
  /** Trajetória ano a ano (0 = hoje) até o fim do período de dependência — a "Linha da Vida". */
  timeline: VidaYearPoint[];
}
