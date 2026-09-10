import "server-only";

// O Supabase Auth manda e-mail (confirmação de cadastro, redefinição de
// senha) via SMTP do Resend. Quando o Resend recusa o envio por limite de
// taxa (hoje 30 e-mails/hora), o GoTrue devolve um erro cujo texto varia,
// mas costuma citar "rate limit"/"429"/"too many" — detectamos isso pra
// logar de um jeito que dê pra entender sem abrir o provedor de e-mail.
export function isMailerRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("rate limit") || m.includes("429") || m.includes("too many");
}
