// Teto do INSS em 2026 (Portaria Interministerial MPS/MF, reajuste anual pelo
// INPC) — precisa ser revisado todo início de ano. Ver seção 9 do plano de
// simuladores.
export const INSS_CEILING_2026 = 8475.55;

// Regra de pensão por morte pós-reforma (Lei 13.846/2019, incorporada à Lei
// 8.213/91): 50% do benefício do segurado + 10% por dependente habilitado,
// até 100% (5 dependentes ou mais).
export const PENSION_BASE_FRACTION = 0.5;
export const PENSION_PER_DEPENDENT_FRACTION = 0.1;
export const PENSION_MAX_FRACTION = 1;

export const DEFAULT_DEPENDENCY_YEARS = 15;
