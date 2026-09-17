import { describe, it, expect } from "vitest";
import { calculateSuccessionCosts } from "./calculator";
import { AssetType, type SimulationInput } from "./types";

function baseInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    assets: [{ id: "1", description: "Imóvel", type: AssetType.REAL_ESTATE, value: 100_000 }],
    maritalRegime: "solteiro",
    existingProtection: 0,
    monthlyMaintenance: 0,
    ...overrides,
  };
}

describe("calculateSuccessionCosts", () => {
  it("sem bens, ITCMD e custos proporcionais ao patrimônio ficam zerados (custos fixos de documentação permanecem)", () => {
    const result = calculateSuccessionCosts(baseInput({ assets: [] }));
    expect(result.totalAssets).toBe(0);
    expect(result.costs.itcmd.min).toBe(0);
    expect(result.costs.attorney.min).toBe(0);
    expect(result.costs.registry.min).toBe(0);
    // Cartório e certidões têm um piso fixo, mesmo sem bens.
    expect(result.totals.min).toBeGreaterThan(0);
  });

  it("ITCMD respeita exatamente os limites de cada faixa (2%/4%/6%/8%)", () => {
    // Exatamente no limite da primeira faixa: 100.000 * 2% = 2.000
    const atFirstLimit = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 100_000 }] })
    );
    expect(atFirstLimit.costs.itcmd.min).toBeCloseTo(2_000, 2);

    // 500.000 = 100k*2% + 400k*4% = 2.000 + 16.000 = 18.000
    const atSecondLimit = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 500_000 }] })
    );
    expect(atSecondLimit.costs.itcmd.min).toBeCloseTo(18_000, 2);

    // 2.000.000 = 18.000 + 1.500.000*6% = 18.000 + 90.000 = 108.000
    const atThirdLimit = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 2_000_000 }] })
    );
    expect(atThirdLimit.costs.itcmd.min).toBeCloseTo(108_000, 2);

    // Acima do teto: 3.000.000 = 108.000 + 1.000.000*8% = 108.000 + 80.000 = 188.000
    const aboveCeiling = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 3_000_000 }] })
    );
    expect(aboveCeiling.costs.itcmd.min).toBeCloseTo(188_000, 2);
  });

  it("casado em comunhão parcial: só metade do patrimônio entra na base do ITCMD", () => {
    const solteiro = calculateSuccessionCosts(
      baseInput({
        maritalRegime: "solteiro",
        assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 1_000_000 }],
      })
    );
    const casadoComunhaoParcial = calculateSuccessionCosts(
      baseInput({
        maritalRegime: "comunhao_parcial",
        assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 1_000_000 }],
      })
    );

    expect(casadoComunhaoParcial.taxableBase).toBeCloseTo(solteiro.taxableBase / 2, 2);
    expect(casadoComunhaoParcial.costs.itcmd.min).toBeLessThan(solteiro.costs.itcmd.min);
  });

  it("separação total não reduz a base tributável", () => {
    const separacaoTotal = calculateSuccessionCosts(
      baseInput({
        maritalRegime: "separacao_total",
        assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 1_000_000 }],
      })
    );
    expect(separacaoTotal.taxableBase).toBe(1_000_000);
  });

  it("custo de registro de imóveis é proporcional ao número de imóveis, não ao patrimônio total", () => {
    const umImovel = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "Casa", type: AssetType.REAL_ESTATE, value: 500_000 }] })
    );
    const doisImoveis = calculateSuccessionCosts(
      baseInput({
        assets: [
          { id: "1", description: "Casa", type: AssetType.REAL_ESTATE, value: 500_000 },
          { id: "2", description: "Apê", type: AssetType.REAL_ESTATE, value: 300_000 },
        ],
      })
    );
    expect(doisImoveis.costs.registry.min).toBe(umImovel.costs.registry.min * 2);
  });

  it("manutenção usa 6 meses no cenário mínimo e 36 no máximo", () => {
    const result = calculateSuccessionCosts(baseInput({ monthlyMaintenance: 1000 }));
    expect(result.maintenance.low).toBe(6000);
    expect(result.maintenance.high).toBe(36000);
  });

  it("proteção já contratada (seguro/PGBL/VGBL) reduz a meta de liquidez sugerida, sem ficar negativa", () => {
    const semProtecao = calculateSuccessionCosts(
      baseInput({ assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 2_000_000 }] })
    );
    const comProtecaoParcial = calculateSuccessionCosts(
      baseInput({
        assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 2_000_000 }],
        existingProtection: 50_000,
      })
    );
    const comProtecaoTotal = calculateSuccessionCosts(
      baseInput({
        assets: [{ id: "1", description: "a", type: AssetType.OTHER, value: 2_000_000 }],
        existingProtection: 999_999_999,
      })
    );

    expect(comProtecaoParcial.suggestedCoverage.min).toBe(semProtecao.totals.min - 50_000);
    expect(comProtecaoTotal.suggestedCoverage.min).toBe(0);
    expect(comProtecaoTotal.suggestedCoverage.max).toBe(0);
  });
});
