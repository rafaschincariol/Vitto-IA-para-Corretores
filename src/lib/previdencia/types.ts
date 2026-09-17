export type PlanType = "pgbl" | "vgbl";
export type TaxRegime = "regressivo" | "progressivo";

export type PrevidenciaInput = {
  monthlyContribution: number;
  existingBalance: number;
  yearsToRetirement: number;
  annualReturnRate: number;
  /** Renda bruta tributável anual de hoje — usada pro teto de 12% do PGBL e a economia de IR. */
  annualTaxableIncome: number;
  filesCompleteDeclaration: boolean;
  planType: PlanType;
  taxRegime: TaxRegime;
};

export type PrevidenciaYearPoint = {
  year: number;
  balance: number;
};

export type PlanTaxSummary = {
  taxableBase: number;
  taxRate: number;
  taxOwed: number;
  netProceeds: number;
};

export interface PrevidenciaResult {
  futureValue: number;
  totalContributed: number;
  totalGain: number;
  timeline: PrevidenciaYearPoint[];
  /** Quanto da contribuição anual é dedutível do IR (0 se VGBL ou não faz declaração completa). */
  pgblDeductibleAnnualContribution: number;
  /** Economia de IR na declaração de hoje por causa da dedução do PGBL. */
  pgblAnnualTaxSavings: number;
  selected: PlanTaxSummary;
  comparison: {
    pgbl_regressivo: PlanTaxSummary;
    pgbl_progressivo: PlanTaxSummary;
    vgbl_regressivo: PlanTaxSummary;
    vgbl_progressivo: PlanTaxSummary;
  };
}
