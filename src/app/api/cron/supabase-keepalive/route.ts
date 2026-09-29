import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Projetos gratuitos do Supabase pausam automaticamente depois de ~7 dias
// sem nenhuma requisição à API. Esse cron (ver vercel.json, semanal) só
// existe pra gerar uma query real e manter o projeto ativo — mesmo padrão
// de autenticação do purge-tenants (CRON_SECRET injetado pela Vercel).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").select("id").limit(1);

  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checked_at: new Date().toISOString() });
}
