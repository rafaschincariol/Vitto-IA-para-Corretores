import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldAlert, LineChart } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "../client-form-dialog";
import { PolicyFormDialog } from "../../policies/policy-form-dialog";
import { PoliciesTable } from "../../policies/policies-table";
import { DocumentDropzone } from "../../documents/document-dropzone";
import { DocumentsTable } from "../../documents/documents-table";
import type { Client, Document, Profile, PolicyWithClient } from "@/lib/types";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, tenant } = await requireProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single<Client>();

  if (!client) notFound();

  const [{ data: policies }, { data: documents }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("policies")
      .select("*, client:clients(id, name)")
      .eq("client_id", id)
      .order("end_date")
      .returns<PolicyWithClient[]>(),
    supabase
      .from("documents")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<Document[]>(),
    isOwner
      ? supabase.from("profiles").select("id, full_name, email").returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
  ]);

  const clientOption = [{ id: client.id, name: client.name }];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/clients">
            <ArrowLeft className="size-4" />
            Clientes
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[client.cpf_cnpj, client.email, client.phone].filter(Boolean).join(" · ") || "Sem dados de contato"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/vida/nova?client_id=${client.id}`}>
                <LineChart className="size-4" />
                Simular necessidade de seguro de vida
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/sucessao/nova?client_id=${client.id}`}>
                <ShieldCheck className="size-4" />
                Simular sucessão
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/protecao-inss/nova?client_id=${client.id}`}>
                <ShieldAlert className="size-4" />
                Simular gap de proteção
              </Link>
            </Button>
            <ClientFormDialog client={client} isOwner={isOwner} teamMembers={teamMembers ?? []} />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Apólices</h2>
          <PolicyFormDialog clients={clientOption} defaultClientId={client.id} />
        </div>
        <PoliciesTable policies={policies ?? []} clients={clientOption} showClientColumn={false} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Documentos</h2>
        <DocumentDropzone tenantId={tenant.id} clientId={client.id} />
        <DocumentsTable documents={documents ?? []} />
      </section>
    </div>
  );
}
