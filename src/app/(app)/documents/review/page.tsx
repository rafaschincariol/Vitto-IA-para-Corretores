import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./review-card";
import type { Client, Document, Policy } from "@/lib/types";

export default async function DocumentsReviewPage() {
  const supabase = await createSupabaseClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .returns<Client[]>();

  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: policies }, { data: documents }] = await Promise.all([
    clientIds.length
      ? supabase.from("policies").select("*").in("client_id", clientIds).returns<Policy[]>()
      : Promise.resolve({ data: [] as Policy[] }),
    clientIds.length
      ? supabase
          .from("documents")
          .select("*")
          .in("client_id", clientIds)
          .not("extracted_data", "is", null)
          .order("created_at", { ascending: false })
          .returns<Document[]>()
      : Promise.resolve({ data: [] as Document[] }),
  ]);

  const policyByClient = new Map((policies ?? []).map((p) => [p.client_id, p]));
  const documentByClient = new Map<string, Document>();
  for (const doc of documents ?? []) {
    if (doc.client_id && !documentByClient.has(doc.client_id)) documentByClient.set(doc.client_id, doc);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/documents">
            <ArrowLeft className="size-4" />
            Documentos
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Revisar cadastros da IA</h1>
        <p className="text-sm text-muted-foreground">
          Apólices criadas automaticamente pelo upload em lote. Confira os dados e confirme — ou descarte se a
          leitura saiu errada.
        </p>
      </div>

      {(clients ?? []).length === 0 ? (
        <div className="rounded-lg border p-4 text-sm sm:p-5">
          <p className="text-muted-foreground">Nenhum cadastro pendente de revisão.</p>
          <Link href="/assistant" className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Pergunte ao Vitto sobre a sua carteira
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(clients ?? []).map((client) => {
            const doc = documentByClient.get(client.id);
            return (
              <ReviewCard
                key={client.id}
                client={client}
                policy={policyByClient.get(client.id) ?? null}
                documentFilename={doc?.original_filename ?? null}
                storagePath={doc?.storage_path ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
