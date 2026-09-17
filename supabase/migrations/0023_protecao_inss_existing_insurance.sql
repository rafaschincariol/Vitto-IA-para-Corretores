-- Corrige uma inconsistência de domínio: os outros dois simuladores
-- (sucessão, vida) descontam o seguro de vida já contratado do capital
-- sugerido; o de gap de proteção previdenciária não fazia isso, inflando o
-- capital sugerido pra quem já tem alguma cobertura.
alter table public.protecao_inss_simulacoes
  add column existing_insurance numeric(12, 2) not null default 0;
