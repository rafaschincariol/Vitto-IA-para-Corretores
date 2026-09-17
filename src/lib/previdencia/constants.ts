// Tabela regressiva do IR sobre previdência privada (PGBL/VGBL) — Lei
// 11.053/2004, art. 1º. Fixa por lei desde a criação do regime, não muda
// anualmente. A alíquota depende do tempo de acumulação de cada aporte; aqui
// aplicamos o horizonte total da simulação a todo o saldo, uma simplificação
// deliberada (um resgate único no fim do prazo, não um resgate parcial
// escalonado por aporte) — ver disclaimer na UI.
export const REGRESSIVE_BRACKETS = [
  { maxYears: 2, rate: 0.35 },
  { maxYears: 4, rate: 0.3 },
  { maxYears: 6, rate: 0.25 },
  { maxYears: 8, rate: 0.2 },
  { maxYears: 10, rate: 0.15 },
  { maxYears: Infinity, rate: 0.1 },
];

// Tabela progressiva anual do IRPF (mensal × 12), vigente desde maio/2023
// (Lei 14.663/2023). Não considera o desconto simplificado nem reajustes
// posteriores à faixa de isenção — aproximação deliberada para o MVP, a
// exemplo da tabela nacional simplificada de ITCMD já usada no simulador de
// Sucessão. Precisa de revisão periódica.
export const IRPF_ANNUAL_BRACKETS = [
  { limit: 2_112.0 * 12, rate: 0 },
  { limit: 2_826.65 * 12, rate: 0.075 },
  { limit: 3_751.05 * 12, rate: 0.15 },
  { limit: 4_664.68 * 12, rate: 0.225 },
  { limit: Infinity, rate: 0.275 },
];

// Teto de dedução das contribuições PGBL da base de cálculo do IR — 12% da
// renda bruta tributável anual, só para quem faz a declaração completa
// (Lei 9.532/1997, art. 11). VGBL nunca é dedutível.
export const PGBL_DEDUCTION_CAP_RATE = 0.12;
