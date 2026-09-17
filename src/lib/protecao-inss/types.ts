export type InssGapInput = {
  contributionSalary: number;
  dependentsCount: number;
  familyMonthlyIncome: number;
  dependencyYears: number;
  existingInsurance: number;
};

export interface InssGapResult {
  inssCeiling: number;
  benefitBase: number;
  /** Fração do benefício paga como pensão por morte (0 a 1). */
  pensionFraction: number;
  estimatedPension: number;
  monthlyGap: number;
  annualGap: number;
  /** Meta de capital pra cobrir o gap mensal pelos anos de dependência informados, já descontado o seguro de vida já contratado. Nunca negativo. */
  suggestedCoverage: number;
}
