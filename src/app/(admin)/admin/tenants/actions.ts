"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleTenantDeletion } from "@/lib/tenants/delete-tenant";

async function requirePlatformAdminSession() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("not authorized");

  const { data: isAdmin } = await supabase
    .from("platform_admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();
  if (!isAdmin) throw new Error("not authorized");

  return supabase;
}

export type AdminActionState = { error: string | null };

export async function updateTenantName(
  tenantId: string,
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };

  const supabase = await requirePlatformAdminSession();
  const { error } = await supabase.rpc("admin_update_tenant_name", {
    p_tenant_id: tenantId,
    p_name: name,
  });
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin");
  return { error: null };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Atualiza nome e e-mail de um membro. O e-mail precisa passar pela Admin
// API (service role) porque é o e-mail de LOGIN em auth.users, não um
// campo solto — atualizar só public.profiles.email deixaria o login
// dessincronizado do que aparece na UI. email_confirm:true pula a
// confirmação porque é o admin da plataforma fazendo a correção, não o
// próprio usuário mudando de e-mail sozinho.
export async function updateMemberProfile(
  tenantId: string,
  profileId: string,
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName) return { error: "Informe um nome." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail inválido." };

  const supabase = await requirePlatformAdminSession();

  const { error: nameError } = await supabase.rpc("admin_update_profile_name", {
    p_profile_id: profileId,
    p_full_name: fullName,
  });
  if (nameError) return { error: "Não foi possível salvar o nome." };

  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.updateUserById(profileId, {
    email,
    email_confirm: true,
  });
  if (emailError) {
    return {
      error: emailError.message.includes("already been registered")
        ? "Esse e-mail já está em uso por outra conta."
        : "Não foi possível salvar o e-mail.",
    };
  }
  await admin.from("profiles").update({ email }).eq("id", profileId);

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin");
  return { error: null };
}

// Gera uma senha temporária legível (evita caracteres ambíguos tipo 0/O,
// 1/l/I) e cripto-segura via node:crypto, não Math.random().
function generateTempPassword(length = 14) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type ResetPasswordState = { error: string | null; password: string | null };

// Gera e grava uma senha temporária via Admin API do Supabase (service
// role) — não depende de e-mail, então funciona mesmo com o Resend
// travado. A senha só é retornada uma vez; o admin repassa manualmente
// pro dono da conta (WhatsApp/telefone) e pede pra trocar no próximo login.
export async function resetMemberPassword(
  tenantId: string,
  profileId: string
): Promise<ResetPasswordState> {
  try {
    await requirePlatformAdminSession();
  } catch {
    return { error: "Não autorizado.", password: null };
  }

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password: tempPassword });

  if (error) {
    return { error: "Não foi possível redefinir a senha.", password: null };
  }

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null, password: tempPassword };
}

// Exclusão pelo admin (LGPD art. 18, VI) — mesmo efeito do "encerrar
// conta" do próprio owner em src/app/(app)/settings/actions.ts, pro caso
// do pedido chegar por suporte em vez de self-service. Agenda com 30 dias
// de carência (não apaga na hora) — ver src/lib/tenants/delete-tenant.ts.
// Exige digitar o nome exato da corretora, igual ao self-service.
export async function deleteTenant(
  tenantId: string,
  tenantName: string,
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const confirmName = String(formData.get("confirm_name") ?? "").trim();
  if (confirmName !== tenantName) {
    return { error: "Digite o nome da corretora exatamente como aparece, para confirmar." };
  }

  const supabase = await requirePlatformAdminSession();
  try {
    await scheduleTenantDeletion(supabase, tenantId, "admin_schedule_tenant_deletion");
  } catch {
    return { error: "Não foi possível agendar a exclusão. Tente novamente ou verifique manualmente." };
  }

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin");
  redirect("/admin");
}

// Desfaz o agendamento de exclusão (dentro dos 30 dias) — não reativa a
// assinatura Stripe automaticamente, isso a corretora faz de novo em
// /billing quando quiser voltar a usar.
export async function cancelTenantDeletion(tenantId: string): Promise<AdminActionState> {
  const supabase = await requirePlatformAdminSession();
  const { error } = await supabase.rpc("admin_cancel_tenant_deletion", { p_tenant_id: tenantId });
  if (error) return { error: "Não foi possível cancelar a exclusão." };

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin");
  return { error: null };
}
