export type Debt = {
  id: string;
  description: string;
  balance: number;
  /** Anos até quitar a dívida — usado pra projetar o saldo devedor decrescente na Linha da Vida. */
  payoffYears: number;
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
