"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/log-activity";
import { isMailerRateLimitError } from "@/lib/mailer-error";

export type AuthActionState = { error: string | null };

export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();

  const { data: limited } = await supabase.rpc("is_login_rate_limited", { p_email: email });
  if (limited) {
    await logActivity(supabase, {
      category: "usuario",
      eventType: "login_rate_limited",
      level: "aviso",
      message: `Login bloqueado por excesso de tentativas: ${email}.`,
      metadata: { email },
    });
    return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await supabase.rpc("record_failed_login", { p_email: email });
    await logActivity(supabase, {
      category: "usuario",
      eventType: "login_failed",
      level: "aviso",
      message: `Tentativa de login com senha incorreta: ${email}.`,
      metadata: { email },
    });
    return { error: "E-mail ou senha inválidos." };
  }

  // Administradores da plataforma (public.platform_admins) não têm
  // corretora própria — vão direto pro painel de controle, não pro
  // dashboard de uma corretora.
  const { data: isAdmin } = await supabase
    .from("platform_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  redirect(isAdmin ? "/admin" : "/dashboard");
}

export async function signUpWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const tenantName = String(formData.get("tenant_name") ?? "").trim();
  const inviteToken = String(formData.get("invite_token") ?? "").trim();
  const termsAccepted = formData.get("terms_accepted") === "on";

  // Sem convite, o cadastro cria uma corretora nova e exige o nome dela; com
  // convite, o usuário entra numa corretora já existente (ver
  // handle_new_user() em supabase/migrations/0005_team_permissions.sql).
  if (!email || !password || !fullName || (!inviteToken && !tenantName)) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  // Checagem no servidor, não só no `required` do checkbox — o HTML pode
  // ser burlado, mas o consentimento (LGPD art. 8º) precisa ser real.
  if (!termsAccepted) {
    return { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const termsAcceptedAt = new Date().toISOString();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: inviteToken
        ? { full_name: fullName, invite_token: inviteToken, terms_accepted_at: termsAcceptedAt }
        : { full_name: fullName, tenant_name: tenantName, terms_accepted_at: termsAcceptedAt },
    },
  });

  if (error) {
    const alreadyRegistered = error.message === "User already registered";
    const rateLimited = !alreadyRegistered && isMailerRateLimitError(error.message);
    await logActivity(supabase, {
      category: alreadyRegistered ? "usuario" : "sistema",
      eventType: rateLimited ? "email_rate_limited" : "signup_failed",
      level: alreadyRegistered ? "aviso" : "erro",
      message: alreadyRegistered
        ? `Tentativa de cadastro com e-mail já existente: ${email}.`
        : rateLimited
          ? `Cadastro de ${email} falhou: o limite de envio de e-mails do Resend foi atingido. Novos cadastros e e-mails de recuperação de senha vão falhar até o limite renovar — considere aumentar o plano do Resend.`
          : `Cadastro falhou para ${email}: ${error.message}`,
      metadata: { email, reason: error.message },
    });
    return { error: alreadyRegistered ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." };
  }

  redirect(`/login?confirm=1&email=${encodeURIComponent(email)}`);
}

// Reenvio do e-mail de confirmação — sem isso, quem não recebe (ou não vê
// por causa do spam) ficava travado sem nenhuma saída além de tentar
// cadastrar de novo (e esbarrar no "e-mail já cadastrado"). Mesma
// anti-enumeração do reset de senha: sempre responde sucesso.
export async function resendConfirmationEmail(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    const rateLimited = isMailerRateLimitError(error.message);
    await logActivity(supabase, {
      category: "sistema",
      eventType: rateLimited ? "email_rate_limited" : "resend_confirmation_failed",
      level: "erro",
      message: rateLimited
        ? `Reenvio de confirmação de cadastro pra ${email} falhou: o limite de envio de e-mails do Resend foi atingido. Novos e-mails vão falhar até o limite renovar — considere aumentar o plano do Resend.`
        : `Reenvio de confirmação de cadastro falhou para ${email}: ${error.message}`,
      metadata: { email, reason: error.message },
    });
    return { error: "Não foi possível reenviar agora. Tente de novo em instantes." };
  }

  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Informe seu e-mail." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // O Supabase não revela e-mail inexistente aqui (retorna sucesso mesmo
  // assim, de propósito, pra não permitir enumeração) — então um `error`
  // real é sempre falha de sistema (ex: limite de envio do Resend
  // estourado), seguro de logar sem vazar quem tem conta.
  if (error) {
    const rateLimited = isMailerRateLimitError(error.message);
    await logActivity(supabase, {
      category: "sistema",
      eventType: rateLimited ? "email_rate_limited" : "password_reset_failed",
      level: "erro",
      message: rateLimited
        ? `Pedido de redefinição de senha de ${email} falhou: o limite de envio de e-mails do Resend foi atingido. Novos e-mails vão falhar até o limite renovar — considere aumentar o plano do Resend.`
        : `Pedido de redefinição de senha falhou para ${email}: ${error.message}`,
      metadata: { email, reason: error.message },
    });
  }

  // Sempre redireciona pro mesmo lugar, exista ou não conta com esse e-mail —
  // não dá pra revelar quais e-mails têm cadastro.
  redirect("/login?reset=requested");
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    await logActivity(supabase, {
      category: "usuario",
      eventType: "password_reset_link_invalid",
      level: "aviso",
      message: "Link de redefinição de senha inválido ou expirado.",
    });
    return { error: "Link inválido ou expirado. Solicite um novo em \"Esqueci minha senha\"." };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
