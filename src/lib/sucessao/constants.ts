import type { MaritalRegime } from "./types";

// Faixas nacionais simplificadas (não por estado) — reflete o teto de 8% da
// reforma do ITCMD (EC 132/2023, regulamentada pela LC 227/2026, que torna a
// progressividade obrigatória em todos os estados). Cada estado ainda define
// sua própria tabela de faixas dentro desse teto; esta é uma aproximação
// deliberada para o MVP — ver seção 8.1/3.2 do plano de simuladores.
export const ITCMD_PROGRESSIVE_BRACKETS = [
  { limit: 100_000, rate: 0.02 },
  { limit: 500_000, rate: 0.04 },
  { limit: 2_000_000, rate: 0.06 },
  { limit: Infinity, rate: 0.08 },
];

export const TAX_RATES = {
  NOTARY_EXTRAJUDICIAL: { min: 2000, max: 8000 },
  REGISTRY_PER_PROPERTY: { min: 1500, max: 5000 },
  ATTORNEY: { min: 0.02, max: 0.08 },
  COURT_JUDICIAL: { min: 0.01, max: 0.02 },
  CERTIDOES: { min: 1500, max: 4500 },
};

export const MAINTENANCE_MONTHS = { LOW: 6, HIGH: 36 };

// Quando o cliente é casado em comunhão (parcial ou universal), metade do
// patrimônio comum do casal já pertence ao cônjuge sobrevivente — não é
// herança, não entra na base do ITCMD (só a meação do falecido transmite).
// Simplificação deliberada: aplicada sobre o total listado, não bem a bem
// (não distingue bem particular de bem comum do casal).
export const MARITAL_REGIME_TAXABLE_FRACTION: Record<MaritalRegime, number> = {
  solteiro: 1,
  comunhao_parcial: 0.5,
  comunhao_universal: 0.5,
  separacao_total: 1,
};
