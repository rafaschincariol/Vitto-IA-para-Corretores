import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { PolicyFormDialog } from "./policy-form-dialog";
import { PoliciesTable } from "./policies-table";
import type { PolicyWithClient } from "@/lib/types";

export default async function PoliciesPage() {
  const supabase = await createSupabaseClient();

  const [{ data: policies }, { data: clients }] = await Promise.all([
    supabase
      .from("policies")
      .select("*, client:clients(id, name)")
      .order("end_date")
      .returns<PolicyWithClient[]>(),
    supabase.from("clients").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apólices</h1>
          <p className="text-sm text-muted-foreground">Todas as apólices da sua carteira.</p>
        </div>
        <PolicyFormDialog clients={clients ?? []} />
      </div>

      <PoliciesTable policies={policies ?? []} clients={clients ?? []} />
    </div>
  );
}
