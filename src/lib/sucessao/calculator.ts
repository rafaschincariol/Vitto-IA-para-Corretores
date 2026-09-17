import { AssetType, type ItcmdBracketBreakdown, type SimulationInput, type SimulationResult } from "./types";
import { ITCMD_PROGRESSIVE_BRACKETS, TAX_RATES, MAINTENANCE_MONTHS, MARITAL_REGIME_TAXABLE_FRACTION } from "./constants";

function calculateProgressiveITCMD(taxableBase: number): { tax: number; brackets: ItcmdBracketBreakdown[] } {
  let tax = 0;
  let remaining = taxableBase;
  let previousLimit = 0;
  const brackets: ItcmdBracketBreakdown[] = [];

  for (const bracket of ITCMD_PROGRESSIVE_BRACKETS) {
    const rangeSize = bracket.limit - previousLimit;
    const amountInBracket = Math.min(remaining, rangeSize);
    if (amountInBracket <= 0) break;

    const taxInBracket = amountInBracket * bracket.rate;
    tax += taxInBracket;
    brackets.push({ limit: bracket.limit, rate: bracket.rate, amountInBracket, taxInBracket });
    remaining -= amountInBracket;
    previousLimit = bracket.limit;
  }

  return { tax, brackets };
}

// Função pura — sem I/O, sem DOM. Porta a lógica do protótipo do usuário
// (services/calculator.ts) com três correções de domínio: desconta a meação
// do cônjuge da base do ITCMD (regime de bens), desconta proteção já
// contratada (seguro de vida/PGBL/VGBL) da meta de liquidez sugerida, e
// remove o placeholder de "ganho de capital" (era um número decorativo, sem
// custo de aquisição real por bem — vira só um aviso qualitativo na UI).
export function calculateSuccessionCosts(input: SimulationInput): SimulationResult {
  const totalAssets = input.assets.reduce((sum, asset) => sum + asset.value, 0);
  const taxableBase = totalAssets * MARITAL_REGIME_TAXABLE_FRACTION[input.maritalRegime];
  const realEstateCount = input.assets.filter((a) => a.type === AssetType.REAL_ESTATE).length;

  const { tax: itcmdValue, brackets: itcmdBrackets } = calculateProgressiveITCMD(taxableBase);

  const costs: SimulationResult["costs"] = {
    itcmd: {
      label: "ITCMD",
      description: "Imposto sobre Transmissão Causa Mortis.",
      longDescription:
        "Imposto obrigatório calculado de forma progressiva (EC 132/2023, LC 227/2026). A base considera a meação do cônjuge, quando aplicável — só a parte do falecido é transmitida por herança.",
      min: itcmdValue,
      max: itcmdValue,
      impact: "high",
    },
    notary: {
      label: "Cartório / Custas Processuais",
      description: "Emolumentos de cartório ou custas do TJ.",
      longDescription:
        "No cenário amigável (extrajudicial), são as taxas de escritura em cartório. No litigioso (judicial), engloba custas do Tribunal de Justiça, normalmente superiores.",
      min: TAX_RATES.NOTARY_EXTRAJUDICIAL.min,
      max: taxableBase * TAX_RATES.COURT_JUDICIAL.max,
      impact: "medium",
    },
    registry: {
      label: "Registro de Imóveis",
      description: "Atualização da matrícula.",
      longDescription:
        "Custo para transferir a propriedade no Cartório de Registro de Imóveis. Varia por estado e pela quantidade de imóveis na simulação.",
      min: realEstateCount * TAX_RATES.REGISTRY_PER_PROPERTY.min,
      max: realEstateCount * TAX_RATES.REGISTRY_PER_PROPERTY.max,
      impact: "low",
    },
    attorney: {
      label: "Honorários de Advogado",
      description: "Assessoria jurídica obrigatória.",
      longDescription:
        "A lei exige advogado em inventários. O cenário amigável prevê um processo consensual; o litigioso, conflito entre herdeiros ou alta complexidade técnica.",
      min: taxableBase * TAX_RATES.ATTORNEY.min,
      max: taxableBase * TAX_RATES.ATTORNEY.max,
      impact: "high",
    },
    court: {
      label: "Certidões e Documentação",
      description: "Documentação necessária ao processo.",
      longDescription:
        "Certidões de óbito, nascimento, casamento, negativas de débitos federais/estaduais/municipais e matrículas atualizadas dos imóveis.",
      min: TAX_RATES.CERTIDOES.min,
      max: TAX_RATES.CERTIDOES.max,
      impact: "low",
    },
  };

  const maintenance = {
    monthlyEstimate: input.monthlyMaintenance,
    low: input.monthlyMaintenance * MAINTENANCE_MONTHS.LOW,
    high: input.monthlyMaintenance * MAINTENANCE_MONTHS.HIGH,
  };

  const costKeys = ["itcmd", "notary", "registry", "attorney", "court"] as const;
  const totalMin = costKeys.reduce((sum, key) => sum + costs[key].min, 0) + maintenance.low;
  const totalMax = costKeys.reduce((sum, key) => sum + costs[key].max, 0) + maintenance.high;

  return {
    totalAssets,
    taxableBase,
    itcmdBrackets,
    costs,
    maintenance,
    totals: { min: totalMin, max: totalMax },
    suggestedCoverage: {
      min: Math.max(0, totalMin - input.existingProtection),
      max: Math.max(0, totalMax - input.existingProtection),
    },
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
