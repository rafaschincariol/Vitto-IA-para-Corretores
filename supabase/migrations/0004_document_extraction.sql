-- Guarda o resultado bruto da extração por IA (fase 2), para não precisar
-- rechamar o modelo se o corretor reabrir a revisão antes de confirmar.
alter table public.documents
  add column extracted_data jsonb;
