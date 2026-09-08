"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect("/dashboard");
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

  // Sem convite, o cadastro cria uma corretora nova e exige o nome dela; com
  // convite, o usuário entra numa corretora já existente (ver
  // handle_new_user() em supabase/migrations/0005_team_permissions.sql).
  if (!email || !password || !fullName || (!inviteToken && !tenantName)) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: inviteToken
        ? { full_name: fullName, invite_token: inviteToken }
        : { full_name: fullName, tenant_name: tenantName },
    },
  });

  if (error) {
    return { error: error.message === "User already registered" ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." };
  }

  redirect("/login?confirm=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
