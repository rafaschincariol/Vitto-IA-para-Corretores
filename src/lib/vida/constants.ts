// Simplificação deliberada pro MVP: assume início da faculdade aos 18 anos e
// duração padrão de 5 anos pra todo filho com plano de faculdade, em vez de
// pedir data de início/duração por filho. Ver seção 8.1 do plano de
// simuladores pelo mesmo tipo de simplificação já aplicada na meação do
// cônjuge no simulador de sucessão.
export const COLLEGE_START_AGE = 18;
export const COLLEGE_DURATION_YEARS = 5;

export const DEFAULT_DEPENDENCY_YEARS = 15;
// Estimativa conservadora de custos finais (funeral, documentação, inventário
// simplificado) — parâmetro editável, nunca fixo.
export const DEFAULT_FINAL_COSTS = 15_000;
// Taxa de retorno real (acima da inflação) conservadora — parâmetro editável,
// nunca uma promessa de rentabilidade.
export const DEFAULT_REAL_RETURN_RATE = 0.04;
