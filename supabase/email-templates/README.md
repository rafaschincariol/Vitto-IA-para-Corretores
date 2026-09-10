# Templates de e-mail transacional

Os únicos e-mails que o Supabase Auth dispara pra esse projeto são
**confirmação de cadastro** (`signUp`) e **redefinição de senha**
(`resetPasswordForEmail`) — convite de equipe é um link copiável, não
e-mail (ver `src/app/(app)/settings/team-actions.ts`), e troca de e-mail
pelo admin usa `email_confirm: true`, sem confirmação por e-mail.

Não existe API/MCP pra publicar esses templates direto no Supabase — eles
ficam guardados aqui como fonte de verdade versionada, mas precisam ser
colados manualmente no painel:

**Supabase Dashboard → Authentication → Email Templates**

| Arquivo | Template no Supabase | Assunto sugerido |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirme seu e-mail para começar a usar o Vitto |
| `reset-password.html` | Reset Password | Redefina sua senha no Vitto |

Para cada um: abra o template correspondente, cole o assunto no campo
"Subject heading" e o conteúdo do `.html` no editor de corpo da mensagem
(o Supabase aceita HTML com variáveis `{{ .ConfirmationURL }}` etc. —
não altere essas variáveis). Salve.

Se o texto ou a cor de marca mudar no futuro, edite os `.html` aqui
primeiro e depois recole no painel, pra manter os dois em sincronia.
