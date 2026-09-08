import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";
import { DocumentDropzone } from "./document-dropzone";
import { DocumentsTable } from "./documents-table";
import type { Client, Document } from "@/lib/types";

export default async function DocumentsPage() {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const [{ data: documents }, { data: clients }, { count: pendingReview }] = await Promise.all([
    supabase.from("documents").select("*").order("created_at", { ascending: false }).returns<Document[]>(),
    supabase.from("clients").select("id, name").returns<Pick<Client, "id" | "name">[]>(),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("reviewed", false),
  ]);

  const clientNames = Object.fromEntries((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Envie várias apólices de uma vez — a IA cadastra cliente e apólice automaticamente, sem digitação.
            Se algum documento não vincular a um cliente, use &ldquo;Extrair com IA&rdquo; na tabela para tentar
            manualmente.
          </p>
        </div>
        {Boolean(pendingReview) && (
          <Button asChild variant="outline">
            <Link href="/documents/review">
              <Sparkles className="size-4" />
              {pendingReview} cadastro(s) para revisar
            </Link>
          </Button>
        )}
      </div>

      <DocumentDropzone tenantId={tenant.id} />
      <DocumentsTable documents={documents ?? []} showClientColumn clientNames={clientNames} />
    </div>
  );
}
