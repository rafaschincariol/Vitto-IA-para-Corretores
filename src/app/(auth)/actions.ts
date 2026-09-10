"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/log-activity";

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
    await logActivity(supabase, {
      category: alreadyRegistered ? "usuario" : "sistema",
      eventType: "signup_failed",
      level: alreadyRegistered ? "aviso" : "erro",
      message: alreadyRegistered
        ? `Tentativa de cadastro com e-mail já existente: ${email}.`
        : `Cadastro falhou para ${email}: ${error.message}`,
      metadata: { email, reason: error.message },
    });
    return { error: alreadyRegistered ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." };
  }

  redirect("/login?confirm=1");
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

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

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
