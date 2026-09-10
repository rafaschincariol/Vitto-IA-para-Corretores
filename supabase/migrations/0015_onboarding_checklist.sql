-- Checklist de primeiros passos no Dashboard. Dois campos bastam: se já
-- perguntou algo ao assistente (cadastro de apólice já é derivado de
-- policies existir, não precisa de flag própria) e se a corretora dispensou
-- o checklist manualmente.

alter table public.tenants add column onboarding_asked_assistant boolean not null default false;
alter table public.tenants add column onboarding_dismissed boolean not null default false;
