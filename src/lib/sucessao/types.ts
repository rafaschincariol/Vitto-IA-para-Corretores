export enum AssetType {
  REAL_ESTATE = "Imóvel",
  VEHICLE = "Veículo",
  INVESTMENT = "Investimento",
  OTHER = "Outros Ativos",
}

export type Asset = {
  id: string;
  description: string;
  type: AssetType;
  value: number;
};

export type MaritalRegime = "solteiro" | "comunhao_parcial" | "comunhao_universal" | "separacao_total";

export const MARITAL_REGIME_LABELS: Record<MaritalRegime, string> = {
  solteiro: "Solteiro(a) / viúvo(a)",
  comunhao_parcial: "Casado(a) — comunhão parcial",
  comunhao_universal: "Casado(a) — comunhão universal",
  separacao_total: "Casado(a) — separação total",
};

export type CostRange = {
  min: number;
  max: number;
  label: string;
  description: string;
  longDescription: string;
  impact: "high" | "medium" | "low";
};

export type SimulationInput = {
  assets: Asset[];
  maritalRegime: MaritalRegime;
  existingProtection: number;
  monthlyMaintenance: number;
};

export interface SimulationResult {
  totalAssets: number;
  taxableBase: number;
  costs: {
    itcmd: CostRange;
    notary: CostRange;
    registry: CostRange;
    attorney: CostRange;
    court: CostRange;
  };
  maintenance: {
    monthlyEstimate: number;
    low: number; // 6 meses — cenário amigável
    high: number; // 36 meses — cenário litigioso
  };
  totals: {
    min: number;
    max: number;
  };
  /** Meta de liquidez já descontada da proteção que o cliente já tem (seguro/PGBL/VGBL). Nunca negativo. */
  suggestedCoverage: {
    min: number;
    max: number;
  };
}
