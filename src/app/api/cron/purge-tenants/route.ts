import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeTenant } from "@/lib/tenants/delete-tenant";

// Roda diariamente (ver vercel.json) e executa de verdade a exclusão dos
// tenants cuja carência de 30 dias (ver 0013_tenant_deletion_grace_period.sql)
// já venceu. Autenticado pelo CRON_SECRET que a Vercel injeta automaticamente
// no header Authorization em cron jobs configurados — nunca por sessão de
// usuário, então não faz sentido passar por RLS/RPC aqui.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: dueTenants, error } = await admin
    .from("tenants")
    .select("id, name")
    .lte("pending_deletion_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (dueTenants ?? []).map((t) => purgeTenant(t.id))
  );

  const purged = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - purged;

  return NextResponse.json({ checked: dueTenants?.length ?? 0, purged, failed });
}
