import { requireProfile } from "@/lib/data/auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { DangerZone } from "./danger-zone";
import { SettingsForm } from "./settings-form";
import { TeamSection } from "./team-section";
import type { Profile, TenantInvite } from "@/lib/types";

export default async function SettingsPage() {
  const { profile, tenant } = await requireProfile();
  const isOwner = profile.role === "owner";

  let members: Profile[] = [];
  let invites: TenantInvite[] = [];

  if (isOwner) {
    const supabase = await createSupabaseClient();
    const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
      supabase
        .from("tenant_invites")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
        .returns<TenantInvite[]>(),
    ]);
    members = memberRows ?? [];
    invites = inviteRows ?? [];
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados da sua corretora.</p>
      </div>

      <SettingsForm tenantName={tenant.name} />

      {isOwner && (
        <TeamSection members={members} invites={invites} currentProfileId={profile.id} />
      )}

      {isOwner && <DangerZone tenantName={tenant.name} />}
    </div>
  );
}
