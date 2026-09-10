"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function updateProfileName(
  tenantId: string,
  profileId: string,
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Informe um nome." };

  const supabase = await requirePlatformAdminSession();
  const { error } = await supabase.rpc("admin_update_profile_name", {
    p_profile_id: profileId,
    p_full_name: fullName,
  });
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath(`/admin/tenants/${tenantId}`);
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
