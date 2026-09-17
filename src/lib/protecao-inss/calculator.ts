import {
  INSS_CEILING_2026,
  PENSION_BASE_FRACTION,
  PENSION_PER_DEPENDENT_FRACTION,
  PENSION_MAX_FRACTION,
} from "./constants";
import type { InssGapInput, InssGapResult } from "./types";

export function calculateInssGap(input: InssGapInput): InssGapResult {
  const benefitBase = Math.min(Math.max(input.contributionSalary, 0), INSS_CEILING_2026);
  const pensionFraction = Math.min(
    PENSION_MAX_FRACTION,
    PENSION_BASE_FRACTION + PENSION_PER_DEPENDENT_FRACTION * Math.max(0, input.dependentsCount)
  );
  const estimatedPension = benefitBase * pensionFraction;

  const monthlyGap = Math.max(0, input.familyMonthlyIncome - estimatedPension);
  const annualGap = monthlyGap * 12;
  const suggestedCoverage = annualGap * Math.max(0, input.dependencyYears);

  return {
    inssCeiling: INSS_CEILING_2026,
    benefitBase,
    pensionFraction,
    estimatedPension,
    monthlyGap,
    annualGap,
    suggestedCoverage,
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
