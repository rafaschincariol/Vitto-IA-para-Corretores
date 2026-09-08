import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { ClientFormDialog } from "./client-form-dialog";
import { ImportClientsDialog } from "./import-clients-dialog";
import { ClientsTable } from "./clients-table";
import type { Client, Profile } from "@/lib/types";

export default async function ClientsPage() {
  const { profile } = await requireProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createSupabaseClient();

  const [{ data: clients }, { data: teamMembers }] = await Promise.all([
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
    isOwner
      ? supabase.from("profiles").select("id, full_name, email").returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Toda a carteira de clientes da corretora." : "Clientes atribuídos a você."}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportClientsDialog />
          <ClientFormDialog isOwner={isOwner} teamMembers={teamMembers ?? []} />
        </div>
      </div>

      <ClientsTable clients={clients ?? []} isOwner={isOwner} teamMembers={teamMembers ?? []} />
    </div>
  );
}
