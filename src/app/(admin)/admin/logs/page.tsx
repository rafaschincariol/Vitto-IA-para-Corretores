import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { listActivityLogForAdmin } from "@/lib/data/admin";
import { ActivityLogList } from "./activity-log-list";

export default async function AdminLogsPage() {
  const supabase = await createSupabaseClient();
  const logs = await listActivityLogForAdmin(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs de atividade</h1>
        <p className="text-sm text-muted-foreground">
          Problemas recentes em linguagem simples — falhas do sistema (IA, pagamento, e-mail) e
          dificuldades que corretores tiveram (cadastro, login). Mostra os 200 eventos mais
          recentes.
        </p>
      </div>

      <ActivityLogList logs={logs} />
    </div>
  );
}
