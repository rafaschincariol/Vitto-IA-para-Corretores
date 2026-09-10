-- Marca se o corretor já entrou em contato/renovou a apólice, pra
-- alimentar a lista de renovações próximas no Dashboard. Null = ainda não
-- contatado. Sem policy de RLS nova: a policy "policies_all_own_tenant"
-- (0005_team_permissions.sql) já cobre update de qualquer coluna.
alter table public.policies add column renewal_contact_marked_at timestamptz;
