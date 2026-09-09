# Segurança — Corretor SaaS

Resumo do que está implementado, do que foi decidido deixar de fora (e por quê), e
das rotinas para manter isso ao longo do tempo.

## O que já está implementado

- **Isolamento por tenant (RLS)**: todas as tabelas do schema
  (`supabase/migrations/0001` a `0009`) têm `enable row level security` com
  policies explícitas — nunca acesso implícito. Cada tabela nova precisa repetir
  isso (ver rotina abaixo).
- **Chaves de API nunca expostas ao cliente**: `ANTHROPIC_API_KEY`,
  `VOYAGE_API_KEY`, `STRIPE_SECRET_KEY` e `SUPABASE_SERVICE_ROLE_KEY` nunca têm
  prefixo `NEXT_PUBLIC_` — o Next.js só inclui no bundle do navegador variáveis com
  esse prefixo. Só a URL do projeto e a anon key do Supabase são públicas (por
  design — a anon key é protegida por RLS, não por sigilo).
- **`service_role` key restrita a um único arquivo**:
  `src/app/api/webhooks/stripe/route.ts`. É o único ponto do projeto sem sessão de
  usuário (quem chama é o Stripe, autenticado pela assinatura do webhook, não por
  login) — em todo o resto do app, o acesso ao banco é sempre via RLS + sessão real.
- **Nenhum segredo no histórico do git**: `.env*` está no `.gitignore` desde o
  primeiro commit; conferido com `git log --all -p` em todo o histórico.
- **Documentos são imutáveis após o upload**: a policy de `UPDATE` no bucket
  `documents` foi removida (`0009_security_hardening.sql`) — só é possível criar
  (`insert`) ou apagar (`delete`) um documento, nunca sobrescrever o conteúdo de um
  já existente mantendo o mesmo registro.
- **Senhas**: hash e verificação são feitos inteiramente pelo Supabase Auth
  (bcrypt, server-side). O código da aplicação nunca armazena nem loga senha — só
  repassa em texto plano, sobre TLS, pro SDK do Supabase.
- **Rate limit de login por conta**: além do limite padrão (global do projeto) do
  Supabase Auth, o app bloqueia tentativas de um mesmo e-mail após 5 falhas em 15
  minutos (`is_login_rate_limited`/`record_failed_login`, chamadas em
  `src/app/(auth)/actions.ts`).
- **Security headers**: `next.config.ts` aplica HSTS, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e uma
  `Content-Security-Policy` restringindo `connect-src` ao próprio domínio e ao
  Supabase, e bloqueando ser carregado num `<iframe>` de outro site.
- **Dependências**: `npm run audit` (`npm audit --omit=dev`) roda antes de cada
  deploy — 0 vulnerabilidades na última checagem.
- **Monitoramento**: Sentry captura exceções não tratadas em produção (navegador,
  Server Actions, edge) — ver `src/instrumentation*.ts` e `sentry.*.config.ts`.
  Better Stack faz ping em `https://corretor-saas.vercel.app` a cada 3 minutos e
  avisa por e-mail se o site cair.

## O que ficou fora do escopo (decisão registrada, não esquecimento)

- **Criptografia da coluna CPF/CNPJ**: avaliado e descartado por enquanto. Os dados
  já ficam protegidos por RLS (isolados por tenant) e por criptografia em disco do
  Supabase. Criptografar a coluna em nível de aplicação exigiria gestão de chave
  separada e quebraria buscas/filtros por CPF que existam hoje ou no futuro — o
  ganho de proteção adicional não compensa esse custo neste estágio do produto. Se
  o volume de dados ou exigências de compliance mudarem, revisitar.
- **Bot protection (CAPTCHA) em login/cadastro**: pulado por decisão explícita.
  Pode ser adicionado depois (ex: Cloudflare Turnstile) sem mudança estrutural.
- **Dependabot / secret scanning do GitHub**: o repositório já está em
  [github.com/rafaschincariol/Vitto-IA-para-Corretores](https://github.com/rafaschincariol/Vitto-IA-para-Corretores)
  — falta ativar as duas em **Settings → Security** (nenhuma ativada ainda).
- **CSP com nonce (sem `'unsafe-inline'` em `script-src`)**: o Next.js injeta um
  script inline de hidratação em toda página; removê-lo do CSP exigiria gerar um
  nonce por request via middleware — mais invasivo de implementar e testar. Os
  outros headers (HSTS, `frame-ancestors 'none'`, `connect-src` restrito) já cobrem
  os riscos mais sérios (clickjacking, MIME sniffing, exfiltração pra domínio
  externo).

## Rotinas

**Antes de cada deploy:**
```bash
npm run lint && npm run build && npm run audit
```

**Ao adicionar uma tabela nova:**
- Sempre `alter table ... enable row level security` + policies explícitas
  cobrindo select/insert/update/delete conforme o caso — nunca deixar uma tabela
  sem RLS.
- Se a mudança envolver uma função `security definer` ou o uso da `service_role`
  key, justificar por que RLS normal não resolve (ver o padrão em
  `set_tenant_stripe_customer` e no webhook do Stripe) antes de aceitar.

**Periodicamente:**
- Rodar `npm run audit` (ou verificar o aviso de dependências desatualizadas do
  Vercel) pelo menos uma vez por mês.
- Revisar os logs de autenticação no Supabase Dashboard (Authentication → Logs) em
  busca de padrões suspeitos de tentativas de login.
- Revisar se alguma nova variável de ambiente sensível foi adicionada sem o
  prefixo correto (nada sensível deve ter `NEXT_PUBLIC_`).
