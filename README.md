# Corretor SaaS

Plataforma multi-tenant de gestão de carteira para corretores de seguros.
Este repositório cobre **Fase 1 (MVP)**, **Fase 2 (extração por IA)** e o
essencial da **Fase 3**: permissões de equipe, upload em lote com
auto-catalogação (zero digitação) e assistente com RAG de base dupla
(privada + geral). A Fase 4 (WhatsApp) ainda não está implementada — ver
[Roadmap](#roadmap).

## Stack

- **Frontend**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + shadcn/ui (estilo Radix).
- **Backend**: Supabase — Postgres com Row Level Security, Auth (e-mail/senha), Storage e pgvector.
- **IA**: Claude (Anthropic) para leitura de PDFs/imagens e para o assistente; Voyage AI para embeddings do RAG.
- **Gráficos**: Recharts. **Formulários**: react-hook-form + zod.

## 1. Criar o projeto no Supabase

1. Crie uma conta/projeto em [supabase.com](https://supabase.com) (plano Free serve para começar).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key** — vão para o `.env.local` (passo 3).
3. Rode as migrations, **em ordem**, em **SQL Editor** (cole o conteúdo de cada arquivo e clique em Run):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_crm.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_document_extraction.sql`
   - `supabase/migrations/0005_team_permissions.sql`
   - `supabase/migrations/0006_batch_review_feedback.sql`
   - `supabase/migrations/0007_rag.sql`

   (Alternativa via CLI, se preferir: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.)

4. Em **Authentication → URL Configuration**, defina:
   - **Site URL**: `http://localhost:3000` em desenvolvimento (troque para a URL de produção depois do deploy).
   - **Redirect URLs**: adicione `http://localhost:3000/auth/callback` (e, depois do deploy, a URL de produção equivalente).
5. **Base global de conhecimento (opcional)**: para poder usar `/admin/global-knowledge`
   e indexar condições gerais de seguradoras, rode no SQL Editor (troque pelo seu e-mail):
   ```sql
   insert into public.platform_admins (email) values ('voce@suaempresa.com.br');
   ```
   Sem isso, o resto do app funciona normalmente — só esse painel fica bloqueado.

## 2. Rodando localmente

Pré-requisitos: Node.js 20.9+.

```bash
cd corretor-saas
npm install
cp .env.example .env.local
```

Preencha `.env.local`:
- URL e anon key do passo 1.2.
- `ANTHROPIC_API_KEY` (crie em [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)) — sem ela, a extração por IA em `/documents` falha.
- `VOYAGE_API_KEY` (crie em [dashboard.voyageai.com/api-keys](https://dashboard.voyageai.com/api-keys)) — sem ela, o assistente (`/assistant`) não encontra nada nas bases (mas ainda responde usando o snapshot da carteira, que não depende de embeddings).

Nenhuma dessas duas chaves de IA impede o resto do app de funcionar — cada
uma só desativa a funcionalidade correspondente se estiver ausente.

```bash
npm run dev
```

Abra `http://localhost:3000` — deve redirecionar para `/login`. Crie uma conta
em `/signup`: isso cria automaticamente um novo tenant ("corretora") e você
vira o Admin dela.

**Teste de isolamento (RLS)**: crie uma segunda conta (outro e-mail/aba
anônima) e confirme que cada uma só enxerga seus próprios clientes/apólices/documentos.

## 3. Deploy

**Frontend (Vercel)**:
1. Suba este diretório para um repositório Git e importe-o em [vercel.com/new](https://vercel.com/new) (Root Directory = `corretor-saas`, caso o repo tenha outras pastas).
2. Configure as variáveis de ambiente do projeto na Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` (os mesmos valores do `.env.local`).
3. Deploy.

**Depois do primeiro deploy**, volte ao Supabase (**Authentication → URL Configuration**) e:
- Atualize a **Site URL** para a URL de produção da Vercel.
- Adicione `https://<sua-url>.vercel.app/auth/callback` em **Redirect URLs** (mantendo a de `localhost` para seguir desenvolvendo localmente).

**Banco de dados**: já está na nuvem (Supabase) desde o passo 1 — não há infraestrutura adicional para subir nesta fase.

## Estrutura do projeto

```
corretor-saas/
  supabase/migrations/       # schema SQL versionado (extensões, tabelas, RLS)
  src/
    proxy.ts                 # protege rotas autenticadas, redireciona /login <-> /dashboard
    lib/
      supabase/               # clients Supabase (browser, server, proxy)
      data/                    # Data Access Layer (sessão/tenant, KPIs, snapshot p/ o assistente)
      ai/                      # Anthropic (extração, assistente), Voyage (embeddings), chunking
      types.ts                 # tipos das tabelas
    app/
      (auth)/login, (auth)/signup, auth/callback   # autenticação + aceite de convite
      (app)/layout.tsx                              # shell (sidebar, topbar, tema)
      (app)/dashboard                               # KPIs + gráfico de vencimentos
      (app)/clients, (app)/clients/[id]              # CRM (manual, planilha, atribuição de responsável)
      (app)/policies                                 # apólices (visão geral)
      (app)/documents, (app)/documents/review         # upload em lote + auto-catalogação + revisão
      (app)/assistant                                 # chat RAG (base privada + base global)
      (app)/admin/global-knowledge                    # ingestão da base global (platform_admins)
      (app)/settings                                  # nome da corretora + equipe/convites
```

Cada módulo de negócio tem seu próprio `actions.ts`/`*-actions.ts` com Server
Actions validadas por `zod`. A segurança de dados não depende dessas
validações nem do código do app — vem das *policies* de RLS no Postgres
(`supabase/migrations/0003_rls.sql` e `0005_team_permissions.sql`), que
isolam tudo por `tenant_id` (e, para Corretores, por `assigned_to`) direto no
banco.

**Importação de clientes**: `(app)/clients/parse-spreadsheet.ts` lê a
planilha (.xlsx/.xls/.csv) inteiramente no navegador, com `xlsx` (SheetJS)
instalado a partir do pacote oficial deles (`cdn.sheetjs.com`), não do npm —
a versão publicada no registro do npm tem vulnerabilidades conhecidas sem
correção. Não troque para `npm install xlsx` sem checar se isso mudou.

**Documento → cliente + apólice (com IA)**: em `(app)/documents`, cada
documento sem `client_id` mostra um botão "Extrair com IA" — abre um
formulário único (cliente + apólice) pré-preenchido, que o corretor confirma
antes de salvar (`document-review-dialog.tsx`). Se a extração falhar (chave
ausente, documento ilegível), o formulário abre vazio — o fluxo nunca trava.

**Upload em lote "zero digitação"**: ao enviar vários arquivos de uma vez
*sem* estar dentro do perfil de um cliente específico, cada apólice é
processada em segundo plano e o cadastro (cliente + apólice) é criado
**automaticamente**, sem nenhuma tela intermediária — mas marcado
`reviewed = false`. Esses cadastros aparecem em **Documentos → "N cadastro(s)
para revisar"** (`/documents/review`) como cards editáveis; confirmar marca
`reviewed = true`, descartar apaga o cliente/apólice criados (o documento
volta a ficar sem vínculo). Toda correção feita nessa revisão é comparada
com o valor original da IA e registrada em `ai_extraction_feedback` — a
base para calibrar prompts no futuro.

**Permissões de equipe**: Admin (`role = 'owner'`) vê e gerencia toda a
carteira da corretora, inclusive convidar/ver a equipe em
**Configurações → Equipe**. Corretor (`role = 'member'`) só vê clientes com
`assigned_to` apontando para ele — e as apólices/documentos desses clientes.
Convites não usam a Admin API do Supabase (não precisamos da `service_role`
key): o Admin gera um link (`/signup?invite=<token>`), e o cadastro do
convidado entra automaticamente no mesmo tenant (ver `handle_new_user()` em
`0005_team_permissions.sql`).

**Assistente com RAG de base dupla**: em `(app)/assistant`,
`lib/ai/assistant.ts` primeiro classifica a intenção da pergunta (própria
carteira vs. condições gerais vs. as duas), depois busca por similaridade
(`match_document_chunks` / `match_global_chunks`, funções SQL em
`0007_rag.sql`) na base privada do tenant e/ou na base global compartilhada,
monta o contexto (incluindo sempre um snapshot exato da carteira — KPIs e
vencimentos — para perguntas operacionais tipo "o que vence em 30 dias") e
pede ao Claude uma resposta citando as fontes. Cada apólice processada por
IA (extração ou upload em lote) já é indexada automaticamente
(`lib/ai/ingest-chunks.ts`). A base global só é alimentada por quem está em
`platform_admins` (ver passo 5 da configuração do Supabase).

## Roadmap (fora do escopo deste código)

- **Fase 4 — WhatsApp**: integração com a Meta WhatsApp Cloud API oficial
  (mesmo padrão do projeto irmão `whatsapp-bot`) para lembretes automáticos
  de renovação (30/15 dias) e aniversário, recepção de documentos dos
  clientes, e memória de sessão nas conversas.
- **Transcrição de áudio** (WhatsApp): decidido adiar — Claude não transcreve
  áudio nativamente, então isso vai precisar de um serviço à parte (ex.
  OpenAI Whisper) quando a fase 4 for encarada.
