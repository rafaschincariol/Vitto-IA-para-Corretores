# Handoff — Vitto IA para Corretores

> Documento gerado para retomar o trabalho em uma nova sessão do Claude Code,
> com acesso ao mesmo repositório. Última atualização: 10 de setembro de 2026.

## 1. Objetivo do projeto

**Vitto** (nome comercial; razão social `R Schincariol Serviços
Administrativos LTDA`, CNPJ 39.837.484/0001-63) é um SaaS multi-tenant B2B
para **corretoras de seguros no Brasil** gerenciarem sua carteira de
clientes e apólices com apoio de IA.

Proposta central: não é "só" um cadastro automático de apólice — é uma
**IA que cuida da carteira inteira** da corretora: CRM de clientes,
painel de vencimentos (30/60/90 dias), cadastro automático de apólice por
IA (upload de PDF/foto), e um assistente de IA que responde perguntas sobre
a carteira (com dados estruturados reais, não só busca em texto) e sobre
condições gerais de seguros (base de conhecimento compartilhada entre
tenants).

Modelo de negócio: assinatura mensal de R$ 49,99 por corretora (não por
usuário), 14 dias de teste grátis, cobrança via Stripe.

Público: corretoras de seguros pequenas/médias no Brasil, tipicamente sem
equipe técnica própria — o produto precisa ser usável sem treinamento.

## 2. Repositório

- GitHub: https://github.com/rafaschincariol/Vitto-IA-para-Corretores
- Branch principal: `main` (única branch existente — sem branches em
  andamento não mergeadas no momento deste handoff)
- Deploy: Vercel, projeto `corretor-saas` sob a conta `rafaschin-4266`,
  domínio de produção `https://iaparacorretores.app.br` (custom domain via
  registro.br, DNS apontando A record pra Vercel + `www` via CNAME)
- Todo commit em `main` **não** dispara deploy automático hoje — não há
  integração Git↔Vercel conectada (`vercel git connect` nunca foi rodado).
  **Deploy é sempre manual**: `npx vercel@59.14.0 --prod --yes` (ver seção
  "Armadilhas" sobre por que a versão é fixada).

## 3. Arquitetura e decisões técnicas

**Stack**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4 +
shadcn/ui, Supabase (Postgres + Auth + Storage + pgvector), Stripe
(assinatura), Anthropic Claude (extração de documento + assistente),
Voyage AI (embeddings), Resend (SMTP transacional), Sentry (erros), Better
Stack (uptime), Vercel Analytics.

**Estrutura de pastas** (`src/app`), por grupo de rotas:
- `(app)/` — dashboard, clients, policies, documents, assistant, billing,
  settings. Layout único (`(app)/layout.tsx`) que **exige** um profile de
  corretora (`requireProfile()`) e bloqueia a tela inteira se a assinatura
  não estiver ativa/em trial (`SubscriptionLockedScreen`).
- `(admin)/admin/` — **novo**, painel de controle da plataforma (não de uma
  corretora). Layout próprio, sem sidebar de corretora, sem checagem de
  assinatura — só confere se o usuário está em `public.platform_admins`.
  Ver seção 4.
- `(auth)/` — login, signup.
- Rotas soltas no topo: `page.tsx` (home/marketing), `terms/`, `privacy/`,
  `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`.

**Por que dois grupos de rotas separados pra "admin"**: o painel
administrativo é um conceito de *plataforma* (Rafael, o dono do produto),
não de *tenant* (uma corretora). Colocar rotas admin dentro de `(app)`
significaria herdar `requireProfile()` — que exige uma linha em
`profiles`/`tenants` — e o bloqueio de assinatura. Um admin da plataforma
não tem (e não deveria precisar ter) uma corretora própria. Isso já tinha
causado um bug real: a página `/admin/global-knowledge` (pré-existente)
vivia dentro de `(app)` e era **inacessível** pro próprio Rafael, porque
ele não tinha profile. Corrigido nesta sessão movendo pra `(admin)`.

**Multi-tenancy e segurança de dados**: Row Level Security (RLS) em toda
tabela sensível, sempre por `tenant_id = auth_tenant_id()`. Nenhum dado de
uma corretora é visível pra outra por padrão — isolamento é feito no banco,
não em lógica de aplicação (decisão deliberada, documentada em
`SECURITY.md`).

**Painel admin não vê dados de cliente final**: a função
`admin_list_tenants()` (SECURITY DEFINER, `supabase/migrations/
0010_platform_admin.sql`) retorna só **contagens agregadas** por tenant
(quantos clientes, apólices, documentos) — nunca as linhas de `clients`/
`policies` em si. Escolha deliberada de minimização de dados (LGPD): o
painel de gestão não precisa, e não deve, conseguir ver CPF/nome de cliente
final de nenhuma corretora.

**`platform_admins`**: tabela simples (`email text primary key`) que
funciona como allowlist de administradores da plataforma. Qualquer usuário
autenticado (via Supabase Auth normal, mesmo `/login` do site) cujo e-mail
esteja nessa tabela ganha acesso a `/admin/*`. Hoje só
`rafael.schincariol@fiduc.com.br` está lá. Gerenciada só via SQL Editor —
não há UI pra adicionar/remover admins.

**IA do assistente (`/assistant`) usa duas fontes**:
1. `getPortfolioSnapshot()` (`src/lib/data/assistant-context.ts`) — dados
   **estruturados e exatos** da carteira do próprio tenant (contagens,
   apólices vencendo em 90 dias, etc.), consultado direto no banco, não por
   busca vetorial. É isso que faz o assistente responder bem perguntas tipo
   "quais apólices vencem em 30 dias".
2. RAG vetorial (pgvector) sobre duas bases: `document_chunks` (privada,
   por tenant — conteúdo de documentos enviados) e `global_chunks`
   (compartilhada entre tenants — condições gerais de seguradoras,
   gerenciada em `/admin/global-knowledge`).
Um classificador (Claude, tool use) decide se a pergunta é "private",
"global" ou "both" antes de buscar.

**Rate limit de login** e **security headers** (CSP, HSTS, etc.) são
próprios do projeto, não vêm de biblioteca — ver `SECURITY.md` pra detalhe
completo e o racional de cada escolha (inclusive o que foi deliberadamente
deixado de fora, como criptografia de coluna de CPF/CNPJ e bot protection).

**Marketing site** (`src/app/page.tsx` e afins): landing page própria (não
gerada por nenhuma ferramenta externa), com prints reais do produto
(`public/marketing/*.png`) capturados de uma conta de demonstração fictícia
("Horizonte Corretora de Seguros") — ver seção 4.

## 4. Estado atual

### Funcionando e testado (verificado nesta sessão, incluindo em produção)

- Produto core (dashboard, clients, policies, documents com extração por
  IA, assistant, billing, settings, convites de equipe) — herdado de fases
  anteriores, não retocado nesta sessão.
- Hardening de segurança completo (RLS, rate limit, headers, storage
  imutável) — `SECURITY.md`.
- Domínio próprio `iaparacorretores.app.br` + `www`, SSL, DNS — no ar.
- Monitoramento: Sentry (erros) e Better Stack (uptime) configurados e
  confirmados funcionando.
- Site de marketing redesenhado: hero com print real do dashboard, seção
  "tour do produto" com prints de Clientes e Assistente, cor de marca
  (azul-índigo, `oklch(0.45 0.16 259)`) propagada pro app inteiro (era
  100% preto/cinza antes), copy reposicionada pra "IA que gerencia a
  carteira" em vez de "cadastro automático".
- Gênero gramatical do nome "Vitto" corrigido pra masculino em todo o site
  e documentos legais (era tratado como feminino, "a Vitto").
- **Painel administrativo novo** (`/admin`): KPIs (corretoras, assinaturas
  ativas, MRR estimado, em trial) + tabela de assinantes com status,
  trial/renovação, contagens de uso, link direto pro Stripe quando há
  `stripe_customer_id`. Testado ao vivo logado como
  `rafael.schincariol@fiduc.com.br` (conta criada nesta sessão — ver seção
  6) contra os 3 tenants reais existentes no banco.
- **Aceite de termos no cadastro**: checkbox obrigatório, bloqueado no
  cliente (`required`) e no servidor (`src/app/(auth)/actions.ts`), grava
  `profiles.terms_accepted_at`. Testado ponta a ponta.
- **LGPD no conteúdo público**: CNPJ removido do rodapé fixo (continua
  presente em Termos de Uso e Política de Privacidade, que é o lugar
  exigido legalmente); fornecedores técnicos (Supabase/Vercel/Anthropic/
  Voyage AI) generalizados em categorias na Política de Privacidade em vez
  de nomeados um a um; Stripe continua nomeado (marca reconhecida de
  pagamento seguro); texto de isolamento de dados por corretora reforçado.
- SEO: `canonical` no layout raiz, JSON-LD (`SoftwareApplication`) na home,
  sitemap/robots já cobriam o essencial antes desta sessão.
- Base de conhecimento global do assistente (`global_chunks`) — estava
  **vazia** em produção (qualquer pergunta "geral" retornava "não
  encontrei"). Foi populada por um sub-agente durante esta sessão com
  conteúdo genérico de seguros (residencial, auto, vida, empresarial) — 4
  fontes, confirmado visível em `/admin/global-knowledge`. Vale conferir a
  qualidade/abrangência desse conteúdo numa próxima sessão.

### Pela metade / não testado a fundo

- Painel admin é uma tela única (overview + tabela). Não há paginação,
  filtro ou busca — hoje são só 3 tenants, então não dói ainda, mas não vai
  escalar bem além de algumas dezenas.
- "Pagamentos" no painel admin é só um link externo pro Stripe (decisão
  deliberada — ver seção 3 do plano desta sessão), não um histórico de
  fatura embutido.
- Não existe fluxo de "esqueci minha senha" / reset de senha em lugar
  nenhum do produto (nem pra corretora, nem pro admin). Se você trocar a
  senha do Rafael ou de alguma corretora manualmente, é sempre via Admin
  API do Supabase, não pela UI.

## 5. Pendências e próximos passos

**Urgente — bloqueador de negócio ainda em aberto:**
- **Verificação de domínio no Resend está travada em "pending" (DKIM) há
  mais de 24h**, apesar do registro DNS estar 100% correto (conferido
  várias vezes por consulta direta ao nameserver autoritativo). Isso
  impede o uso do remetente `contato@iaparacorretores.app.br` — hoje o
  projeto usa o sandbox `onboarding@resend.dev`.
- **Por causa disso, "Confirm email" foi DESATIVADO no Supabase Auth**
  nesta sessão (Authentication → Sign In / Providers → User Signups),
  porque com ele ativado **todo cadastro novo falhava com erro 500**
  ("Error sending confirmation email") — o sandbox do Resend só entrega
  pro e-mail da própria conta Resend, não pra e-mail arbitrário de
  corretor. Ou seja: **hoje qualquer e-mail entra sem confirmação**, o que
  reduz a proteção contra e-mail inválido/typo. Assim que o domínio
  verificar no Resend (ou vocês trocarem de provedor de e-mail
  transacional), **reative "Confirm email"** e troque o remetente do
  Supabase Auth SMTP pro domínio próprio.
- Considerar abrir chamado de suporte com o Resend se a verificação
  continuar travada — o problema não está do lado do DNS.

**Bloqueador conhecido, fora do meu controle:**
- Verificação de identidade no Stripe (KYC) do Rafael continua pendente —
  é o único bloqueador pra ativar pagamentos reais em modo live. Só ele
  pode completar isso no dashboard do Stripe.

**Outros próximos passos sugeridos:**
- Teste ponta a ponta com cobrança real (cartão de verdade) assim que o
  Stripe liberar.
- Decidir canal de suporte além do e-mail (`contato@iaparacorretores.app.br`).
- Avaliar upgrade de plano Supabase/Vercel (hoje ambos free) antes de
  divulgar pra muitos corretores.
- Soft launch com 2-3 corretores reais antes de divulgação ampla.
- Revisar o conteúdo da base global de conhecimento populada nesta sessão
  (qualidade, cobertura de seguradoras/tipos de seguro).
- Considerar paginação/filtro no painel admin se o número de corretoras
  crescer.
- Considerar fluxo de reset de senha (hoje inexistente).

## 6. Configuração e ambiente

**Variáveis de ambiente** (ver `.env.example` no repo pra lista completa
com comentários) — nenhum valor aqui, só o que cada uma é:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase,
  projeto `rdprggooznevjxbqnviy`.
- `SUPABASE_SERVICE_ROLE_KEY` — usada **só** pelo webhook do Stripe
  (`src/app/api/webhooks/stripe/route.ts`). Não usar em mais nenhum lugar.
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` — extração de documento e
  assistente.
- `VOYAGE_API_KEY`, `VOYAGE_MODEL` — embeddings do RAG.
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` —
  cobrança.
- `NEXT_PUBLIC_SENTRY_DSN` — não é segredo, mas necessária pro erro ser
  reportado.
- `NEXT_PUBLIC_SITE_URL` — configurada só no Vercel (produção), não está
  no `.env.example`; usada por `src/lib/site-config.ts` pra montar URLs
  absolutas (sitemap, OG, etc.).

**Serviços externos envolvidos**: Supabase, Vercel, Stripe, Anthropic,
Voyage AI, Resend, Sentry, Better Stack, GitHub, registro.br (DNS).

**Rodar localmente**:
```bash
npm install
cp .env.example .env.local   # preencher com valores reais
npm run dev
```
Depois de qualquer mudança em `supabase/migrations/*.sql`, aplicar no
Supabase (não há CLI de migration configurado neste projeto — o fluxo
usado o tempo todo foi colar o SQL manualmente no SQL Editor do dashboard
do Supabase e rodar).

**Deploy**: `npx vercel@59.14.0 --prod --yes` a partir da raiz do projeto
(ver "Armadilhas" sobre a versão fixada). Sempre depois de `npm run lint`
e `npm run build` limpos localmente.

## 7. Armadilhas

- **`npx vercel` sem versão fixada pode instalar uma CLI nova sem
  credenciais salvas** e travar num fluxo de login OAuth que nunca
  termina (aconteceu nesta sessão). Sempre use `npx vercel@59.14.0` (a
  versão com credenciais já salvas nesta máquina) — se travar mesmo assim,
  provavelmente instalou outra versão; mate o processo e refaça pinado.
- **Editor SQL do Supabase (Monaco) corrompe texto digitado via simulação
  de teclado** — o autocomplete intercepta caracteres/Enter no meio da
  digitação (ex: "por conta" virou "por confirmed_at" numa sessão
  anterior). **Sempre cole via clipboard** (PowerShell `Set-Clipboard`) em
  vez de simular digitação, pra qualquer SQL não-trivial.
- **Funções PL/pgSQL com `returns table (coluna_x ...)` colidem com
  colunas de mesmo nome usadas sem qualificação dentro do corpo da
  função** — erro `column reference "x" is ambiguous`. Aconteceu com
  `tenant_id` e `status` em `admin_list_tenants()` nesta sessão. Sempre
  qualifique explicitamente (`nome_da_tabela.coluna`) dentro de funções
  cujo `returns table` reusa nomes de coluna reais.
- **Criar um usuário via Supabase Admin API dispara o trigger
  `handle_new_user()` normalmente** — se o e-mail for de um admin da
  plataforma, isso cria um tenant/corretora vazio indesejado pra ele (já
  corrigido: o trigger agora pula a criação de tenant/profile pra e-mails
  em `platform_admins` — ver `0010_platform_admin.sql`). Se precisar criar
  outro admin no futuro, isso já está coberto, mas vale lembrar do porquê.
- **`onboarding@resend.dev` (sandbox do Resend) só entrega e-mail pra o
  próprio e-mail da conta Resend**, não pra destinatário arbitrário — é
  fácil confundir isso com "SMTP quebrado" quando na verdade é uma
  limitação do modo sandbox. Só resolve com domínio próprio verificado.
- **Abas do Claude-in-Chrome/Browser pane ficam instáveis depois de
  navegações repetidas** (screenshot trava, clique não registra). Nunca
  vale a pena tentar consertar a aba — abrir uma aba nova resolve quase
  sempre.
- **`next/image` com `width`/`height` fixos + import de `public/` precisa
  de path string (`/marketing/x.png`), não import estático** — import
  estático é padrão pra imagens dentro de `src/`, não `public/`.
- Sempre rodar `rm -rf .next` antes de `npm run build` depois de **mover
  arquivo de rota entre grupos de rotas** (`(app)` → `(admin)`, etc.) — o
  cache de tipos do Next (`​.next/dev/types/validator.ts`) referencia o
  caminho antigo e quebra o build com um erro de módulo não encontrado que
  nada tem a ver com o código em si.
