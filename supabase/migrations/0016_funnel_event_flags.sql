-- Flags idempotentes pra instrumentação de funil (auditoria de marketing):
-- disparar cada evento de conversão uma vez só, sem duplicar no
-- dataLayer/GTM. Backfill marca como "já rastreado" o que já era verdade
-- antes desta migração, pra não gerar evento falso de conversão em
-- corretora que já estava ativa.

alter table public.tenants add column first_policy_event_sent boolean not null default false;

alter table public.tenant_subscriptions add column paid_conversion_tracked boolean not null default false;
update public.tenant_subscriptions set paid_conversion_tracked = true where status = 'active';
