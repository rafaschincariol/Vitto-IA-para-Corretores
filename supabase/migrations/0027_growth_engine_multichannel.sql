-- Generaliza o motor de aquisição pra suportar mais de um canal de envio
-- (e-mail via Resend, WhatsApp via Meta Cloud API) sobre a mesma fila de
-- aprovação — 0026 foi desenhada só com e-mail em mente. Nenhum dado de
-- produção existe ainda em growth_outreach_drafts/events/suppressions
-- (envio real ainda não foi implementado), então isso entra como parte do
-- schema, não como retrofit sobre dado real.

alter table public.growth_outreach_drafts
  add column channel text not null default 'email' check (channel in ('email', 'whatsapp'));
alter table public.growth_outreach_drafts alter column subject drop not null;
alter table public.growth_outreach_drafts rename column resend_message_id to provider_message_id;

alter table public.growth_outreach_events drop constraint growth_outreach_events_event_type_check;
alter table public.growth_outreach_events add constraint growth_outreach_events_event_type_check
  check (event_type in ('sent', 'delivered', 'opened', 'read', 'clicked', 'bounced', 'failed', 'complained', 'replied'));

-- Supressão passa a ser por (canal, contato) — e-mail e telefone são
-- namespaces diferentes; um lead pode dar opt-out de um canal só.
alter table public.growth_suppressions rename column email to contact;
alter table public.growth_suppressions drop constraint growth_suppressions_pkey;
alter table public.growth_suppressions add column channel text not null default 'email' check (channel in ('email', 'whatsapp'));
alter table public.growth_suppressions add primary key (channel, contact);
