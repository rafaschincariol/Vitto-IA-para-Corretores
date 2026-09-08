import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Tenant } from "@/lib/types";

// Data Access Layer: único ponto que lê a sessão e o profile/tenant do
// usuário autenticado. O proxy (src/proxy.ts) já bloqueia visitantes não
// autenticados nas rotas de (app), mas cada Server Action/página confia
// nesta função, não no proxy, para saber quem é o usuário.
export async function requireProfile(): Promise<{ profile: Profile; tenant: Tenant }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .single<Profile & { tenant: Tenant }>();

  if (error || !profile) {
    redirect("/login");
  }

  const { tenant, ...profileFields } = profile;
  return { profile: profileFields, tenant };
}
